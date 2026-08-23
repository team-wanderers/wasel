import { requireAdmin } from "@/lib/auth";
import Link from "next/link";

const adminLinks = [
  { href: "/admin", label: "الرئيسية" },
  { href: "/admin/users", label: "المستخدمون" },
  { href: "/admin/items", label: "البلاغات" },
  { href: "/admin/pickup-points", label: "نقاط الأمانة" },
  { href: "/admin/claims", label: "المطالبات" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdmin();

  return (
    <>
      <nav className="navbar">
        <div className="container navbar-inner">
          <Link href="/admin" className="navbar-logo">
            واصل — الإدارة
          </Link>
          <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" }}>
            {admin.name}
          </span>
        </div>
      </nav>

      <div className="dashboard-layout container" style={{ maxWidth: "1200px" }}>
        <aside className="sidebar">
          {adminLinks.map((link) => (
            <Link key={link.href} href={link.href} className="sidebar-link">
              <span>{link.label}</span>
            </Link>
          ))}
        </aside>
        <main className="main-content">{children}</main>
      </div>
    </>
  );
}
