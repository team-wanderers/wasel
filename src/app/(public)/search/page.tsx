import Link from "next/link";
import { db } from "@/db";
import { lostItems, foundItems } from "@/db/schema";
import { eq, or, ilike, and } from "drizzle-orm";
import { categoryLabels, formatRelativeAr, searchCategories } from "@/lib/labels";
import { getFirstMediaMap } from "@/lib/media";
import ItemCard from "@/components/ItemCard";
import { IconSearch } from "@/components/icons";

const statusOptions = [
  { value: "all", label: "الكل" },
  { value: "open", label: "مفتوح" },
  { value: "matched", label: "مطابَق" },
  { value: "claimed", label: "مطالَب" },
  { value: "recovered", label: "مُسترجَع" },
  { value: "closed", label: "مغلق" },
];

type ItemCategory = "documents" | "electronics" | "keys" | "bags" | "jewelry" | "pets" | "other";
type ItemStatus = "open" | "matched" | "claimed" | "recovered" | "closed";

type SearchParams = { q?: string; category?: string; type?: string; status?: string };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { q, category, type, status } = await searchParams;

  const textFilterLost = q
    ? or(ilike(lostItems.title, `%${q}%`), ilike(lostItems.description, `%${q}%`))
    : undefined;

  const textFilterFound = q
    ? or(ilike(foundItems.title, `%${q}%`), ilike(foundItems.description, `%${q}%`))
    : undefined;

  const showLost = !type || type === "lost";
  const showFound = !type || type === "found";

  const validStatuses: ItemStatus[] = ["open", "matched", "claimed", "recovered", "closed"];

  const effectiveStatus =
    status && (status === "all" || validStatuses.includes(status as ItemStatus))
      ? status
      : "open";

  const statusFilter = effectiveStatus === "all" ? undefined : (effectiveStatus as ItemStatus);

  const validCategories: ItemCategory[] = [
    "documents",
    "electronics",
    "keys",
    "bags",
    "jewelry",
    "pets",
    "other",
  ];
  const categoryFilter =
    category && validCategories.includes(category as ItemCategory)
      ? (category as ItemCategory)
      : undefined;

  const [lostResults, foundResults] = await Promise.all([
    showLost
      ? db
          .select({
            id: lostItems.id,
            title: lostItems.title,
            description: lostItems.description,
            category: lostItems.category,
            status: lostItems.status,
            lostAt: lostItems.lostAt,
            createdAt: lostItems.createdAt,
          })
          .from(lostItems)
          .where(
            and(
              statusFilter ? eq(lostItems.status, statusFilter) : undefined,
              categoryFilter ? eq(lostItems.category, categoryFilter) : undefined,
              textFilterLost,
            ),
          )
          .limit(50)
      : Promise.resolve([]),
    showFound
      ? db
          .select({
            id: foundItems.id,
            title: foundItems.title,
            description: foundItems.description,
            category: foundItems.category,
            status: foundItems.status,
            foundAt: foundItems.foundAt,
            createdAt: foundItems.createdAt,
          })
          .from(foundItems)
          .where(
            and(
              statusFilter ? eq(foundItems.status, statusFilter) : undefined,
              categoryFilter ? eq(foundItems.category, categoryFilter) : undefined,
              textFilterFound,
            ),
          )
          .limit(50)
      : Promise.resolve([]),
  ]);

  const allResults = [
    ...lostResults.map((r) => ({ ...r, itemType: "lost" as const, date: r.lostAt ?? r.createdAt })),
    ...foundResults.map((r) => ({ ...r, itemType: "found" as const, date: r.foundAt ?? r.createdAt })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const lostIds: string[] = [];
  const foundIds: string[] = [];
  for (const item of allResults) {
    if (item.itemType === "lost") lostIds.push(item.id);
    else foundIds.push(item.id);
  }

  const [lostMedia, foundMedia] = await Promise.all([
    getFirstMediaMap(lostIds, "lost"),
    getFirstMediaMap(foundIds, "found"),
  ]);

  function buildUrl(overrides: Partial<Record<string, string>>) {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (type) p.set("type", type);
    if (category) p.set("category", category);
    if (status && status !== "open") p.set("status", status);

    Object.entries(overrides).forEach(([k, v]) => {
      if (!v || (k === "status" && v === "open")) {
        p.delete(k);
      } else {
        p.set(k, v);
      }
    });

    const str = p.toString();
    return `/search${str ? `?${str}` : ""}`;
  }

  return (
    <div style={{ maxWidth: "1000px", width: "100%" }}>
      <h1 className="page-title">تصفح العناصر</h1>

      <form method="GET" className="portal-search is-static">
        <label className="portal-search-cat">
          <span className="sr-only">التصنيف</span>
          <select name="category" defaultValue={category ?? ""}>
            {searchCategories.map((c) => (
              <option key={c.value || "all"} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="portal-search-q">
          <span className="sr-only">عبارة البحث</span>
          <input
            name="q"
            type="search"
            placeholder="ابحث عن شيء (مثل: محفظة، هاتف، مفاتيح...)"
            defaultValue={q ?? ""}
          />
        </label>
        {type && <input type="hidden" name="type" value={type} />}
        {status && status !== "open" && <input type="hidden" name="status" value={status} />}
        <button type="submit" className="portal-btn portal-btn-solid">
          بحث
          <IconSearch size={16} />
        </button>
      </form>

      <div className="portal-filters">
        <div className="portal-filters-group">
          <span className="portal-filters-label">النوع</span>
          {[
            { value: "", label: "الكل" },
            { value: "lost", label: "مفقودات" },
            { value: "found", label: "موجودات" },
          ].map((t) => (
            <Link
              key={t.value || "type-all"}
              href={buildUrl({ type: t.value })}
              className={`portal-filter${(type ?? "") === t.value ? " is-active" : ""}`}
            >
              {t.label}
            </Link>
          ))}
        </div>
        <span className="portal-filters-sep" aria-hidden="true" />
        <div className="portal-filters-group">
          <span className="portal-filters-label">الحالة</span>
          {statusOptions.map((s) => (
            <Link
              key={s.value}
              href={buildUrl({ status: s.value })}
              className={`portal-filter${effectiveStatus === s.value ? " is-active" : ""}`}
            >
              {s.label}
            </Link>
          ))}
        </div>
      </div>

      <article className="portal-card">
        {allResults.length === 0 ? (
          <div className="portal-empty">
            <p>
              لا توجد بلاغات مطابقة
              {q ? ` لـ "${q}"` : ""}
            </p>
            <Link href="/dashboard/report" className="portal-btn portal-btn-solid">
              أضف بلاغ
            </Link>
          </div>
        ) : (
          <ul className="portal-latest">
            {allResults.map((item) => (
              <li key={`${item.itemType}-${item.id}`}>
                <ItemCard
                  href={`/items/${item.itemType}/${item.id}`}
                  title={item.title}
                  subtitle={
                    item.itemType === "found"
                      ? `وجد في: عتق · ${categoryLabels[item.category] ?? item.category}`
                      : `فُقد في: عتق · ${categoryLabels[item.category] ?? item.category}`
                  }
                  meta={formatRelativeAr(item.date)}
                  imageSrc={
                    item.itemType === "lost"
                      ? lostMedia.get(item.id)
                      : foundMedia.get(item.id)
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </article>
    </div>
  );
}
