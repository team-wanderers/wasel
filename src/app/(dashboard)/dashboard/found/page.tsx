import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/db";
import { foundItems } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

const categoryLabels: Record<string, string> = {
  documents: "وثائق", electronics: "إلكترونيات", keys: "مفاتيح",
  bags: "حقائب", jewelry: "مجوهرات", pets: "حيوانات", other: "أخرى",
};

export default async function FoundItemsPage() {
  const user = await requireUser();

  const items = await db
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
    .where(eq(foundItems.userId, user.id))
    .orderBy(desc(foundItems.createdAt));

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">الغرض الذي وجدته</h1>
        <Link href="/dashboard/found/new" className="btn btn-primary">
          + إضافة غرض وجدته
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "var(--space-12)" }}>
          <p style={{ fontSize: "var(--font-size-lg)", color: "var(--color-text-muted)", marginBottom: "var(--space-6)" }}>
            لم تُضف أي غرض وجدته حتى الآن
          </p>
          <Link href="/dashboard/found/new" className="btn btn-primary">
            أضف غرضاً وجدته
          </Link>
        </div>
      ) : (
        <div className="grid-cards">
          {items.map((item) => (
            <div key={item.id} className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "var(--space-3)" }}>
                <span className={`badge badge-${item.status}`}>
                  {{ open: "مفتوح", matched: "مطابَق", claimed: "مطالَب", recovered: "مُسترجَع", closed: "مغلق" }[item.status]}
                </span>
                <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>
                  {categoryLabels[item.category] ?? item.category}
                </span>
              </div>
              <h2 style={{ fontSize: "var(--font-size-lg)", fontWeight: 600, marginBottom: "var(--space-2)" }}>
                {item.title}
              </h2>
              <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)", marginBottom: "var(--space-4)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                {item.description}
              </p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>
                  {item.foundAt
                    ? new Date(item.foundAt).toLocaleDateString("ar-YE")
                    : new Date(item.createdAt).toLocaleDateString("ar-YE")}
                </span>
                {item.status === "open" && (
                  <Link href={`/dashboard/found/${item.id}/edit`} className="btn btn-ghost btn-sm">
                    تعديل
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
