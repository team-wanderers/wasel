import { requireUser } from "@/lib/auth";
import { db } from "@/db";
import { matches, lostItems, foundItems } from "@/db/schema";
import { eq, or } from "drizzle-orm";

export default async function MatchesPage() {
  const user = await requireUser();

  // جلب المطابقات المرتبطة ببلاغات المستخدم
  const userMatches = await db
    .select({
      id: matches.id,
      score: matches.score,
      status: matches.status,
      createdAt: matches.createdAt,
      lostTitle: lostItems.title,
      lostId: lostItems.id,
      foundTitle: foundItems.title,
      foundId: foundItems.id,
    })
    .from(matches)
    .innerJoin(lostItems, eq(matches.lostItemId, lostItems.id))
    .innerJoin(foundItems, eq(matches.foundItemId, foundItems.id))
    .where(
      or(eq(lostItems.userId, user.id), eq(foundItems.userId, user.id)),
    )
    .orderBy(matches.createdAt);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">المطابقات المقترحة</h1>
      </div>

      {userMatches.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "var(--space-12)" }}>
          <p style={{ fontSize: "var(--font-size-lg)", color: "var(--color-text-muted)", marginBottom: "var(--space-4)" }}>
            لا توجد مطابقات حتى الآن
          </p>
          <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)" }}>
            سيتم إشعارك فور وجود تطابق لبلاغاتك
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          {userMatches.map((m) => (
            <div key={m.id} className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "var(--space-4)" }}>
                <div>
                  <span className={`badge badge-${m.status}`} style={{ marginBottom: "var(--space-2)" }}>
                    {{ suggested: "مقترح", accepted: "مقبول", rejected: "مرفوض", expired: "منتهي" }[m.status]}
                  </span>
                  <div style={{ display: "flex", gap: "var(--space-4)", alignItems: "center", marginTop: "var(--space-2)" }}>
                    <span style={{ fontWeight: 600 }}>مفقود: {m.lostTitle}</span>
                    <span style={{ color: "var(--color-text-muted)" }}>↔</span>
                    <span style={{ fontWeight: 600 }}>موجود: {m.foundTitle}</span>
                  </div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{
                    fontSize: "var(--font-size-2xl)", fontWeight: 700,
                    color: m.score >= 0.65 ? "var(--color-success)" : "var(--color-warning)",
                  }}>
                    {Math.round(m.score * 100)}%
                  </div>
                  <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>تطابق</div>
                </div>
              </div>
              {m.status === "suggested" && (
                <div style={{ display: "flex", gap: "var(--space-3)" }}>
                  <button className="btn btn-primary btn-sm">قبول والتحقق</button>
                  <button className="btn btn-ghost btn-sm">رفض</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
