import type { MetadataRoute } from "next";
import { db } from "@/db";
import { foundItems, lostItems } from "@/db/schema";
import { desc } from "drizzle-orm";
import { siteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

const staticRoutes: MetadataRoute.Sitemap = [
  { url: `${siteUrl}/home`, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
  { url: `${siteUrl}/search`, lastModified: new Date(), changeFrequency: "hourly", priority: 0.9 },
  { url: `${siteUrl}/about`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    const [lost, found] = await Promise.all([
      db
        .select({ id: lostItems.id, updated: lostItems.createdAt })
        .from(lostItems)
        .orderBy(desc(lostItems.createdAt))
        .limit(500),
      db
        .select({ id: foundItems.id, updated: foundItems.createdAt })
        .from(foundItems)
        .orderBy(desc(foundItems.createdAt))
        .limit(500),
    ]);

    return [
      ...staticRoutes,
      ...lost.map((row) => ({
        url: `${siteUrl}/items/lost/${row.id}`,
        lastModified: row.updated,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
      ...found.map((row) => ({
        url: `${siteUrl}/items/found/${row.id}`,
        lastModified: row.updated,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
    ];
  } catch {
    return staticRoutes;
  }
}
