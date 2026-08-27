import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "البحث في المفقودات والموجودات",
  description:
    "ابحث عن المفقودات والموجودات في عتق ومحافظة شبوة: محافظ، هواتف، مفاتيح، وثائق والمزيد.",
  keywords: [
    "بحث مفقودات",
    "بحث موجودات",
    "مفقودات عتق",
    "مفقودات شبوة",
    "محفظة مفقودة",
    "هاتف مفقود",
  ],
};

export default function SearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
