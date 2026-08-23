import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { recoveries, claims, lostItems, foundItems, auditLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await getSession().catch(() => null);
    if (!session) {
      return NextResponse.json({ error: "غير مصرح - يرجى تسجيل الدخول" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const providedCode = typeof body.handoverCode === "string" ? body.handoverCode.trim() : null;

    const [rec] = await db
      .select({
        id: recoveries.id,
        claimId: recoveries.claimId,
        status: recoveries.status,
        ownerConfirmedAt: recoveries.ownerConfirmedAt,
        finderConfirmedAt: recoveries.finderConfirmedAt,
        scheduledAt: recoveries.scheduledAt,
        completedAt: recoveries.completedAt,
        pickupPointId: recoveries.pickupPointId,
        handoverCode: recoveries.handoverCode,
        claimantId: claims.claimantId,
        lostItemId: claims.lostItemId,
        foundItemId: claims.foundItemId,
        lostUserId: lostItems.userId,
        foundUserId: foundItems.userId,
      })
      .from(recoveries)
      .innerJoin(claims, eq(recoveries.claimId, claims.id))
      .leftJoin(lostItems, eq(claims.lostItemId, lostItems.id))
      .leftJoin(foundItems, eq(claims.foundItemId, foundItems.id))
      .where(eq(recoveries.id, id))
      .limit(1);

    if (!rec) {
      return NextResponse.json({ error: "عملية الاسترجاع غير موجودة" }, { status: 404 });
    }

    if (rec.status === "completed") {
      return NextResponse.json({ error: "تم تأكيد واكتمال هذه العملية مسبقاً" }, { status: 400 });
    }

    // تحديد دور المستخدم الحالي بدقة
    let isOwner = false;
    let isFinder = false;

    if (rec.foundUserId === session.id) {
      isFinder = true;
    } else if (rec.lostUserId === session.id) {
      isOwner = true;
    } else if (rec.claimantId === session.id) {
      if (rec.foundItemId) {
        isOwner = true;
      } else if (rec.lostItemId) {
        isFinder = true;
      } else {
        isOwner = true;
      }
    }

    const isAdmin = session.role === "admin";

    if (!isOwner && !isFinder && !isAdmin) {
      return NextResponse.json({ error: "غير مصرح لك بتأكيد هذا الاستلام" }, { status: 403 });
    }

    const now = new Date();
    let newOwnerConfirmedAt = rec.ownerConfirmedAt;
    let newFinderConfirmedAt = rec.finderConfirmedAt;
    let newStatus: "scheduled" | "in_progress" | "deposited" | "completed" | "cancelled" = rec.status;

    // 1. مسار التحقق بالرمز OTP (الاستلام النهائي من قِبل المالك عند الحضور للمركز)
    if (providedCode) {
      if (!rec.handoverCode || rec.handoverCode !== providedCode) {
        return NextResponse.json({ error: "رمز الاستلام غير صحيح، يرجى التأكد من الرمز المدخل" }, { status: 400 });
      }

      // توثيق استلام المالك واكتمال التسليم
      newOwnerConfirmedAt = newOwnerConfirmedAt ?? now;
      newFinderConfirmedAt = newFinderConfirmedAt ?? now; // في حال تم الاستلام المباشر
      newStatus = "completed";
    } else {
      // 2. مسار التأكيد اليدوي / الإيداع
      if (isFinder) {
        // الملتقط يؤكد إيداع الغرض في المركز: لا يُغلق البلاغ وتتحول الحالة إلى deposited
        newFinderConfirmedAt = now;
        newStatus = newOwnerConfirmedAt ? "completed" : "deposited";
      } else if (isOwner) {
        // المالك يؤكد الاستلام
        newOwnerConfirmedAt = now;
        newStatus = newFinderConfirmedAt ? "completed" : "in_progress";
      } else if (isAdmin) {
        if (!newFinderConfirmedAt) {
          newFinderConfirmedAt = now;
          newStatus = "deposited";
        } else {
          newOwnerConfirmedAt = now;
          newStatus = "completed";
        }
      }
    }

    const bothConfirmed = newStatus === "completed" || (newOwnerConfirmedAt !== null && newFinderConfirmedAt !== null);
    if (bothConfirmed) {
      newStatus = "completed";
    }
    const completedAt = bothConfirmed ? now : null;

    // تحديث سجل الاسترجاع
    const [updated] = await db
      .update(recoveries)
      .set({
        ownerConfirmedAt: newOwnerConfirmedAt,
        finderConfirmedAt: newFinderConfirmedAt,
        status: newStatus,
        completedAt: completedAt ?? rec.completedAt,
        updatedAt: now,
      })
      .where(eq(recoveries.id, id))
      .returning();

    // إذا اكتمل الاستلام النهائي: إغلاق وتحويل حالة الأغراض إلى recovered
    if (bothConfirmed) {
      if (rec.lostItemId) {
        await db
          .update(lostItems)
          .set({ status: "recovered", updatedAt: now })
          .where(eq(lostItems.id, rec.lostItemId));
      }
      if (rec.foundItemId) {
        await db
          .update(foundItems)
          .set({ status: "recovered", updatedAt: now })
          .where(eq(foundItems.id, rec.foundItemId));
      }

      await db.insert(auditLogs).values({
        actorId: session.id,
        action: providedCode ? "recovery.otp_completed" : "recovery.completed",
        entityType: "recovery",
        entityId: id,
        meta: {
          lostItemId: rec.lostItemId,
          foundItemId: rec.foundItemId,
          viaOtp: Boolean(providedCode),
          completedAt: now.toISOString(),
        },
      }).catch((err) => console.error("Audit log error:", err));
    } else {
      const actionName = newStatus === "deposited" ? "recovery.deposited" : "recovery.confirmed_partial";
      await db.insert(auditLogs).values({
        actorId: session.id,
        action: actionName,
        entityType: "recovery",
        entityId: id,
        meta: {
          status: newStatus,
          finderConfirmedAt: newFinderConfirmedAt?.toISOString(),
          ownerConfirmedAt: newOwnerConfirmedAt?.toISOString(),
        },
      }).catch((err) => console.error("Audit log error:", err));
    }

    let responseMessage = "تم تسجيل التأكيد بنجاح";
    if (bothConfirmed) {
      responseMessage = "تم تأكيد الاستلام بنجاح واكتمال إغلاق البلاغ واسترجاع الغرض";
    } else if (newStatus === "deposited") {
      responseMessage = "تم تأكيد إيداع الغرض في نقطة الأمانة بنجاح، بانتظار استلام المالك";
    }

    return NextResponse.json({
      success: true,
      recovery: updated,
      bothConfirmed,
      message: responseMessage,
    });
  } catch (error) {
    console.error("[RECOVERY_CONFIRM_ERROR]", error);
    return NextResponse.json({ error: "حدث خطأ أثناء تأكيد الاستلام" }, { status: 500 });
  }
}
