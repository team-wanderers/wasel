import Link from "next/link";
import { getSession } from "@/lib/auth";

export default async function PublicNavbar() {
  const user = await getSession();

  return (
    <nav className="navbar">
      <div className="container navbar-inner">
        <Link href="/" className="navbar-logo">
          واصل
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
                <Link href="/login" className="btn btn-outline btn-sm">
                  دخول
                </Link>
              </li>
              <li>
                <Link href="/login" className="btn btn-primary btn-sm">
                  أبلِغ عن مفقود
                </Link>
              </li>
            </>
          )}
        </ul>
      </div>
    </nav>
  );
}
