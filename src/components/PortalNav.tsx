"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconFileText,
  IconHome,
  IconInfo,
  IconBell,
  IconPlus,
  IconSearch,
} from "@/components/icons";

export default function PortalNav({ signedIn }: { signedIn: boolean }) {
  const pathname = usePathname();
  const authHref = (href: string) => (signedIn ? href : "/login");

  const items = [
    { href: "/home", label: "الرئيسية", icon: <IconHome size={21} />, match: (p: string) => p === "/home" || p === "/" },
    { href: authHref("/dashboard/report"), label: "بلاغ جديد", icon: <IconPlus size={21} />, match: (p: string) => p.startsWith("/dashboard/report") },
    { href: "/search", label: "تصفح العناصر", icon: <IconSearch size={21} />, match: (p: string) => p.startsWith("/search") || p.startsWith("/items") },
    { href: authHref("/dashboard"), label: "تقاريري", icon: <IconFileText size={21} />, match: (p: string) => p === "/dashboard" || p.startsWith("/dashboard/matches") || p.startsWith("/dashboard/claims") || p.startsWith("/dashboard/recoveries") || p.startsWith("/dashboard/items") || p.startsWith("/dashboard/lost") || p.startsWith("/dashboard/found") },
    { href: authHref("/dashboard/notifications"), label: "الإشعارات", icon: <IconBell size={21} />, match: (p: string) => p.startsWith("/dashboard/notifications") },
    { href: "/about", label: "عن الخدمة", icon: <IconInfo size={21} />, match: (p: string) => p.startsWith("/about") },
  ];

  return (
    <nav className="portal-nav">
      {items.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          className={item.match(pathname) ? "is-active" : undefined}
        >
          {item.icon}
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
