import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { pickupPoints } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

const updateSchema = z.object({
  name: z.string().min(2, "اسم نقطة الاستلام مطلوب").optional(),
  address: z.string().min(3, "العنوان مطلوب").optional(),
  phone: z.string().optional().or(z.literal("")).nullable(),
  workingHours: z.string().optional().or(z.literal("")).nullable(),
  lat: z.number().optional().nullable(),
  lng: z.number().optional().nullable(),
  isActive: z.boolean().optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await getSession().catch(() => null);
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "غير مصرح - للمشرفين فقط" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "بيانات الطلب غير صالحة" }, { status: 400 });
    }

    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "البيانات غير صالحة" },
        { status: 422 }
      );
    }

    const [existing] = await db
      .select({ id: pickupPoints.id })
      .from(pickupPoints)
      .where(eq(pickupPoints.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "نقطة الاستلام غير موجودة" }, { status: 404 });
    }

    const updateData: Partial<typeof pickupPoints.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (parsed.data.name !== undefined) updateData.name = parsed.data.name.trim();
    if (parsed.data.address !== undefined) updateData.address = parsed.data.address.trim();
    if (parsed.data.phone !== undefined) {
      updateData.phone = parsed.data.phone && parsed.data.phone.trim().length > 0 ? parsed.data.phone.trim() : null;
    }
    if (parsed.data.workingHours !== undefined) {
      updateData.workingHours =
        parsed.data.workingHours && parsed.data.workingHours.trim().length > 0 ? parsed.data.workingHours.trim() : null;
    }
    if (parsed.data.lat !== undefined) updateData.lat = parsed.data.lat;
    if (parsed.data.lng !== undefined) updateData.lng = parsed.data.lng;
    if (parsed.data.isActive !== undefined) updateData.isActive = parsed.data.isActive;

    const [updated] = await db
      .update(pickupPoints)
      .set(updateData)
      .where(eq(pickupPoints.id, id))
      .returning();

    await logAudit({
      actorId: session.id,
      action: "pickup_point.update",
      entityType: "pickup_point",
      entityId: updated.id,
      meta: {
        name: updated.name,
        address: updated.address,
        phone: updated.phone,
        isActive: updated.isActive,
        changes: parsed.data,
      },
    });

    revalidatePath("/admin/pickup-points");
    revalidatePath("/admin/audit-logs");

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[ADMIN_PICKUP_POINTS_PATCH_ERROR]", error);
    return NextResponse.json({ error: "حدث خطأ أثناء تعديل نقطة الاستلام" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSession().catch(() => null);
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "غير مصرح - للمشرفين فقط" }, { status: 403 });
    }

    const { id } = await params;

    const [updated] = await db
      .update(pickupPoints)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(pickupPoints.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "نقطة الاستلام غير موجودة" }, { status: 404 });
    }

    await logAudit({
      actorId: session.id,
      action: "pickup_point.delete",
      entityType: "pickup_point",
      entityId: updated.id,
      meta: {
        name: updated.name,
        address: updated.address,
        action: "deactivated",
      },
    });

    revalidatePath("/admin/pickup-points");
    revalidatePath("/admin/audit-logs");

    return NextResponse.json({ success: true, message: "تم تعطيل نقطة الاستلام بنجاح" });
  } catch (error) {
    console.error("[ADMIN_PICKUP_POINTS_DELETE_ERROR]", error);
    return NextResponse.json({ error: "حدث خطأ أثناء تعطيل نقطة الاستلام" }, { status: 500 });
  }
}
