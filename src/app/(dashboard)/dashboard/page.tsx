import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/db";
import { lostItems, foundItems } from "@/db/schema";
import { eq, count } from "drizzle-orm";

export default async function DashboardHomePage() {
  const user = await requireUser();

  const [lostCount] = await db
    .select({ count: count() })
    .from(lostItems)
    .where(eq(lostItems.userId, user.id));

  const [foundCount] = await db
    .select({ count: count() })
    .from(foundItems)
    .where(eq(foundItems.userId, user.id));

  const stats = [
    { label: "بلاغات المفقودات", value: lostCount.count, href: "/dashboard/lost", color: "var(--color-danger)" },
    { label: "بلاغات الموجودات", value: foundCount.count, href: "/dashboard/found", color: "var(--color-success)" },
  ];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">لوحة التحكم</h1>
      </div>

      <div className="grid-cards" style={{ marginBottom: "var(--space-8)" }}>
        {stats.map((s) => (
          <Link key={s.href} href={s.href} style={{ textDecoration: "none" }}>
            <div className="card" style={{ borderTop: `3px solid ${s.color}` }}>
              <div style={{ fontSize: "var(--font-size-3xl)", fontWeight: 700, color: s.color }}>
                {s.value}
              </div>
              <div style={{ color: "var(--color-text-secondary)", marginTop: "var(--space-2)" }}>
                {s.label}
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div style={{ display: "flex", gap: "var(--space-4)", flexWrap: "wrap" }}>
        <Link href="/dashboard/lost/new" className="btn btn-primary">
          + أبلِغ عن مفقود
        </Link>
        <Link href="/dashboard/found/new" className="btn btn-outline">
          + سلِّم غرضاً وجدته
        </Link>
        <Link href="/search" className="btn btn-ghost">
          البحث العام
        </Link>
      </div>
    </div>
  );
}
