import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { recoveries, claims, pickupPoints, lostItems, foundItems, auditLogs } from "@/db/schema";
import { eq, or, desc } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { notify } from "@/lib/notify";

const scheduleSchema = z.object({
  claimId: z.string().uuid("معرّف المطالبة غير صالح"),
  pickupPointId: z.string().uuid().optional().or(z.literal("")).nullable(),
  scheduledAt: z.string().datetime().optional().or(z.string().min(1)).nullable(),
  notes: z.string().optional().nullable(),
});

export async function GET() {
  try {
    const session = await getSession().catch(() => null);
    if (!session) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const rows = await db
      .select({
        id: recoveries.id,
        claimId: recoveries.claimId,
        pickupPointId: recoveries.pickupPointId,
        status: recoveries.status,
        scheduledAt: recoveries.scheduledAt,
        completedAt: recoveries.completedAt,
        ownerConfirmedAt: recoveries.ownerConfirmedAt,
        finderConfirmedAt: recoveries.finderConfirmedAt,
        notes: recoveries.notes,
        handoverCode: recoveries.handoverCode,
        createdAt: recoveries.createdAt,
        claimStatus: claims.status,
        claimantId: claims.claimantId,
        pickupPointName: pickupPoints.name,
        pickupPointAddress: pickupPoints.address,
        pickupPointPhone: pickupPoints.phone,
        lostItemId: claims.lostItemId,
        foundItemId: claims.foundItemId,
        lostTitle: lostItems.title,
        lostUserId: lostItems.userId,
        foundTitle: foundItems.title,
        foundUserId: foundItems.userId,
      })
      .from(recoveries)
      .innerJoin(claims, eq(recoveries.claimId, claims.id))
      .leftJoin(pickupPoints, eq(recoveries.pickupPointId, pickupPoints.id))
      .leftJoin(lostItems, eq(claims.lostItemId, lostItems.id))
      .leftJoin(foundItems, eq(claims.foundItemId, foundItems.id))
      .where(
        or(
          eq(claims.claimantId, session.id),
          eq(lostItems.userId, session.id),
          eq(foundItems.userId, session.id)
        )
      )
      .orderBy(desc(recoveries.createdAt));

    return NextResponse.json(rows);
  } catch (error) {
    console.error("[RECOVERIES_GET_ERROR]", error);
    return NextResponse.json({ error: "حدث خطأ أثناء جلب عمليات الاسترداد والتسليم" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession().catch(() => null);
    if (!session) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "بيانات الطلب غير صالحة" }, { status: 400 });
    }

    const parsed = scheduleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "البيانات غير صالحة" },
        { status: 422 }
      );
    }

    const { claimId, notes } = parsed.data;
    const pickupPointId = parsed.data.pickupPointId && parsed.data.pickupPointId.trim().length > 0
      ? parsed.data.pickupPointId.trim()
      : null;

    let scheduledDate: Date | null = null;
    if (parsed.data.scheduledAt) {
      const d = new Date(parsed.data.scheduledAt);
      if (!isNaN(d.getTime())) {
        scheduledDate = d;
      }
    }

    // التحقق من المطالبة
    const [claim] = await db
      .select({
        id: claims.id,
        status: claims.status,
        claimantId: claims.claimantId,
        lostItemId: claims.lostItemId,
        foundItemId: claims.foundItemId,
        lostUserId: lostItems.userId,
        foundUserId: foundItems.userId,
      })
      .from(claims)
      .leftJoin(lostItems, eq(claims.lostItemId, lostItems.id))
      .leftJoin(foundItems, eq(claims.foundItemId, foundItems.id))
      .where(eq(claims.id, claimId))
      .limit(1);

    if (!claim) {
      return NextResponse.json({ error: "المطالبة غير موجودة" }, { status: 404 });
    }

    if (claim.status !== "verified") {
      return NextResponse.json(
        { error: "لا يمكن جدولة الاستلام إلا بعد إثبات الملكية والمطالبة بنجاح (حالة verified)" },
        { status: 400 }
      );
    }

    const isParty =
      claim.claimantId === session.id ||
      claim.lostUserId === session.id ||
      claim.foundUserId === session.id ||
      session.role === "admin";

    if (!isParty) {
      return NextResponse.json({ error: "غير مصرح لك بجدولة استلام هذا الغرض" }, { status: 403 });
    }

    // توليد رمز عشوائي بسيط من 4 أرقام
    const generatedOtp = String(Math.floor(1000 + Math.random() * 9000));

    // تحقق من وجود استرداد مسبق لنفس المطالبة
    const [existing] = await db
      .select()
      .from(recoveries)
      .where(eq(recoveries.claimId, claimId))
      .limit(1);

    if (existing) {
      const [updated] = await db
        .update(recoveries)
        .set({
          pickupPointId: pickupPointId ?? existing.pickupPointId,
          scheduledAt: scheduledDate ?? existing.scheduledAt,
          notes: notes !== undefined ? (notes?.trim() || null) : existing.notes,
          handoverCode: existing.handoverCode || generatedOtp,
          updatedAt: new Date(),
        })
        .where(eq(recoveries.id, existing.id))
        .returning();

      return NextResponse.json(updated, { status: 200 });
    }

    const [recovery] = await db
      .insert(recoveries)
      .values({
        claimId,
        pickupPointId,
        scheduledAt: scheduledDate,
        notes: notes && notes.trim().length > 0 ? notes.trim() : null,
        status: "scheduled",
        handoverCode: generatedOtp,
      })
      .returning();

    await db.insert(auditLogs).values({
      actorId: session.id,
      action: "recovery.scheduled",
      entityType: "recovery",
      entityId: recovery.id,
      meta: {
        claimId,
        pickupPointId,
        scheduledAt: scheduledDate?.toISOString(),
      },
    }).catch((err) => console.error("Audit log error:", err));

    const otherUserId = claim.lostUserId === session.id
      ? (claim.foundUserId ?? claim.claimantId)
      : (claim.lostUserId ?? claim.claimantId);

    if (otherUserId && otherUserId !== session.id) {
      await notify({
        userId: otherUserId,
        type: "recovery.scheduled",
        title: "تمت جدولة موعد ونقطة الاستلام",
        body: "تم تحديد موعد ونقطة استلام الغرض في نقطة الأمانة المعتمدة.",
        link: "/dashboard/recoveries",
      });
    }

    return NextResponse.json(recovery, { status: 201 });
  } catch (error) {
    console.error("[RECOVERIES_POST_ERROR]", error);
    return NextResponse.json({ error: "حدث خطأ أثناء جدولة الاستلام" }, { status: 500 });
  }
}
