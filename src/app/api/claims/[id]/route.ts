import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { claims, lostItems, foundItems, auditLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { notify } from "@/lib/notify";
import { revalidatePath } from "next/cache";

const updateClaimSchema = z.object({
  status: z.enum(["verified", "rejected", "cancelled"]),
  verificationNotes: z.string().optional().nullable(),
});

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await getSession().catch(() => null);
    if (!session) {
      return NextResponse.json({ error: "غير مصرح - يرجى تسجيل الدخول" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "بيانات الطلب غير صالحة" }, { status: 400 });
    }

    const parsed = updateClaimSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "حالة المطالبة غير صالحة" },
        { status: 422 }
      );
    }

    // جلب المطالبة مع بيانات الغرض والناشر والمطالِب
    const [row] = await db
      .select({
        id: claims.id,
        status: claims.status,
        claimantId: claims.claimantId,
        lostItemId: claims.lostItemId,
        foundItemId: claims.foundItemId,
        proofDescription: claims.proofDescription,
        lostTitle: lostItems.title,
        lostUserId: lostItems.userId,
        foundTitle: foundItems.title,
        foundUserId: foundItems.userId,
      })
      .from(claims)
      .leftJoin(lostItems, eq(claims.lostItemId, lostItems.id))
      .leftJoin(foundItems, eq(claims.foundItemId, foundItems.id))
      .where(eq(claims.id, id))
      .limit(1);

    if (!row) {
      return NextResponse.json({ error: "المطالبة غير موجودة" }, { status: 404 });
    }

    const isItemOwner =
      (row.foundUserId && row.foundUserId === session.id) ||
      (row.lostUserId && row.lostUserId === session.id) ||
      session.role === "admin";

    const isClaimant = row.claimantId === session.id;

    const targetStatus = parsed.data.status;

    // إلغاء المطالبة مسموح للمطالِب أو المشرف
    if (targetStatus === "cancelled" && !isClaimant && session.role !== "admin") {
      return NextResponse.json({ error: "غير مصرح لك بإلغاء هذه المطالبة" }, { status: 403 });
    }

    // قبول أو رفض المطالبة مسموح لناشر الغرض أو المشرف
    if ((targetStatus === "verified" || targetStatus === "rejected") && !isItemOwner) {
      return NextResponse.json({ error: "غير مصرح لك بمراجعة هذه المطالبة" }, { status: 403 });
    }

    const notes = parsed.data.verificationNotes?.trim() || null;
    const now = new Date();

    const [updated] = await db
      .update(claims)
      .set({
        status: targetStatus,
        verificationNotes:
          notes ??
          (targetStatus === "verified"
            ? "تم قبول إثبات الملكية واعتماده من قِبل ناشر البلاغ"
            : "تم رفض المطالبة من قِبل ناشر البلاغ"),
        updatedAt: now,
      })
      .where(eq(claims.id, id))
      .returning();

    // إذا تم القبول، تحديث حالة الغرض إلى claimed
    if (targetStatus === "verified") {
      if (row.foundItemId) {
        await db
          .update(foundItems)
          .set({ status: "claimed", updatedAt: now })
          .where(eq(foundItems.id, row.foundItemId));
      }
      if (row.lostItemId) {
        await db
          .update(lostItems)
          .set({ status: "claimed", updatedAt: now })
          .where(eq(lostItems.id, row.lostItemId));
      }

      // إشعار المطالب بالقبول
      await notify({
        userId: row.claimantId,
        type: "claim.verified",
        title: "تم قبول إثبات ملكيتك للغرض!",
        body: `قام ناشر الغرض بالموافقة على إثبات ملكيتك لـ "${row.foundTitle ?? row.lostTitle}". يمكنك الآن الانتقال لجدولة موعد الاستلام.`,
        link: `/dashboard/recoveries?claimId=${id}&action=schedule`,
      });
    } else if (targetStatus === "rejected") {
      // إشعار المطالب بالرفض
      await notify({
        userId: row.claimantId,
        type: "claim.rejected",
        title: "تم رفض مطالبة إثبات الملكية",
        body: `عذراً، لم يوافق ناشر الغرض على إثبات الملكية المقدم لـ "${row.foundTitle ?? row.lostTitle}".`,
        link: "/dashboard/claims",
      });
    }

    // سجل الرقابة
    await db
      .insert(auditLogs)
      .values({
        actorId: session.id,
        action: `claim.${targetStatus}`,
        entityType: "claim",
        entityId: id,
        meta: {
          previousStatus: row.status,
          newStatus: targetStatus,
          claimantId: row.claimantId,
          lostItemId: row.lostItemId,
          foundItemId: row.foundItemId,
        },
      })
      .catch((err) => console.error("Audit log error:", err));

    revalidatePath("/dashboard/claims");
    revalidatePath("/dashboard/claims", "page");
    revalidatePath("/dashboard/matches");
    revalidatePath("/dashboard/recoveries");
    revalidatePath("/dashboard");

    return NextResponse.json({
      success: true,
      claim: updated,
      message: targetStatus === "verified" ? "تم قبول إثبات الملكية بنجاح" : "تم رفض المطالبة",
    });
  } catch (error) {
    console.error("[CLAIM_PATCH_ERROR]", error);
    return NextResponse.json({ error: "حدث خطأ أثناء تحديث المطالبة" }, { status: 500 });
  }
}