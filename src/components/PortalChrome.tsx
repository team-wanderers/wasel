import type { ReactNode } from "react";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { and, count, eq, isNull } from "drizzle-orm";
import PortalNav from "@/components/PortalNav";
import {
  IconBell,
  IconGlobe,
  IconMapPin,
  IconMenu,
  IconShield,
  IconUser,
} from "@/components/icons";

export default async function PortalChrome({ children }: { children: ReactNode }) {
  const session = await getSession();

  let unread = 0;
  if (session) {
    const [row] = await db
      .select({ count: count() })
      .from(notifications)
      .where(and(eq(notifications.userId, session.id), isNull(notifications.readAt)));
    unread = Number(row?.count ?? 0);
  }

  return (
    <div className="portal">
      <input id="portal-nav" type="checkbox" className="portal-nav-toggle" />

      <aside className="portal-side">
        <Link href="/home" className="portal-brand">
          <span className="portal-pin" aria-hidden>
            <IconMapPin size={22} />
          </span>
          <span>
            <strong>واصل</strong>
            <small>خدمة محلية</small>
          </span>
        </Link>
        <PortalNav signedIn={Boolean(session)} />
        <div className="portal-trust">
          <IconShield size={22} />
          <div>
            <strong>آمنة. موثوقة. في خدمتك.</strong>
            <p>منصة لربط المفقودات بأصحابها في عتق ومحافظة شبوة.</p>
          </div>
        </div>
      </aside>

      <div className="portal-body">
        <header className="portal-top">
          <div className="portal-top-start">
            <label htmlFor="portal-nav" className="portal-icon-btn portal-menu-btn">
              <IconMenu size={21} />
              <span className="sr-only">القائمة</span>
            </label>
            <span className="portal-lang">
              <IconGlobe size={21} />
              العربية
            </span>
            <Link
              href={session ? "/dashboard/notifications" : "/login"}
              className="portal-icon-btn"
            >
              <IconBell size={21} />
              {unread > 0 && <span className="portal-badge">{unread > 99 ? "99+" : unread}</span>}
              <span className="sr-only">الإشعارات</span>
            </Link>
          </div>
          <div className="portal-top-end">
            {session ? (
              <>
                <Link href="/dashboard" className="portal-btn portal-btn-solid">
                  <IconUser size={21} />
                  لوحتي
                </Link>
                <form action="/api/auth/logout" method="POST">
                  <button type="submit" className="portal-btn portal-btn-ghost">
                    خروج
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link href="/login" className="portal-btn portal-btn-solid">
                  <IconUser size={21} />
                  تسجيل الدخول
                </Link>
                <Link href="/register" className="portal-btn portal-btn-ghost">
                  تسجيل حساب
                </Link>
              </>
            )}
          </div>
        </header>
        <label htmlFor="portal-nav" className="portal-backdrop" />
        <div className="portal-main">{children}</div>
      </div>
    </div>
  );
}
