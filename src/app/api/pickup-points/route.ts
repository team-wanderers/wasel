import { NextResponse } from "next/server";
import { db } from "@/db";
import { pickupPoints } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  try {
    const rows = await db
      .select({
        id: pickupPoints.id,
        name: pickupPoints.name,
        address: pickupPoints.address,
        phone: pickupPoints.phone,
        workingHours: pickupPoints.workingHours,
        lat: pickupPoints.lat,
        lng: pickupPoints.lng,
      })
      .from(pickupPoints)
      .where(eq(pickupPoints.isActive, true))
      .orderBy(desc(pickupPoints.createdAt));

    return NextResponse.json(rows);
  } catch (error) {
    console.error("[PICKUP_POINTS_GET_ERROR]", error);
    return NextResponse.json({ error: "حدث خطأ أثناء جلب نقاط الاستلام المعتمدة" }, { status: 500 });
  }
}
