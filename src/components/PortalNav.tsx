"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconFileText,
  IconHeart,
  IconHelp,
  IconHome,
  IconInfo,
  IconMapPin,
  IconMessage,
  IconPlus,
  IconSearch,
} from "@/components/icons";

export default function PortalNav({ signedIn }: { signedIn: boolean }) {
  const pathname = usePathname();
  const authHref = (href: string) => (signedIn ? href : "/login");

  const items = [
    { href: "/home", label: "الرئيسية", icon: <IconHome size={21} />, match: (p: string) => p === "/home" || p === "/" },
    { href: authHref("/dashboard/lost/new"), label: "الإبلاغ عن مفقود", icon: <IconPlus size={21} />, match: (p: string) => p.startsWith("/dashboard/lost") },
    { href: authHref("/dashboard/found/new"), label: "الإبلاغ عن موجود", icon: <IconPlus size={21} />, match: (p: string) => p.startsWith("/dashboard/found") },
    { href: "/search", label: "تصفح العناصر", icon: <IconSearch size={21} />, match: (p: string) => p.startsWith("/search") || p.startsWith("/items") },
    { href: authHref("/dashboard"), label: "تقاريري", icon: <IconFileText size={21} />, match: (p: string) => p === "/dashboard" || p.startsWith("/dashboard/matches") || p.startsWith("/dashboard/claims") || p.startsWith("/dashboard/recoveries") },
    { href: authHref("/dashboard/notifications"), label: "الرسائل", icon: <IconMessage size={21} />, match: (p: string) => p.startsWith("/dashboard/notifications") },
    { href: authHref("/dashboard/profile"), label: "المفضلة", icon: <IconHeart size={21} />, match: (p: string) => p.startsWith("/dashboard/profile") },
    { href: "/search", label: "المواقع", icon: <IconMapPin size={21} />, match: () => false },
    { href: "/home#faq", label: "الأسئلة الشائعة", icon: <IconHelp size={21} />, match: () => false },
    { href: "/home#about", label: "عن الخدمة", icon: <IconInfo size={21} />, match: () => false },
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
