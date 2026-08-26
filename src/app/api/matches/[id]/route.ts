import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { matches, lostItems, foundItems, auditLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { notify } from "@/lib/notify";
import { revalidatePath } from "next/cache";

const updateMatchSchema = z.object({
  status: z.enum(["accepted", "rejected", "suggested", "expired"]),
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

    const parsed = updateMatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "حالة المطابقة غير صالحة" },
        { status: 422 }
      );
    }

    // جلب المطابقة والتحقق من صلاحية المستخدم
    const [row] = await db
      .select({
        id: matches.id,
        lostItemId: matches.lostItemId,
        foundItemId: matches.foundItemId,
        score: matches.score,
        status: matches.status,
        lostTitle: lostItems.title,
        lostUserId: lostItems.userId,
        foundTitle: foundItems.title,
        foundUserId: foundItems.userId,
      })
      .from(matches)
      .innerJoin(lostItems, eq(matches.lostItemId, lostItems.id))
      .innerJoin(foundItems, eq(matches.foundItemId, foundItems.id))
      .where(eq(matches.id, id))
      .limit(1);

    if (!row) {
      return NextResponse.json({ error: "المطابقة غير موجودة" }, { status: 404 });
    }

    const isParty =
      row.lostUserId === session.id ||
      row.foundUserId === session.id ||
      session.role === "admin";

    if (!isParty) {
      return NextResponse.json({ error: "غير مصرح لك بتعديل هذه المطابقة" }, { status: 403 });
    }

    const newStatus = parsed.data.status;

    const [updated] = await db
      .update(matches)
      .set({ status: newStatus })
      .where(eq(matches.id, id))
      .returning();

    // تسجيل في audit_logs
    await db.insert(auditLogs).values({
      actorId: session.id,
      action: `match.${newStatus}`,
      entityType: "match",
      entityId: id,
      meta: {
        previousStatus: row.status,
        newStatus,
        lostItemId: row.lostItemId,
        foundItemId: row.foundItemId,
      },
    }).catch((err) => console.error("Audit log error:", err));

    // إذا تم قبول المطابقة: إشعار الطرف الآخر
    if (newStatus === "accepted") {
      const otherUserId = row.lostUserId === session.id ? row.foundUserId : row.lostUserId;
      if (otherUserId && otherUserId !== session.id) {
        await notify({
          userId: otherUserId,
          type: "match.created",
          title: "تم تأكيد قبول المطابقة!",
          body: `قام الطرف الآخر بقبول المطابقة بين "${row.lostTitle}" و "${row.foundTitle}". يمكنك الآن المتابعة لتقديم مطالبة أو جدولة الاستلام.`,
          link: "/dashboard/matches",
        });
      }
    }

    revalidatePath("/dashboard/matches");
    revalidatePath("/dashboard/matches", "page");
    revalidatePath("/dashboard");

    return NextResponse.json({
      success: true,
      match: updated,
      message: newStatus === "accepted" ? "تم قبول المطابقة بنجاح" : "تم رفض المطابقة واستبعادها",
    });
  } catch (error) {
    console.error("[MATCH_PATCH_ERROR]", error);
    return NextResponse.json({ error: "حدث خطأ أثناء تحديث حالة المطابقة" }, { status: 500 });
  }
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSession().catch(() => null);
    if (!session) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const { id } = await params;

    const [row] = await db
      .select({
        id: matches.id,
        lostItemId: matches.lostItemId,
        foundItemId: matches.foundItemId,
        score: matches.score,
        status: matches.status,
        createdAt: matches.createdAt,
        lostTitle: lostItems.title,
        lostUserId: lostItems.userId,
        foundTitle: foundItems.title,
        foundUserId: foundItems.userId,
      })
      .from(matches)
      .innerJoin(lostItems, eq(matches.lostItemId, lostItems.id))
      .innerJoin(foundItems, eq(matches.foundItemId, foundItems.id))
      .where(eq(matches.id, id))
      .limit(1);

    if (!row) {
      return NextResponse.json({ error: "المطابقة غير موجودة" }, { status: 404 });
    }

    return NextResponse.json(row);
  } catch (error) {
    console.error("[MATCH_GET_ERROR]", error);
    return NextResponse.json({ error: "حدث خطأ أثناء جلب المطابقة" }, { status: 500 });
  }
}
