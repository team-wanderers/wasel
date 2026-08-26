import { requireAdmin } from "@/lib/auth";
import Link from "next/link";
import { headers } from "next/headers";

const adminLinks = [
  { href: "/admin", label: "لوحة الإحصائيات والمؤشرات" },
  { href: "/admin/pickup-points", label: "نقاط الأمانة والاستلام" },
  { href: "/dashboard", label: "لوحة المستخدم الشخصية ←" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdmin();
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "";

  return (
    <>
      <nav className="navbar">
        <div className="container navbar-inner">
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
            <Link href="/admin" className="navbar-logo">
              واصل — الإدارة
            </Link>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                background: "hsl(215,90%,94%)",
                color: "hsl(215,90%,35%)",
                padding: "2px 8px",
                borderRadius: "var(--radius-full)",
              }}
            >
              مشرف النظام
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
            <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" }}>
              مرحباً، {admin.name}
            </span>
            <form action="/api/auth/logout" method="POST">
              <button type="submit" className="btn btn-ghost btn-sm">خروج</button>
            </form>
          </div>
        </div>
      </nav>

      <div className="dashboard-layout container" style={{ maxWidth: "1200px" }}>
        <aside className="sidebar">
          {adminLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="sidebar-link"
              style={{
                fontWeight: pathname === link.href ? 700 : undefined,
                background: pathname === link.href ? "var(--color-primary-light)" : undefined,
              }}
            >
              <span>{link.label}</span>
            </Link>
          ))}
        </aside>
        <main className="main-content">{children}</main>
      </div>
    </>
  );
}
