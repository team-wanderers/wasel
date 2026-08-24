import Link from "next/link";
import { getSession } from "@/lib/auth";

export default async function PublicNavbar() {
  const user = await getSession();

  return (
    <nav className="navbar">
      <div className="container navbar-inner">
        <Link href="/home" style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
          <span style={{ fontSize: "var(--font-size-xl)", fontWeight: 800, letterSpacing: "-0.02em", color: "var(--color-text-primary)" }}>
            WASEL
          </span>
          <span style={{ fontSize: "var(--font-size-xs)", fontWeight: 600, color: "var(--color-primary)" }}>
            واصل | منصة المفقودات والمعثورات
          </span>
        </Link>
        <ul className="navbar-nav">
          <li>
            <Link href="/search">البحث</Link>
          </li>
          {user ? (
            <>
              <li>
                <Link href="/dashboard">لوحتي</Link>
              </li>
              <li>
                <form action="/api/auth/logout" method="POST">
                  <button type="submit" className="btn btn-ghost btn-sm">
                    خروج
                  </button>
                </form>
              </li>
            </>
          ) : (
            <>
              <li>
                <Link href="/login" className="btn btn-ghost btn-sm">
                  تسجيل الدخول
                </Link>
              </li>
              <li>
                <Link href="/register" className="btn btn-primary btn-sm">
                  إنشاء حساب
                </Link>
              </li>
            </>
          )}
        </ul>
      </div>
    </nav>
  );
}
