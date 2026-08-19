import Link from "next/link";
import { db } from "@/db";
import { lostItems, foundItems } from "@/db/schema";
import { eq, or, ilike, and } from "drizzle-orm";

const categoryLabels: Record<string, string> = {
  documents: "وثائق", electronics: "إلكترونيات", keys: "مفاتيح",
  bags: "حقائب", jewelry: "مجوهرات", pets: "حيوانات", other: "أخرى",
};

const categories = Object.entries(categoryLabels);

const statusOptions = [
  { value: "",          label: "جميع الحالات" },
  { value: "open",      label: "مفتوح" },
  { value: "matched",   label: "مطابَق" },
  { value: "claimed",   label: "مطالَب به" },
  { value: "recovered", label: "مُسترجَع" },
];

type ItemCategory = "documents" | "electronics" | "keys" | "bags" | "jewelry" | "pets" | "other";
type ItemStatus   = "open" | "matched" | "claimed" | "recovered" | "closed";

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

  const showLost  = !type || type === "lost";
  const showFound = !type || type === "found";

  const validStatuses: ItemStatus[] = ["open", "matched", "claimed", "recovered", "closed"];
  const statusFilter = status && validStatuses.includes(status as ItemStatus)
    ? status as ItemStatus
    : undefined;

  const validCategories: ItemCategory[] = ["documents", "electronics", "keys", "bags", "jewelry", "pets", "other"];
  const categoryFilter = category && validCategories.includes(category as ItemCategory)
    ? category as ItemCategory
    : undefined;

  const [lostResults, foundResults] = await Promise.all([
    showLost
      ? db
          .select({
            id: lostItems.id, title: lostItems.title, description: lostItems.description,
            category: lostItems.category, status: lostItems.status,
            lostAt: lostItems.lostAt, createdAt: lostItems.createdAt,
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
            id: foundItems.id, title: foundItems.title, description: foundItems.description,
            category: foundItems.category, status: foundItems.status,
            foundAt: foundItems.foundAt, createdAt: foundItems.createdAt,
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

  function buildUrl(overrides: Partial<Record<string, string>>) {
    const p = new URLSearchParams({
      ...(q        ? { q }        : {}),
      ...(type     ? { type }     : {}),
      ...(category ? { category } : {}),
      ...(status   ? { status }   : {}),
      ...overrides,
    });
    Object.keys(overrides).forEach((k) => { if (!overrides[k]) p.delete(k); });
    const str = p.toString();
    return `/search${str ? `?${str}` : ""}`;
  }

  return (
    <>
      {/* Hero Search */}
      <section style={{ background: "var(--color-primary)", padding: "var(--space-12) 0" }}>
        <div className="container">
          <h1 style={{ color: "#fff", fontSize: "var(--font-size-3xl)", fontWeight: 700, marginBottom: "var(--space-4)", textAlign: "center" }}>
            ابحث عن مفقودك أو بلاغ موجود
          </h1>
          <form method="GET" style={{ display: "flex", gap: "var(--space-3)", maxWidth: "600px", margin: "0 auto" }}>
            <input
              name="q" type="search" className="input"
              placeholder="ابحث بالكلمات..."
              defaultValue={q ?? ""}
              style={{ flex: 1, background: "#fff" }}
            />
            {category && <input type="hidden" name="category" value={category} />}
            {type     && <input type="hidden" name="type"     value={type} />}
            {status   && <input type="hidden" name="status"   value={status} />}
            <button type="submit" className="btn btn-primary" style={{ background: "#fff", color: "var(--color-primary)" }}>
              بحث
            </button>
          </form>
        </div>
      </section>

      <div className="container" style={{ padding: "var(--space-8) var(--space-4)" }}>
        {/* Filters Row */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", marginBottom: "var(--space-6)" }}>

          {/* نوع البلاغ */}
          <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)", minWidth: "60px" }}>النوع:</span>
            {[{ value: "", label: "الكل" }, { value: "lost", label: "مفقودات" }, { value: "found", label: "موجودات" }].map((t) => (
              <Link
                key={t.value}
                href={buildUrl({ type: t.value })}
                className={`btn btn-sm ${(type ?? "") === t.value ? "btn-primary" : "btn-outline"}`}
              >
                {t.label}
              </Link>
            ))}
          </div>

          {/* الحالة */}
          <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)", minWidth: "60px" }}>الحالة:</span>
            {statusOptions.map((s) => (
              <Link
                key={s.value}
                href={buildUrl({ status: s.value })}
                className={`btn btn-sm ${(status ?? "") === s.value ? "btn-primary" : "btn-ghost"}`}
              >
                {s.label}
              </Link>
            ))}
          </div>

          {/* التصنيف */}
          <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)", minWidth: "60px" }}>التصنيف:</span>
            <Link href={buildUrl({ category: "" })} className={`btn btn-sm ${!category ? "btn-primary" : "btn-ghost"}`}>
              الكل
            </Link>
            {categories.map(([value, label]) => (
              <Link
                key={value}
                href={buildUrl({ category: value })}
                className={`btn btn-sm ${category === value ? "btn-primary" : "btn-ghost"}`}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>

        {/* Results count */}
        <p style={{ color: "var(--color-text-secondary)", marginBottom: "var(--space-6)", fontSize: "var(--font-size-sm)" }}>
          {allResults.length === 0 ? "لا توجد نتائج" : `${allResults.length} نتيجة`}
          {q && ` لـ "${q}"`}
        </p>

        {/* Results */}
        {allResults.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "var(--space-12)" }}>
            <p style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-lg)", marginBottom: "var(--space-6)" }}>
              لا توجد بلاغات مطابقة
            </p>
            <Link href="/login" className="btn btn-primary">أضف بلاغ مفقود</Link>
          </div>
        ) : (
          <div className="grid-cards">
            {allResults.map((item) => (
              <div key={`${item.itemType}-${item.id}`} className="card">
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "var(--space-3)", flexWrap: "wrap", gap: "var(--space-2)" }}>
                  <div style={{ display: "flex", gap: "var(--space-2)" }}>
                    <span
                      style={{
                        padding: "var(--space-1) var(--space-2)", borderRadius: "var(--radius-full)",
                        fontSize: "var(--font-size-xs)", fontWeight: 600,
                        background: item.itemType === "lost" ? "var(--color-danger-light)" : "var(--color-success-light)",
                        color: item.itemType === "lost" ? "hsl(0,65%,35%)" : "hsl(142,60%,25%)",
                      }}
                    >
                      {item.itemType === "lost" ? "مفقود" : "موجود"}
                    </span>
                    <span style={{ padding: "var(--space-1) var(--space-2)", borderRadius: "var(--radius-full)", fontSize: "var(--font-size-xs)", background: "var(--color-bg-secondary)", color: "var(--color-text-secondary)" }}>
                      {{ open: "مفتوح", matched: "مطابَق", claimed: "مطالَب", recovered: "مُسترجَع", closed: "مغلق" }[item.status]}
                    </span>
                  </div>
                  <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>
                    {categoryLabels[item.category] ?? item.category}
                  </span>
                </div>
                <h2 style={{ fontSize: "var(--font-size-base)", fontWeight: 600, marginBottom: "var(--space-2)" }}>{item.title}</h2>
                <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)", marginBottom: "var(--space-4)",
                            display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {item.description}
                </p>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>
                    {new Date(item.date).toLocaleDateString("ar-YE")}
                  </span>
                  <Link href={`/items/${item.itemType}/${item.id}`} className="btn btn-outline btn-sm">
                    عرض التفاصيل
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
