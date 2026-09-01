import type { ReactNode } from "react";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import PortalNav from "@/components/PortalNav";
import BrandLogo from "@/components/BrandLogo";
import UserMenu from "@/components/UserMenu";
import NotificationBell from "@/components/NotificationBell";
import {
  IconBell,
  IconGlobe,
  IconMenu,
  IconShield,
  IconUser,
} from "@/components/icons";

export default async function PortalChrome({ children }: { children: ReactNode }) {
  const session = await getSession();

  return (
    <div className="portal">
      <input id="portal-nav" type="checkbox" className="portal-nav-toggle" />

      <aside className="portal-side">
        <div className="flex items-center justify-between p-4 border-b border-neutral-200 md:hidden">
          <span className="font-bold text-lg text-neutral-800">القائمة</span>
          <label
            htmlFor="portal-nav"
            style={{ display: "inline-flex" }}
            className="p-2 rounded-full bg-neutral-100 text-neutral-900 hover:bg-neutral-200 cursor-pointer"
            aria-label="رجوع"
          >
            <span className="text-xl leading-none">←</span>
          </label>
        </div>
        <div className="hidden md:flex items-center justify-between w-full px-4 pt-6">
          <Link href="/home" className="portal-brand">
            <BrandLogo size={44} className="portal-logo" />
            <span>
              <strong>واصل</strong>
              <small>خدمة محلية</small>
            </span>
          </Link>
        </div>
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
            <label htmlFor="portal-nav" className="portal-icon-btn portal-menu-btn md:hidden">
              <IconMenu size={21} />
              <span className="sr-only">القائمة</span>
            </label>
            <span className="portal-lang">
              <IconGlobe size={21} />
              العربية
            </span>
            {session ? (
              <NotificationBell />
            ) : (
              <Link href="/login" className="portal-icon-btn">
                <IconBell size={21} />
                <span className="sr-only">الإشعارات</span>
              </Link>
            )}
          </div>
          <div className="portal-top-end">
            {session ? (
              <UserMenu name={session.name} email={session.email} image={session.image} />
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
