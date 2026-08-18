import type { Metadata } from "next";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "واصل — نظام إدارة المفقودات",
  description:
    "منصة رقمية لربط أصحاب المفقودات بمن عثر عليها في مدينة عتق ومحافظة شبوة",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
