import Link from "next/link";
import { db } from "@/db";
import { lostItems, foundItems } from "@/db/schema";
import { eq, or, ilike, and } from "drizzle-orm";
import PublicNavbar from "@/components/PublicNavbar";

const categoryLabels: Record<string, string> = {
  documents: "وثائق", electronics: "إلكترونيات", keys: "مفاتيح",
  bags: "حقائب", jewelry: "مجوهرات", pets: "حيوانات", other: "أخرى",
};

const categories = Object.entries(categoryLabels);

type SearchParams = { q?: string; category?: string; type?: string };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { q, category, type } = await searchParams;

  // بناء فلتر البحث النصي
  const textFilter = q
    ? or(
        ilike(lostItems.title, `%${q}%`),
        ilike(lostItems.description, `%${q}%`),
      )
    : undefined;

  const textFilterFound = q
    ? or(
        ilike(foundItems.title, `%${q}%`),
        ilike(foundItems.description, `%${q}%`),
      )
    : undefined;

  // جلب البلاغات — secretDetails محجوب صراحةً
  const showLost  = !type || type === "lost";
  const showFound = !type || type === "found";

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
              eq(lostItems.status, "open"),
              category ? eq(lostItems.category, category as "documents" | "electronics" | "keys" | "bags" | "jewelry" | "pets" | "other") : undefined,
              textFilter,
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
              eq(foundItems.status, "open"),
              category ? eq(foundItems.category, category as "documents" | "electronics" | "keys" | "bags" | "jewelry" | "pets" | "other") : undefined,
              textFilterFound,
            ),
          )
          .limit(50)
      : Promise.resolve([]),
  ]);

  const allResults = [
    ...lostResults.map((r) => ({ ...r, type: "lost" as const, date: r.lostAt ?? r.createdAt })),
    ...foundResults.map((r) => ({ ...r, type: "found" as const, date: r.foundAt ?? r.createdAt })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <>
      <PublicNavbar />
      <main>
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
              <input type="hidden" name="category" value={category ?? ""} />
              <input type="hidden" name="type" value={type ?? ""} />
              <button type="submit" className="btn btn-primary" style={{ background: "#fff", color: "var(--color-primary)" }}>
                بحث
              </button>
            </form>
          </div>
        </section>

        <div className="container" style={{ padding: "var(--space-8) var(--space-4)" }}>
          {/* Filters */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-3)", marginBottom: "var(--space-6)", alignItems: "center" }}>
            {/* نوع البلاغ */}
            <div style={{ display: "flex", gap: "var(--space-2)" }}>
              {[
                { value: "", label: "الكل" },
                { value: "lost", label: "مفقودات" },
                { value: "found", label: "موجودات" },
              ].map((t) => (
                <Link
                  key={t.value}
                  href={`/search?q=${q ?? ""}&category=${category ?? ""}&type=${t.value}`}
                  className={`btn btn-sm ${type === t.value || (!type && t.value === "") ? "btn-primary" : "btn-outline"}`}
                >
                  {t.label}
                </Link>
              ))}
            </div>

            {/* التصنيف */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
              <Link href={`/search?q=${q ?? ""}&type=${type ?? ""}`} className={`btn btn-sm ${!category ? "btn-primary" : "btn-ghost"}`}>
                الكل
              </Link>
              {categories.map(([value, label]) => (
                <Link
                  key={value}
                  href={`/search?q=${q ?? ""}&category=${value}&type=${type ?? ""}`}
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

          {/* Results grid */}
          {allResults.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: "var(--space-12)" }}>
              <p style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-lg)", marginBottom: "var(--space-6)" }}>
                لا توجد بلاغات مطابقة
              </p>
              <Link href="/login" className="btn btn-primary">
                أضف بلاغ مفقود
              </Link>
            </div>
          ) : (
            <div className="grid-cards">
              {allResults.map((item) => (
                <div key={`${item.type}-${item.id}`} className="card">
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "var(--space-3)" }}>
                    <span className={`badge ${item.type === "lost" ? "badge-open" : "badge-matched"}`}
                      style={{ background: item.type === "lost" ? "var(--color-danger-light)" : "var(--color-success-light)",
                               color: item.type === "lost" ? "hsl(0,65%,35%)" : "hsl(142,60%,25%)" }}>
                      {item.type === "lost" ? "مفقود" : "موجود"}
                    </span>
                    <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>
                      {categoryLabels[item.category] ?? item.category}
                    </span>
                  </div>
                  <h2 style={{ fontSize: "var(--font-size-base)", fontWeight: 600, marginBottom: "var(--space-2)" }}>
                    {item.title}
                  </h2>
                  <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)", marginBottom: "var(--space-4)",
                              display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {item.description}
                  </p>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>
                      {new Date(item.date).toLocaleDateString("ar-YE")}
                    </span>
                    <Link href={`/items/${item.type}/${item.id}`} className="btn btn-outline btn-sm">
                      عرض التفاصيل
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
