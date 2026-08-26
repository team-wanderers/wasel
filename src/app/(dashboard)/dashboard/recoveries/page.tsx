import { requireUser } from "@/lib/auth";
import { db } from "@/db";
import { recoveries, claims, pickupPoints, lostItems, foundItems } from "@/db/schema";
import { eq, and, or, desc } from "drizzle-orm";
import RecoveriesManager from "./RecoveriesManager";

export default async function RecoveriesPage() {
  const user = await requireUser();

  // جلب عمليات الاسترداد الخاصة بالمستخدم
  const recoveriesRows = await db
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
        eq(claims.claimantId, user.id),
        eq(lostItems.userId, user.id),
        eq(foundItems.userId, user.id)
      )
    )
    .orderBy(desc(recoveries.createdAt));

  // جلب نقاط الأمانة النشطة
  const points = await db
    .select({
      id: pickupPoints.id,
      name: pickupPoints.name,
      address: pickupPoints.address,
      phone: pickupPoints.phone,
    })
    .from(pickupPoints)
    .where(eq(pickupPoints.isActive, true))
    .orderBy(desc(pickupPoints.createdAt));

  // جلب المطالبات المعتمدة (Verified) للمستخدم والتي يمكن جدولتها
  const verifiedClaimsRows = await db
    .select({
      id: claims.id,
      lostItemId: claims.lostItemId,
      foundItemId: claims.foundItemId,
      lostTitle: lostItems.title,
      foundTitle: foundItems.title,
    })
    .from(claims)
    .leftJoin(lostItems, eq(claims.lostItemId, lostItems.id))
    .leftJoin(foundItems, eq(claims.foundItemId, foundItems.id))
    .where(
      and(
        or(
          eq(claims.claimantId, user.id),
          eq(lostItems.userId, user.id),
          eq(foundItems.userId, user.id)
        ),
        eq(claims.status, "verified")
      )
    );

  // حصر المطالبات المعتمدة التي ليس لها عملية استلام سابقة أو جارية
  const scheduledClaimIds = new Set(
    recoveriesRows
      .filter((r) => r.status !== "cancelled")
      .map((r) => r.claimId)
  );

  const verifiedClaims = verifiedClaimsRows
    .filter((c) => !scheduledClaimIds.has(c.id))
    .map((c) => ({
      id: c.id,
      itemTitle: c.foundTitle ?? c.lostTitle ?? "غرض مطالبة",
      lostItemId: c.lostItemId,
      foundItemId: c.foundItemId,
    }));

  return (
    <RecoveriesManager
      initialRecoveries={recoveriesRows}
      availablePickupPoints={points}
      verifiedClaims={verifiedClaims}
      currentUserId={user.id}
    />
  );
}
