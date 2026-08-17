import { requireAdmin } from "@/lib/auth";
import { db } from "@/db";
import { users, lostItems, foundItems, matches } from "@/db/schema";
import { count, eq } from "drizzle-orm";
import Link from "next/link";

export default async function AdminPage() {
  await requireAdmin();

  const [[usersCount], [lostCount], [foundCount], [matchCount]] =
    await Promise.all([
      db.select({ count: count() }).from(users),
      db.select({ count: count() }).from(lostItems).where(eq(lostItems.status, "open")),
      db.select({ count: count() }).from(foundItems).where(eq(foundItems.status, "open")),
      db.select({ count: count() }).from(matches).where(eq(matches.status, "suggested")),
    ]);

  const stats = [
    { label: "المستخدمون", value: usersCount.count, href: "/admin/users",        color: "var(--color-primary)" },
    { label: "مفقودات مفتوحة", value: lostCount.count,  href: "/admin/items",   color: "var(--color-danger)" },
    { label: "موجودات مفتوحة", value: foundCount.count, href: "/admin/items",   color: "var(--color-success)" },
    { label: "مطابقات معلَّقة", value: matchCount.count, href: "/admin/claims",  color: "var(--color-warning)" },
  ];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">لوحة الإدارة</h1>
        <form action="/api/match/run" method="POST">
          <button type="submit" className="btn btn-primary">▶ تشغيل محرك المطابقة</button>
        </form>
      </div>

      <div className="grid-cards">
        {stats.map((s) => (
          <Link key={s.href + s.label} href={s.href} style={{ textDecoration: "none" }}>
            <div className="card" style={{ borderTop: `3px solid ${s.color}` }}>
              <div style={{ fontSize: "var(--font-size-3xl)", fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ color: "var(--color-text-secondary)", marginTop: "var(--space-2)" }}>{s.label}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
