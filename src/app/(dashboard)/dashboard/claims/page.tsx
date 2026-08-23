import { requireUser } from "@/lib/auth";
import { db } from "@/db";
import { claims, lostItems, foundItems } from "@/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";

const statusDisplay: Record<string, { label: string; color: string; bg: string }> = {
  pending:   { label: "قيد المراجعة",        color: "hsl(200,60%,30%)", bg: "hsl(200,60%,92%)" },
  verified:  { label: "مثبَّت",               color: "hsl(142,60%,25%)", bg: "var(--color-success-light)" },
  rejected:  { label: "مرفوض",               color: "hsl(0,65%,35%)",   bg: "var(--color-danger-light)" },
  cancelled: { label: "ملغى",                color: "var(--color-text-muted)", bg: "var(--color-bg-secondary)" },
};

export default async function ClaimsPage() {
  const user = await requireUser();

  const rows = await db
    .select({
      id: claims.id,
      status: claims.status,
      proofDescription: claims.proofDescription,
      verificationNotes: claims.verificationNotes,
      createdAt: claims.createdAt,
      lostTitle: lostItems.title,
      lostId: lostItems.id,
      foundTitle: foundItems.title,
      foundId: foundItems.id,
    })
    .from(claims)
    .leftJoin(lostItems, eq(claims.lostItemId, lostItems.id))
    .leftJoin(foundItems, eq(claims.foundItemId, foundItems.id))
    .where(eq(claims.claimantId, user.id))
    .orderBy(claims.createdAt);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">مطالباتي</h1>
      </div>

      {rows.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "var(--space-12)" }}>
          <p style={{ fontSize: "var(--font-size-lg)", color: "var(--color-text-muted)", marginBottom: "var(--space-4)" }}>
            لا توجد مطالبات حتى الآن
          </p>
          <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)", marginBottom: "var(--space-6)" }}>
            عند العثور على غرضك أو تقديم دليل ملكية، ستظهر مطالبتك وحالتها هنا
          </p>
          <Link href="/search" className="btn btn-primary">
            ابحث في المعثورات والمفقودات
          </Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          {rows.map((row) => {
            const s = statusDisplay[row.status] ?? statusDisplay.pending;
            const itemTitle = row.foundTitle ?? row.lostTitle ?? "غرض غير محدد";
            const itemType = row.foundId ? "found" : "lost";
            const itemId = row.foundId ?? row.lostId;

            return (
              <div key={row.id} className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "var(--space-3)", marginBottom: "var(--space-3)" }}>
                  <div>
                    <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>
                      مطالبة على {row.foundId ? "معثور عليه" : "مفقود"}:
                    </span>
                    <div style={{ fontSize: "var(--font-size-base)", fontWeight: 600, marginTop: "var(--space-1)" }}>
                      {itemTitle}
                    </div>
                  </div>
                  <span
                    style={{
                      padding: "var(--space-1) var(--space-3)",
                      borderRadius: "var(--radius-full)",
                      fontSize: "var(--font-size-xs)",
                      fontWeight: 600,
                      background: s.bg,
                      color: s.color,
                      border: `1px solid ${s.color}33`,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {s.label}
                  </span>
                </div>

                {row.proofDescription && (
                  <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)", marginBottom: "var(--space-3)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {row.proofDescription}
                  </p>
                )}

                {row.verificationNotes && (
                  <p style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", marginBottom: "var(--space-3)", padding: "var(--space-2) var(--space-3)", background: "var(--color-bg-secondary)", borderRadius: "var(--radius-sm)" }}>
                    {row.verificationNotes}
                  </p>
                )}

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "var(--space-2)", flexWrap: "wrap", gap: "var(--space-2)" }}>
                  <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>
                    {new Date(row.createdAt).toLocaleDateString("ar-YE", { year: "numeric", month: "long", day: "numeric" })}
                  </span>
                  <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
                    {row.status === "verified" && (
                      <Link href="/dashboard/recoveries" className="btn btn-primary btn-sm">
                        جدولة الاستلام
                      </Link>
                    )}
                    {itemId && (
                      <Link href={`/items/${itemType}/${itemId}`} className="btn btn-ghost btn-sm">
                        عرض تفاصيل الغرض
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
