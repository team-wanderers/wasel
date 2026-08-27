import { db } from "@/db";
import { itemMedia } from "@/db/schema";
import { inArray } from "drizzle-orm";
import { mediaSrc } from "./labels";

export async function getFirstMediaMap(
  ids: string[],
  type: "lost" | "found",
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (ids.length === 0) return map;

  const rows =
    type === "lost"
      ? await db
          .select({
            itemId: itemMedia.lostItemId,
            path: itemMedia.path,
          })
          .from(itemMedia)
          .where(inArray(itemMedia.lostItemId, ids))
      : await db
          .select({
            itemId: itemMedia.foundItemId,
            path: itemMedia.path,
          })
          .from(itemMedia)
          .where(inArray(itemMedia.foundItemId, ids));

  for (const row of rows) {
    if (row.itemId && !map.has(row.itemId)) {
      map.set(row.itemId, mediaSrc(row.path));
    }
  }
  return map;
}
