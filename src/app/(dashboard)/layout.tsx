import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { eq, and, isNull, count } from "drizzle-orm";
import NotificationBell from "@/components/NotificationBell";
import { NotificationProvider } from "@/context/NotificationContext";

const navLinks = [
  { href: "/dashboard", label: "الرئيسية" },
  { href: "/dashboard/lost", label: "مفقوداتي" },
  { href: "/dashboard/found", label: "ما وجدته" },
  { href: "/dashboard/matches", label: "المطابقات" },
  { href: "/dashboard/claims", label: "مطالباتي" },
  {
    href: "/dashboard/recoveries",
    label: "الاستلام والتسليم",
  },
  {
    href: "/dashboard/notifications",
    label: "الإشعارات",
  },
  {
    href: "/dashboard/profile",
    label: "ملفي الشخصي",
  },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "";

  // جلب عدد الإشعارات غير المقروءة مبدئياً
  const [unreadRes] = await db
    .select({ count: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, user.id), isNull(notifications.readAt)));

  const initialUnreadCount = Number(unreadRes?.count ?? 0);

  return (
    <NotificationProvider initialUnreadCount={initialUnreadCount}>
      <nav className="navbar">
        <div className="container navbar-inner">
          <Link href="/" className="navbar-logo">
            واصل
          </Link>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-4)",
            }}
          >
            <NotificationBell />

            <Link
              href="/dashboard/profile"
              style={{
                fontSize: "var(--font-size-sm)",
                color: "var(--color-text-secondary)",
                textDecoration: "none",
              }}
            >
              مرحباً، {user.name || user.phone || "مستخدم واصل"}
            </Link>

            <form action="/api/auth/logout" method="POST">
              <button
                type="submit"
                className="btn btn-ghost btn-sm"
              >
                خروج
              </button>
            </form>
          </div>
        </div>
      </nav>

      <div
        className="dashboard-layout container"
        style={{ maxWidth: "1200px" }}
      >
        <aside className="sidebar">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="sidebar-link"
              style={{
                fontWeight:
                  pathname === link.href ? 700 : undefined,
                background:
                  pathname === link.href
                    ? "var(--color-primary-light)"
                    : undefined,
              }}
            >
              <span>{link.label}</span>
            </Link>
          ))}
        </aside>

        <main className="main-content">{children}</main>
      </div>
    </NotificationProvider>
  );
}
