import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { claims, lostItems, foundItems } from "@/db/schema";
import { eq, and, or } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { verifyProof } from "@/lib/normalize";
import { notify } from "@/lib/notify";

function toNullableUuid(val: unknown): string | null {
  if (typeof val !== "string") return null;
  const trimmed = val.trim();
  return trimmed.length > 0 ? trimmed : null;
}

const submitSchema = z.object({
  itemType:         z.enum(["lost", "found"]).optional(),
  itemId:           z.string().uuid().optional().or(z.literal("")).nullable(),
  lostItemId:       z.string().uuid().optional().or(z.literal("")).nullable(),
  foundItemId:      z.string().uuid().optional().or(z.literal("")).nullable(),
  matchId:          z.string().uuid().optional().or(z.literal("")).nullable(),
  proofDescription: z.string().min(10, "يرجى وصف دليل الملكية بوضوح (10 أحرف على الأقل)"),
  proofMediaUrl:    z.string().url().optional().or(z.literal("")).nullable(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSession().catch(() => null);
    if (!session) {
      return NextResponse.json({ error: "يجب تسجيل الدخول لتقديم مطالبة" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "بيانات الطلب غير صالحة" }, { status: 400 });
    }

    const parsed = submitSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "بيانات المطالبة غير صالحة" },
        { status: 422 }
      );
    }

    const { itemType, proofDescription } = parsed.data;
    const rawLostItemId = toNullableUuid(parsed.data.lostItemId);
    const rawFoundItemId = toNullableUuid(parsed.data.foundItemId);
    const rawItemId = toNullableUuid(parsed.data.itemId);
    const matchId = toNullableUuid(parsed.data.matchId);
    const proofMediaUrl = toNullableUuid(parsed.data.proofMediaUrl);

    // تحديد نوع الغرض والمعرّف
    const type = itemType || (rawFoundItemId ? "found" : "lost");
    const targetId = rawItemId || (type === "found" ? rawFoundItemId : rawLostItemId);

    if (!targetId) {
      return NextResponse.json({ error: "معرّف الغرض مطلوب" }, { status: 422 });
    }

    let secretDetails: string | null = null;
    let targetUserId: string;
    let finalLostItemId: string | null = null;
    let finalFoundItemId: string | null = null;

    if (type === "found") {
      finalFoundItemId = targetId;
      finalLostItemId = rawLostItemId;

      const [foundItem] = await db
        .select({
          id: foundItems.id,
          secretDetails: foundItems.secretDetails,
          status: foundItems.status,
          userId: foundItems.userId,
        })
        .from(foundItems)
        .where(eq(foundItems.id, targetId))
        .limit(1);

      if (!foundItem) {
        return NextResponse.json({ error: "الغرض المعثور عليه غير موجود" }, { status: 404 });
      }

      // التحقق من أن حالة الغرض ما زالت مفتوحة
      if (foundItem.status !== "open") {
        return NextResponse.json(
          { error: "تم إثبات ملكية هذا الغرض مسبقاً وهو قيد إجراءات الاستلام" },
          { status: 400 }
        );
      }

      secretDetails = foundItem.secretDetails;
      targetUserId = foundItem.userId;
    } else {
      finalLostItemId = targetId;
      finalFoundItemId = rawFoundItemId;

      const [lostItem] = await db
        .select({
          id: lostItems.id,
          secretDetails: lostItems.secretDetails,
          status: lostItems.status,
          userId: lostItems.userId,
        })
        .from(lostItems)
        .where(eq(lostItems.id, targetId))
        .limit(1);

      if (!lostItem) {
        return NextResponse.json({ error: "الغرض المفقود غير موجود" }, { status: 404 });
      }

      // التحقق من أن حالة الغرض ما زالت مفتوحة
      if (lostItem.status !== "open") {
        return NextResponse.json(
          { error: "تم إثبات ملكية هذا الغرض مسبقاً وهو قيد إجراءات الاستلام" },
          { status: 400 }
        );
      }

      secretDetails = lostItem.secretDetails;
      targetUserId = lostItem.userId;
    }

    // المطالِب لا يجوز أن يكون صاحب الغرض نفسه
    if (targetUserId === session.id) {
      return NextResponse.json({ error: "لا يمكنك المطالبة بغرض أنت نشرته" }, { status: 409 });
    }

    // التحقق مما إذا كان الغرض يحتوي مسبقاً على مطالبة موثقة
    const [alreadyVerifiedClaim] = await db
      .select({ id: claims.id })
      .from(claims)
      .where(
        and(
          type === "found" ? eq(claims.foundItemId, targetId) : eq(claims.lostItemId, targetId),
          eq(claims.status, "verified")
        )
      )
      .limit(1);

    if (alreadyVerifiedClaim) {
      return NextResponse.json(
        { error: "تم إثبات ملكية هذا الغرض مسبقاً وهو قيد إجراءات الاستلام" },
        { status: 400 }
      );
    }

    // منع تعدد المطالبات من نفس الشخص على نفس الغرض أو المطابقة
    const [existing] = await db
      .select({ id: claims.id, status: claims.status })
      .from(claims)
      .where(
        and(
          type === "found" ? eq(claims.foundItemId, targetId) : eq(claims.lostItemId, targetId),
          eq(claims.claimantId, session.id),
          or(eq(claims.status, "pending"), eq(claims.status, "verified"))
        )
      )
      .limit(1);

    if (existing) {
      return NextResponse.json(
        {
          error:
            existing.status === "verified"
              ? "تم قبول وإثبات مطالبتك مسبقاً على هذا الغرض، يمكنك الانتقال لجدولة موعد الاستلام"
              : "لديك مطالبة سابقة قيد المراجعة والتحقق على هذا الغرض بالفعل",
        },
        { status: 409 }
      );
    }

    if (matchId) {
      const [existingMatchClaim] = await db
        .select({ id: claims.id, status: claims.status })
        .from(claims)
        .where(
          and(
            eq(claims.matchId, matchId),
            eq(claims.claimantId, session.id),
            or(eq(claims.status, "pending"), eq(claims.status, "verified"))
          )
        )
        .limit(1);

      if (existingMatchClaim) {
        return NextResponse.json(
          {
            error:
              existingMatchClaim.status === "verified"
                ? "تم قبول وإثبات مطالبتك مسبقاً على هذه المطابقة، يمكنك الانتقال لجدولة موعد الاستلام"
                : "توجد مطالبة سابقة قيد المراجعة والتحقق على هذه المطابقة بالفعل",
          },
          { status: 409 }
        );
      }
    }

    // فحص نسبة تطابق العلامات السرية إن وجدت للمساعدة في المراجعة
    const status = "pending" as const;
    let verificationNotes: string | undefined;

    if (secretDetails) {
      const { score } = verifyProof(proofDescription, secretDetails);
      const pct = Math.round(score * 100);
      verificationNotes = `نسبة تطابق الكلمات مع التفاصيل السرية: ${pct}%`;
    }

    const [claim] = await db
      .insert(claims)
      .values({
        matchId: matchId ?? null,
        lostItemId: finalLostItemId ?? null,
        foundItemId: finalFoundItemId ?? null,
        claimantId: session.id,
        proofDescription: proofDescription.trim(),
        proofMediaUrl: proofMediaUrl ?? null,
        status,
        verificationNotes: verificationNotes ?? null,
      })
      .returning();

    // إشعار صاحب الغرض (الملتقط) لمراجعة إثبات الملكية في /dashboard/claims
    await notify({
      userId: targetUserId,
      type: "claim.created",
      title: "مطالبة جديدة واردة بإثبات الملكية",
      body: "قام صاحب المفقود بتقديم إثبات الملكية، يرجى مراجعة الدليل وقبوله للمتابعة لجدولة الاستلام.",
      link: "/dashboard/claims",
    });

    revalidatePath("/dashboard/claims");
    revalidatePath("/dashboard/claims", "page");
    revalidatePath("/dashboard/matches");
    revalidatePath("/dashboard/recoveries");
    revalidatePath("/dashboard");

    return NextResponse.json(
      {
        id: claim.id,
        status: claim.status,
        verificationNotes: claim.verificationNotes,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[CLAIMS_POST_ERROR]", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء حفظ المطالبة، يرجى المحاولة مرة أخرى لاحقاً" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession().catch(() => null);
    if (!session) {
      return NextResponse.json({ error: "غير مصرَّح" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const lostItemId = toNullableUuid(searchParams.get("lostItemId"));
    const foundItemId = toNullableUuid(searchParams.get("foundItemId"));
    const itemId = toNullableUuid(searchParams.get("itemId"));

    let whereClause = eq(claims.claimantId, session.id);

    if (itemId) {
      whereClause = and(whereClause, or(eq(claims.lostItemId, itemId), eq(claims.foundItemId, itemId)))!;
    } else if (lostItemId) {
      whereClause = and(whereClause, eq(claims.lostItemId, lostItemId))!;
    } else if (foundItemId) {
      whereClause = and(whereClause, eq(claims.foundItemId, foundItemId))!;
    }

    const rows = await db
      .select({
        id: claims.id,
        matchId: claims.matchId,
        lostItemId: claims.lostItemId,
        foundItemId: claims.foundItemId,
        status: claims.status,
        proofDescription: claims.proofDescription,
        proofMediaUrl: claims.proofMediaUrl,
        verificationNotes: claims.verificationNotes,
        createdAt: claims.createdAt,
      })
      .from(claims)
      .where(whereClause)
      .orderBy(claims.createdAt);

    return NextResponse.json(rows);
  } catch (error) {
    console.error("[CLAIMS_GET_ERROR]", error);
    return NextResponse.json({ error: "حدث خطأ أثناء جلب المطالبات" }, { status: 500 });
  }
}
