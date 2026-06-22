import type { Metadata } from "next";

import Script from "next/script";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { company, siteUrl } from "@/content/site";
import { SocialSidebar } from "@/components/social-sidebar";
import { localBusinessJsonLd } from "@/lib/seo";
import "./globals.css";

const manrope = {
  variable: "manrope_b757649e-module__VxvIbG__className",
  className: "",
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${company.name}, корпоративное питание`,
    template: `%s | ${company.name}`,
  },
  description: "Корпоративное питание в Москве и Московской области. Доставка обедов в офисы, на стройки, склады, производства. Собственное производство, HACCP, своя логистика.",
  openGraph: {
    title: `${company.name}, корпоративное питание`,
    description: "Корпоративное питание в Москве и МО. Доставка обедов в офисы, стройки, склады.",
    siteName: company.name,
    locale: "ru_RU",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: `${company.name}, корпоративное питание`,
    description: "Корпоративное питание в Москве и МО.",
  },
  icons: {
    icon: "/favicon.png",
    apple: "/apple-touch-icon.png",
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <head>
        <meta name="yandex-verification" content="0dd75689c0c28081" />
      </head>
      <body className={`${manrope.variable} ${manrope.className} bg-slate-50 text-slate-950 antialiased`}>
        <nav aria-label="Skip links">
          <a href="#main-content" className="sr-only focus:not-sr-only">Перейти к содержанию</a>
        </nav>
        <Header />
        <SocialSidebar />
        <main id="main-content">{children}</main>
        <Footer />
        <Script
          id="ld-json-local-business"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd) }}
        />
        <Script id="og-fallback">
          {`if(!document.head.querySelector('[property="og:title"]')){
            var t=document.createElement('meta');t.setAttribute('property','og:title');t.setAttribute('content','Gastroprime, корпоративное питание');document.head.appendChild(t);
            var d=document.createElement('meta');d.setAttribute('property','og:description');d.setAttribute('content','Корпоративное питание в Москве и МО');document.head.appendChild(d);
            var s=document.createElement('meta');s.setAttribute('property','og:site_name');s.setAttribute('content','Gastroprime');document.head.appendChild(s);
          }`}
        </Script>
      </body>
    </html>
  );
}
