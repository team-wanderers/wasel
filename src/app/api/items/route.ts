import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { lostItems, foundItems, itemMedia } from "@/db/schema";
import { eq, or, ilike, and, desc, sql, inArray } from "drizzle-orm";
import { getArabicSearchVariants } from "@/lib/normalize";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() || "";
    const type = searchParams.get("type")?.trim();
    const category = searchParams.get("category")?.trim();
    const status = searchParams.get("status")?.trim();
    const limit = Math.min(Math.max(1, parseInt(searchParams.get("limit") || "20", 10)), 100);
    const offset = Math.max(0, parseInt(searchParams.get("offset") || "0", 10));

    const validCategories = ["documents", "electronics", "keys", "bags", "jewelry", "pets", "other"] as const;
    const validStatuses = ["open", "matched", "claimed", "recovered", "closed"] as const;

    const categoryFilter = category && validCategories.includes(category as typeof validCategories[number])
      ? (category as typeof validCategories[number])
      : undefined;

    const statusFilter = status && validStatuses.includes(status as typeof validStatuses[number])
      ? (status as typeof validStatuses[number])
      : undefined;

    const showLost = !type || type === "lost" || type === "all";
    const showFound = !type || type === "found" || type === "all";

    type LostItemRow = {
      id: string;
      userId: string;
      title: string;
      description: string;
      category: typeof validCategories[number];
      status: typeof validStatuses[number];
      lat: number | null;
      lng: number | null;
      lostAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
      similarityScore: number;
    };

    type FoundItemRow = {
      id: string;
      userId: string;
      title: string;
      description: string;
      category: typeof validCategories[number];
      status: typeof validStatuses[number];
      lat: number | null;
      lng: number | null;
      foundAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
      similarityScore: number;
    };

    let lostResults: LostItemRow[] = [];
    let foundResults: FoundItemRow[] = [];

    const searchVariants = getArabicSearchVariants(q);
    const lostVariantConditions = searchVariants.flatMap((v) => [
      ilike(lostItems.title, `%${v}%`),
      ilike(lostItems.description, `%${v}%`),
    ]);
    const foundVariantConditions = searchVariants.flatMap((v) => [
      ilike(foundItems.title, `%${v}%`),
      ilike(foundItems.description, `%${v}%`),
    ]);

    try {
      const textFilterLost = q
        ? or(
            sql`similarity(${lostItems.title}, ${q}) > 0.15`,
            sql`similarity(${lostItems.description}, ${q}) > 0.15`,
            ...lostVariantConditions,
          )
        : undefined;

      const textFilterFound = q
        ? or(
            sql`similarity(${foundItems.title}, ${q}) > 0.15`,
            sql`similarity(${foundItems.description}, ${q}) > 0.15`,
            ...foundVariantConditions,
          )
        : undefined;

      const lostSimilarityScore = sql<number>`GREATEST(
        similarity(${lostItems.title}, ${q}),
        similarity(${lostItems.description}, ${q})
      )`;

      const foundSimilarityScore = sql<number>`GREATEST(
        similarity(${foundItems.title}, ${q}),
        similarity(${foundItems.description}, ${q})
      )`;

      const [lost, found] = await Promise.all([
        showLost
          ? db
              .select({
                id: lostItems.id,
                userId: lostItems.userId,
                title: lostItems.title,
                description: lostItems.description,
                category: lostItems.category,
                status: lostItems.status,
                lat: lostItems.lat,
                lng: lostItems.lng,
                lostAt: lostItems.lostAt,
                createdAt: lostItems.createdAt,
                updatedAt: lostItems.updatedAt,
                similarityScore: q ? lostSimilarityScore : sql<number>`0`,
              })
              .from(lostItems)
              .where(
                and(
                  statusFilter ? eq(lostItems.status, statusFilter) : undefined,
                  categoryFilter ? eq(lostItems.category, categoryFilter) : undefined,
                  textFilterLost,
                ),
              )
              .orderBy(
                ...(q
                  ? [desc(lostSimilarityScore), desc(lostItems.createdAt)]
                  : [desc(lostItems.createdAt)]),
              )
              .limit(limit + offset)
          : Promise.resolve([]),
        showFound
          ? db
              .select({
                id: foundItems.id,
                userId: foundItems.userId,
                title: foundItems.title,
                description: foundItems.description,
                category: foundItems.category,
                status: foundItems.status,
                lat: foundItems.lat,
                lng: foundItems.lng,
                foundAt: foundItems.foundAt,
                createdAt: foundItems.createdAt,
                updatedAt: foundItems.updatedAt,
                similarityScore: q ? foundSimilarityScore : sql<number>`0`,
              })
              .from(foundItems)
              .where(
                and(
                  statusFilter ? eq(foundItems.status, statusFilter) : undefined,
                  categoryFilter ? eq(foundItems.category, categoryFilter) : undefined,
                  textFilterFound,
                ),
              )
              .orderBy(
                ...(q
                  ? [desc(foundSimilarityScore), desc(foundItems.createdAt)]
                  : [desc(foundItems.createdAt)]),
              )
              .limit(limit + offset)
          : Promise.resolve([]),
      ]);
      lostResults = lost;
      foundResults = found;
    } catch {
      const plainFilterLost = q ? or(...lostVariantConditions) : undefined;
      const plainFilterFound = q ? or(...foundVariantConditions) : undefined;

      const [lostFallback, foundFallback] = await Promise.all([
        showLost
          ? db
              .select({
                id: lostItems.id,
                userId: lostItems.userId,
                title: lostItems.title,
                description: lostItems.description,
                category: lostItems.category,
                status: lostItems.status,
                lat: lostItems.lat,
                lng: lostItems.lng,
                lostAt: lostItems.lostAt,
                createdAt: lostItems.createdAt,
                updatedAt: lostItems.updatedAt,
                similarityScore: sql<number>`0`,
              })
              .from(lostItems)
              .where(
                and(
                  statusFilter ? eq(lostItems.status, statusFilter) : undefined,
                  categoryFilter ? eq(lostItems.category, categoryFilter) : undefined,
                  plainFilterLost,
                ),
              )
              .orderBy(desc(lostItems.createdAt))
              .limit(limit + offset)
          : Promise.resolve([]),
        showFound
          ? db
              .select({
                id: foundItems.id,
                userId: foundItems.userId,
                title: foundItems.title,
                description: foundItems.description,
                category: foundItems.category,
                status: foundItems.status,
                lat: foundItems.lat,
                lng: foundItems.lng,
                foundAt: foundItems.foundAt,
                createdAt: foundItems.createdAt,
                updatedAt: foundItems.updatedAt,
                similarityScore: sql<number>`0`,
              })
              .from(foundItems)
              .where(
                and(
                  statusFilter ? eq(foundItems.status, statusFilter) : undefined,
                  categoryFilter ? eq(foundItems.category, categoryFilter) : undefined,
                  plainFilterFound,
                ),
              )
              .orderBy(desc(foundItems.createdAt))
              .limit(limit + offset)
          : Promise.resolve([]),
      ]);
      lostResults = lostFallback;
      foundResults = foundFallback;
    }

    const combined = [
      ...lostResults.map((item) => ({
        ...item,
        type: "lost" as const,
        date: item.lostAt ?? item.createdAt,
      })),
      ...foundResults.map((item) => ({
        ...item,
        type: "found" as const,
        date: item.foundAt ?? item.createdAt,
      })),
    ].sort((a, b) => {
      if (q) {
        const scoreDifference = Number(b.similarityScore) - Number(a.similarityScore);
        if (scoreDifference !== 0) return scoreDifference;
      }
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    const paginated = combined.slice(offset, offset + limit);

    const lostIds = paginated.filter((i) => i.type === "lost").map((i) => i.id);
    const foundIds = paginated.filter((i) => i.type === "found").map((i) => i.id);

    const mediaList =
      lostIds.length > 0 || foundIds.length > 0
        ? await db
            .select({
              lostItemId: itemMedia.lostItemId,
              foundItemId: itemMedia.foundItemId,
              path: itemMedia.path,
              mime: itemMedia.mime,
            })
            .from(itemMedia)
            .where(
              or(
                lostIds.length > 0 ? inArray(itemMedia.lostItemId, lostIds) : undefined,
                foundIds.length > 0 ? inArray(itemMedia.foundItemId, foundIds) : undefined,
              ),
            )
        : [];

    const mediaMap = new Map<string, string[]>();
    for (const m of mediaList) {
      const parentId = m.lostItemId || m.foundItemId;
      if (!parentId) continue;
      const current = mediaMap.get(parentId) || [];
      current.push(m.path);
      mediaMap.set(parentId, current);
    }

    const results = paginated.map((item) => ({
      ...item,
      images: mediaMap.get(item.id) || [],
    }));

    return NextResponse.json({
      items: results,
      total: combined.length,
      limit,
      offset,
    });
  } catch (error) {
    console.error("[ITEMS_SEARCH_API_ERROR]", error);
    return NextResponse.json({ error: "فشل البحث في العناصر" }, { status: 500 });
  }
}
