import { db } from "@/db";
import { pickupPoints } from "@/db/schema";
import { count } from "drizzle-orm";

const ATAQ_PICKUP_POINTS = [
  {
    name: "نقطة أمانة السوق المركزي",
    address: "السوق المركزي، عتق، شبوة",
    phone: "771000001",
    workingHours: "8:00 ص — 8:00 م",
    lat: 14.5372,
    lng: 46.8319,
    isActive: true,
  },
  {
    name: "نقطة أمانة مديرية شبوة",
    address: "مبنى مديرية الشؤون الاجتماعية، عتق",
    phone: "771000002",
    workingHours: "8:00 ص — 3:00 م",
    lat: 14.5391,
    lng: 46.8342,
    isActive: true,
  },
  {
    name: "نقطة أمانة دوار عتق الرئيسي",
    address: "دوار عتق المركزي، شارع الجمهورية",
    phone: "771000003",
    workingHours: "9:00 ص — 9:00 م",
    lat: 14.5360,
    lng: 46.8300,
    isActive: true,
  },
];

async function seed() {
  const [result] = await db.select({ count: count() }).from(pickupPoints);
  const existing = Number(result?.count ?? 0);

  if (existing > 0) {
    console.log(`[seed] pickup_points already has ${existing} rows — skipping.`);
    process.exit(0);
  }

  await db.insert(pickupPoints).values(ATAQ_PICKUP_POINTS);
  console.log(`[seed] Inserted ${ATAQ_PICKUP_POINTS.length} pickup points for Ataq, Shabwa.`);
  process.exit(0);
}

seed().catch((err) => {
  console.error("[seed] Error:", err);
  process.exit(1);
});
