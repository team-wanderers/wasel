import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/db";
import { lostItems, foundItems } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { categoryLabels, formatRelativeAr, statusLabels } from "@/lib/labels";
import { getFirstMediaMap } from "@/lib/media";
import ItemCard from "@/components/ItemCard";

type SearchParams = { type?: string };

export default async function DashboardItemsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireUser();
  const { type } = await searchParams;
  const showLost = !type || type === "lost";
  const showFound = !type || type === "found";

  const [lostRows, foundRows] = await Promise.all([
    showLost
      ? db
          .select({
            id: lostItems.id,
            title: lostItems.title,
            category: lostItems.category,
            status: lostItems.status,
            occurredAt: lostItems.lostAt,
            createdAt: lostItems.createdAt,
          })
          .from(lostItems)
          .where(eq(lostItems.userId, user.id))
          .orderBy(desc(lostItems.createdAt))
      : Promise.resolve([]),
    showFound
      ? db
          .select({
            id: foundItems.id,
            title: foundItems.title,
            category: foundItems.category,
            status: foundItems.status,
            occurredAt: foundItems.foundAt,
            createdAt: foundItems.createdAt,
          })
          .from(foundItems)
          .where(eq(foundItems.userId, user.id))
          .orderBy(desc(foundItems.createdAt))
      : Promise.resolve([]),
  ]);

  const items = [
    ...lostRows.map((item) => ({ ...item, itemType: "lost" as const })),
    ...foundRows.map((item) => ({ ...item, itemType: "found" as const })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const [lostMedia, foundMedia] = await Promise.all([
    getFirstMediaMap(
      items.filter((item) => item.itemType === "lost").map((item) => item.id),
      "lost",
    ),
    getFirstMediaMap(
      items.filter((item) => item.itemType === "found").map((item) => item.id),
      "found",
    ),
  ]);

  function buildUrl(nextType: string) {
    return nextType ? `/dashboard/items?type=${nextType}` : "/dashboard/items";
  }

  return (
    <div style={{ maxWidth: "1000px", width: "100%" }}>
      <div className="page-header">
        <h1 className="page-title">بلاغاتي</h1>
        <Link href="/dashboard/report" className="portal-btn portal-btn-solid">
          إضافة
        </Link>
      </div>

      <div className="portal-filters">
        {[
          { value: "", label: "الكل" },
          { value: "lost", label: "مفقودات" },
          { value: "found", label: "موجودات" },
        ].map((t) => (
          <Link
            key={t.value || "type-all"}
            href={buildUrl(t.value)}
            className={`portal-filter${(type ?? "") === t.value ? " is-active" : ""}`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="portal-card portal-empty">
          <p>
            {type === "found"
              ? "لم تُضف أي غرض وجدته حتى الآن"
              : type === "lost"
                ? "لا توجد بلاغات مفقودات حتى الآن"
                : "لا توجد بلاغات حتى الآن"}
          </p>
          <Link
            href={type === "lost" || type === "found" ? `/dashboard/report?type=${type}` : "/dashboard/report"}
            className="portal-btn portal-btn-solid"
          >
            أضف بلاغ
          </Link>
        </div>
      ) : (
        <div className="portal-card">
          <div className="stack-list">
            {items.map((item) => (
              <ItemCard
                key={`${item.itemType}-${item.id}`}
                href={`/items/${item.itemType}/${item.id}`}
                title={item.title}
                subtitle={`${item.itemType === "found" ? "موجود" : "مفقود"} · ${statusLabels[item.status] ?? item.status} · ${categoryLabels[item.category] ?? item.category}`}
                meta={formatRelativeAr(item.occurredAt ?? item.createdAt)}
                imageSrc={
                  item.itemType === "lost"
                    ? lostMedia.get(item.id)
                    : foundMedia.get(item.id)
                }
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
