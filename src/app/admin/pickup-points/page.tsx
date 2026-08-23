import { requireAdmin } from "@/lib/auth";
import { db } from "@/db";
import { pickupPoints } from "@/db/schema";
import { desc } from "drizzle-orm";
import PickupPointsManager from "./PickupPointsManager";

export default async function AdminPickupPointsPage() {
  await requireAdmin();

  const rows = await db
    .select({
      id: pickupPoints.id,
      name: pickupPoints.name,
      address: pickupPoints.address,
      phone: pickupPoints.phone,
      lat: pickupPoints.lat,
      lng: pickupPoints.lng,
      isActive: pickupPoints.isActive,
      createdAt: pickupPoints.createdAt,
    })
    .from(pickupPoints)
    .orderBy(desc(pickupPoints.createdAt));

  return <PickupPointsManager initialPoints={rows} />;
}
