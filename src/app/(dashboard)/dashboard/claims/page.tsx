import { requireUser } from "@/lib/auth";
import { db } from "@/db";
import { claims, lostItems, foundItems, users, recoveries } from "@/db/schema";
import { eq, or, desc } from "drizzle-orm";
import ClaimsManager, { ClaimItem } from "./ClaimsManager";

export const metadata = {
  title: "مطالبات إثبات الملكية | واصل",
  description: "مراجعة إثباتات الملكية الواردة والصادرة ومتابعة حالتها",
};

export default async function ClaimsPage() {
  const user = await requireUser();

  const rows = await db
    .select({
      id: claims.id,
      status: claims.status,
      proofDescription: claims.proofDescription,
      verificationNotes: claims.verificationNotes,
      createdAt: claims.createdAt,
      claimantId: claims.claimantId,
      claimantName: users.name,
      claimantEmail: users.email,
      lostTitle: lostItems.title,
      lostId: lostItems.id,
      lostStatus: lostItems.status,
      lostUserId: lostItems.userId,
      foundTitle: foundItems.title,
      foundId: foundItems.id,
      foundStatus: foundItems.status,
      foundUserId: foundItems.userId,
      recoveryId: recoveries.id,
      recoveryStatus: recoveries.status,
    })
    .from(claims)
    .leftJoin(users, eq(claims.claimantId, users.id))
    .leftJoin(lostItems, eq(claims.lostItemId, lostItems.id))
    .leftJoin(foundItems, eq(claims.foundItemId, foundItems.id))
    .leftJoin(recoveries, eq(claims.id, recoveries.claimId))
    .where(
      or(
        eq(claims.claimantId, user.id),
        eq(lostItems.userId, user.id),
        eq(foundItems.userId, user.id)
      )
    )
    .orderBy(desc(claims.createdAt));

  const initialClaims: ClaimItem[] = rows.map((r) => ({
    id: r.id,
    status: r.status as ClaimItem["status"],
    proofDescription: r.proofDescription,
    verificationNotes: r.verificationNotes,
    createdAt: r.createdAt,
    claimantId: r.claimantId,
    claimantName: r.claimantName ?? "مستخدم",
    claimantEmail: r.claimantEmail ?? null,
    lostTitle: r.lostTitle,
    lostId: r.lostId,
    lostStatus: r.lostStatus,
    lostUserId: r.lostUserId,
    foundTitle: r.foundTitle,
    foundId: r.foundId,
    foundStatus: r.foundStatus,
    foundUserId: r.foundUserId,
    recoveryId: r.recoveryId ?? null,
    recoveryStatus: (r.recoveryStatus as ClaimItem["recoveryStatus"]) ?? null,
  }));

  return <ClaimsManager initialClaims={initialClaims} currentUserId={user.id} />;
}