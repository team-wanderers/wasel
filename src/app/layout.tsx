import type { Metadata } from "next";
import {
  siteDescription,
  siteKeywords,
  siteName,
  siteTitle,
  siteUrl,
} from "@/lib/site";
import { MapKeyProvider } from "@/context/MapKeyContext";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteTitle,
    template: `%s | ${siteName}`,
  },
  description: siteDescription,
  applicationName: siteName,
  keywords: siteKeywords,
  authors: [{ name: siteName }],
  creator: siteName,
  publisher: siteName,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "ar_YE",
    url: siteUrl,
    siteName,
    title: siteTitle,
    description: siteDescription,
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      name: siteName,
      alternateName: ["Wasel", "منصة المفقودات والموجودات"],
      url: siteUrl,
      inLanguage: "ar",
      description: siteDescription,
      potentialAction: {
        "@type": "SearchAction",
        target: `${siteUrl}/search?q={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "Organization",
      name: siteName,
      alternateName: "Wasel",
      url: siteUrl,
      areaServed: {
        "@type": "AdministrativeArea",
        name: "عتق، محافظة شبوة، اليمن",
      },
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <MapKeyProvider apiKey={process.env.NEXT_PUBLIC_CARTO_API_KEY ?? ""}>
          {children}
        </MapKeyProvider>
      </body>
    </html>
  );
}
