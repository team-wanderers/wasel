import Link from "next/link";
import { requireUser } from "@/lib/auth";

const navLinks = [
  { href: "/dashboard", label: "الرئيسية", icon: "🏠" },
  { href: "/dashboard/lost", label: "مفقوداتي", icon: "📋" },
  { href: "/dashboard/found", label: "ما وجدته", icon: "🔍" },
  { href: "/dashboard/matches", label: "المطابقات", icon: "🔗" },
  { href: "/dashboard/claims", label: "مطالباتي", icon: "📝" },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <>
      <nav className="navbar">
        <div className="container navbar-inner">
          <Link href="/" className="navbar-logo">واصل</Link>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
            <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" }}>
              مرحباً، {user.name}
            </span>
            <form action="/api/auth/logout" method="POST">
              <button type="submit" className="btn btn-ghost btn-sm">خروج</button>
            </form>
          </div>
        </div>
      </nav>

      <div className="dashboard-layout container" style={{ maxWidth: "1200px" }}>
        <aside className="sidebar">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="sidebar-link">
              <span>{link.icon}</span>
              <span>{link.label}</span>
            </Link>
          ))}
        </aside>
        <main className="main-content">{children}</main>
      </div>
    </>
  );
}
