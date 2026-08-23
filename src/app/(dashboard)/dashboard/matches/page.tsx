import { requireUser } from "@/lib/auth";
import { db } from "@/db";
import { matches, lostItems, foundItems } from "@/db/schema";
import { eq, or, desc } from "drizzle-orm";
import MatchesManager, { MatchItem } from "./MatchesManager";

export default async function MatchesPage() {
  const user = await requireUser();

  // جلب المطابقات المرتبطة ببلاغات المستخدم
  const rows = await db
    .select({
      id: matches.id,
      score: matches.score,
      status: matches.status,
      createdAt: matches.createdAt,
      lostTitle: lostItems.title,
      lostId: lostItems.id,
      lostUserId: lostItems.userId,
      foundTitle: foundItems.title,
      foundId: foundItems.id,
      foundUserId: foundItems.userId,
    })
    .from(matches)
    .innerJoin(lostItems, eq(matches.lostItemId, lostItems.id))
    .innerJoin(foundItems, eq(matches.foundItemId, foundItems.id))
    .where(
      or(eq(lostItems.userId, user.id), eq(foundItems.userId, user.id)),
    )
    .orderBy(desc(matches.createdAt));

  const initialMatches: MatchItem[] = rows.map((r) => ({
    ...r,
    status: r.status as MatchItem["status"],
  }));

  return <MatchesManager initialMatches={initialMatches} currentUserId={user.id} />;
}
