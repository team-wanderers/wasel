import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { recoveries, claims, pickupPoints, lostItems, foundItems, auditLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { notify } from "@/lib/notify";

type Params = { params: Promise<{ id: string }> };

const updateRecoverySchema = z.object({
  pickupPointId: z.string().uuid().optional().or(z.literal("")).nullable(),
  scheduledAt: z.string().datetime().optional().or(z.string().min(1)).nullable(),
  notes: z.string().optional().nullable(),
});

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSession().catch(() => null);
    if (!session) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const { id } = await params;

    const [row] = await db
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
      .where(eq(recoveries.id, id))
      .limit(1);

    if (!row) {
      return NextResponse.json({ error: "عملية الاستلام غير موجودة" }, { status: 404 });
    }

    const isParty =
      row.claimantId === session.id ||
      row.lostUserId === session.id ||
      row.foundUserId === session.id ||
      session.role === "admin";

    if (!isParty) {
      return NextResponse.json({ error: "غير مصرح لك بالوصول" }, { status: 403 });
    }

    return NextResponse.json(row);
  } catch (error) {
    console.error("[RECOVERY_GET_BY_ID_ERROR]", error);
    return NextResponse.json({ error: "حدث خطأ أثناء جلب بيانات الاستلام" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await getSession().catch(() => null);
    if (!session) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "بيانات الطلب غير صالحة" }, { status: 400 });
    }

    const parsed = updateRecoverySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "البيانات غير صالحة" },
        { status: 422 }
      );
    }

    // جلب العملية الحالية
    const [existing] = await db
      .select({
        id: recoveries.id,
        claimId: recoveries.claimId,
        pickupPointId: recoveries.pickupPointId,
        status: recoveries.status,
        scheduledAt: recoveries.scheduledAt,
        notes: recoveries.notes,
        claimantId: claims.claimantId,
        lostUserId: lostItems.userId,
        foundUserId: foundItems.userId,
      })
      .from(recoveries)
      .innerJoin(claims, eq(recoveries.claimId, claims.id))
      .leftJoin(lostItems, eq(claims.lostItemId, lostItems.id))
      .leftJoin(foundItems, eq(claims.foundItemId, foundItems.id))
      .where(eq(recoveries.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "عملية الاستلام غير موجودة" }, { status: 404 });
    }

    const isParty =
      existing.claimantId === session.id ||
      existing.lostUserId === session.id ||
      existing.foundUserId === session.id ||
      session.role === "admin";

    if (!isParty) {
      return NextResponse.json({ error: "غير مصرح لك بتعديل موعد الاستلام" }, { status: 403 });
    }

    if (existing.status === "completed") {
      return NextResponse.json({ error: "لا يمكن تعديل موعد عملية مكتملة ومغلقة" }, { status: 400 });
    }

    let scheduledDate: Date | null = existing.scheduledAt;
    if (parsed.data.scheduledAt !== undefined) {
      if (parsed.data.scheduledAt) {
        const d = new Date(parsed.data.scheduledAt);
        if (!isNaN(d.getTime())) {
          scheduledDate = d;
        }
      } else {
        scheduledDate = null;
      }
    }

    const pickupPointId = parsed.data.pickupPointId !== undefined
      ? (parsed.data.pickupPointId && parsed.data.pickupPointId.trim().length > 0 ? parsed.data.pickupPointId.trim() : null)
      : existing.pickupPointId;

    const notes = parsed.data.notes !== undefined
      ? (parsed.data.notes && parsed.data.notes.trim().length > 0 ? parsed.data.notes.trim() : null)
      : existing.notes;

    const now = new Date();
    await db
      .update(recoveries)
      .set({
        scheduledAt: scheduledDate,
        pickupPointId,
        notes,
        updatedAt: now,
      })
      .where(eq(recoveries.id, id));

    // جلب السجل المحدث مع العلاقات
    const [updatedRow] = await db
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
      .where(eq(recoveries.id, id))
      .limit(1);

    await db.insert(auditLogs).values({
      actorId: session.id,
      action: "recovery.rescheduled",
      entityType: "recovery",
      entityId: id,
      meta: {
        newScheduledAt: scheduledDate?.toISOString(),
        pickupPointId,
        notes,
      },
    }).catch((err) => console.error("Audit log error:", err));

    const otherUserId = existing.lostUserId === session.id
      ? (existing.foundUserId ?? existing.claimantId)
      : (existing.lostUserId ?? existing.claimantId);

    if (otherUserId && otherUserId !== session.id) {
      await notify({
        userId: otherUserId,
        type: "recovery.rescheduled",
        title: "تم تعديل موعد الاستلام",
        body: "قام الطرف الآخر بتحديث موعد أو نقطة الاستلام المقترحة.",
        link: "/dashboard/recoveries",
      });
    }

    return NextResponse.json(updatedRow, { status: 200 });
  } catch (error) {
    console.error("[RECOVERY_PATCH_ERROR]", error);
    return NextResponse.json({ error: "حدث خطأ أثناء تعديل موعد الاستلام" }, { status: 500 });
  }
}
