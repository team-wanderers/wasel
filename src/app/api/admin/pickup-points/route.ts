import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { pickupPoints } from "@/db/schema";
import { desc } from "drizzle-orm";
import { getSession } from "@/lib/auth";

const createSchema = z.object({
  name: z.string().min(2, "اسم نقطة الاستلام مطلوب (حرفان على الأقل)"),
  address: z.string().min(3, "العنوان بالتفصيل مطلوب"),
  phone: z.string().optional().or(z.literal("")).nullable(),
  lat: z.number().optional().nullable(),
  lng: z.number().optional().nullable(),
  isActive: z.boolean().default(true),
});

export async function GET() {
  try {
    const session = await getSession().catch(() => null);
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "غير مصرح - للمشرفين فقط" }, { status: 403 });
    }

    const rows = await db
      .select()
      .from(pickupPoints)
      .orderBy(desc(pickupPoints.createdAt));

    return NextResponse.json(rows);
  } catch (error) {
    console.error("[ADMIN_PICKUP_POINTS_GET_ERROR]", error);
    return NextResponse.json({ error: "حدث خطأ أثناء جلب نقاط الاستلام" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession().catch(() => null);
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "غير مصرح - للمشرفين فقط" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "بيانات الطلب غير صالحة" }, { status: 400 });
    }

    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "بيانات نقطة الاستلام غير صالحة" },
        { status: 422 }
      );
    }

    const { name, address, phone, lat, lng, isActive } = parsed.data;

    const [point] = await db
      .insert(pickupPoints)
      .values({
        name: name.trim(),
        address: address.trim(),
        phone: phone && phone.trim().length > 0 ? phone.trim() : null,
        lat: lat ?? null,
        lng: lng ?? null,
        isActive: isActive ?? true,
      })
      .returning();

    return NextResponse.json(point, { status: 201 });
  } catch (error) {
    console.error("[ADMIN_PICKUP_POINTS_POST_ERROR]", error);
    return NextResponse.json({ error: "حدث خطأ أثناء إنشاء نقطة الاستلام" }, { status: 500 });
  }
}
