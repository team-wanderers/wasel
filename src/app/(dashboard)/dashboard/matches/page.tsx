import { requireUser } from "@/lib/auth";
import { db } from "@/db";
import { matches, lostItems, foundItems, itemMedia, claims, recoveries } from "@/db/schema";
import { eq, or, desc, inArray, and } from "drizzle-orm";
import MatchesManager, { MatchItem } from "./MatchesManager";

export const metadata = {
  title: "المطابقات الذكية | واصل",
  description: "استعراض ومراجعة وتأكيد المطابقات الذكية بين المفقودات والموجودات",
};

export default async function MatchesPage() {
  const user = await requireUser();

  // جلب المطابقات المرتبطة ببلاغات المستخدم
  const rows = await db
    .select({
      id: matches.id,
      score: matches.score,
      status: matches.status,
      createdAt: matches.createdAt,
      lostId: lostItems.id,
      lostTitle: lostItems.title,
      lostDescription: lostItems.description,
      lostCategory: lostItems.category,
      lostLat: lostItems.lat,
      lostLng: lostItems.lng,
      lostAt: lostItems.lostAt,
      lostUserId: lostItems.userId,
      foundId: foundItems.id,
      foundTitle: foundItems.title,
      foundDescription: foundItems.description,
      foundCategory: foundItems.category,
      foundLat: foundItems.lat,
      foundLng: foundItems.lng,
      foundAt: foundItems.foundAt,
      foundUserId: foundItems.userId,
    })
    .from(matches)
    .innerJoin(lostItems, eq(matches.lostItemId, lostItems.id))
    .innerJoin(foundItems, eq(matches.foundItemId, foundItems.id))
    .where(
      and(
        or(eq(lostItems.userId, user.id), eq(foundItems.userId, user.id)),
        // استثناء أي مطابقة مقترحة إذا كان البلاغ المفقود أو المعثور عليه مغلقاً بالفعل (recovered / closed) عبر عملية أخرى
        or(
          eq(matches.status, "accepted"),
          eq(matches.status, "rejected"),
          eq(matches.status, "expired"),
          and(
            eq(lostItems.status, "open"),
            eq(foundItems.status, "open")
          )
        )
      )
    )
    .orderBy(desc(matches.createdAt));

  const lostIds = Array.from(new Set(rows.map((r) => r.lostId).filter(Boolean)));
  const foundIds = Array.from(new Set(rows.map((r) => r.foundId).filter(Boolean)));
  const matchIds = Array.from(new Set(rows.map((r) => r.id).filter(Boolean)));
  const lostUserIds = Array.from(new Set(rows.map((r) => r.lostUserId).filter(Boolean)));

  const lostImages: Record<string, string> = {};
  if (lostIds.length > 0) {
    const mediaRows = await db
      .select({ lostItemId: itemMedia.lostItemId, path: itemMedia.path })
      .from(itemMedia)
      .where(inArray(itemMedia.lostItemId, lostIds));
    for (const m of mediaRows) {
      if (m.lostItemId && !lostImages[m.lostItemId]) {
        lostImages[m.lostItemId] = m.path;
      }
    }
  }

  const foundImages: Record<string, string> = {};
  if (foundIds.length > 0) {
    const mediaRows = await db
      .select({ foundItemId: itemMedia.foundItemId, path: itemMedia.path })
      .from(itemMedia)
      .where(inArray(itemMedia.foundItemId, foundIds));
    for (const m of mediaRows) {
      if (m.foundItemId && !foundImages[m.foundItemId]) {
        foundImages[m.foundItemId] = m.path;
      }
    }
  }

  // جلب المطالبات المحصورة بدقة بين foundItemId و lostUserId أو lostItemId لنفس المطابقة
  interface ClaimWithRecovery {
    id: string;
    matchId: string | null;
    lostItemId: string | null;
    foundItemId: string | null;
    claimantId: string;
    status: string;
    recoveryId: string | null;
    recoveryStatus: string | null;
  }

  let claimsRows: ClaimWithRecovery[] = [];
  if (foundIds.length > 0 && (lostUserIds.length > 0 || matchIds.length > 0 || lostIds.length > 0)) {
    claimsRows = await db
      .select({
        id: claims.id,
        matchId: claims.matchId,
        lostItemId: claims.lostItemId,
        foundItemId: claims.foundItemId,
        claimantId: claims.claimantId,
        status: claims.status,
        recoveryId: recoveries.id,
        recoveryStatus: recoveries.status,
      })
      .from(claims)
      .leftJoin(recoveries, eq(claims.id, recoveries.claimId))
      .where(
        or(
          matchIds.length > 0 ? inArray(claims.matchId, matchIds) : undefined,
          and(
            inArray(claims.foundItemId, foundIds),
            lostUserIds.length > 0 ? inArray(claims.claimantId, lostUserIds) : undefined
          ),
          and(
            inArray(claims.foundItemId, foundIds),
            lostIds.length > 0 ? inArray(claims.lostItemId, lostIds) : undefined
          )
        )
      );
  }

  const initialMatches: MatchItem[] = rows.map((r) => {
    // إيجاد المطالبة الخاصة بهذه المطابقة تحديداً
    const linkedClaim = claimsRows.find(
      (c) =>
        (c.matchId && c.matchId === r.id) ||
        (c.foundItemId === r.foundId && c.lostItemId === r.lostId) ||
        (c.foundItemId === r.foundId && c.claimantId === r.lostUserId)
    );

    return {
      id: r.id,
      score: r.score,
      status: r.status as MatchItem["status"],
      createdAt: r.createdAt,
      claimId: linkedClaim?.id ?? null,
      claimStatus: linkedClaim?.status ?? null,
      recoveryId: linkedClaim?.recoveryId ?? null,
      recoveryStatus: (linkedClaim?.recoveryStatus as MatchItem["recoveryStatus"]) ?? null,
      lost: {
        id: r.lostId,
        title: r.lostTitle,
        description: r.lostDescription,
        category: r.lostCategory,
        lat: r.lostLat,
        lng: r.lostLng,
        lostAt: r.lostAt,
        userId: r.lostUserId,
        image: lostImages[r.lostId] ?? null,
      },
      found: {
        id: r.foundId,
        title: r.foundTitle,
        description: r.foundDescription,
        category: r.foundCategory,
        lat: r.foundLat,
        lng: r.foundLng,
        foundAt: r.foundAt,
        userId: r.foundUserId,
        image: foundImages[r.foundId] ?? null,
      },
    };
  });

  return <MatchesManager initialMatches={initialMatches} currentUserId={user.id} />;
}
