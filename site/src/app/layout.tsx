import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import Script from "next/script";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { company, siteUrl } from "@/content/site";
import { SocialSidebar } from "@/components/social-sidebar";
import { localBusinessJsonLd } from "@/lib/seo";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  variable: "--font-manrope",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${company.name}, корпоративное питание`,
    template: `%s | ${company.name}`,
  },
  description:
    "GastroPrime — корпоративное питание в Москве и МО. Доставка обедов в офисы, на стройки, склады и производства.",
  openGraph: {
    title: `${company.name}, корпоративное питание`,
    description:
      "Новый каркас сайта для офисов, складов, строек, производств и госучреждений.",
    url: siteUrl,
    siteName: company.name,
    locale: "ru_RU",
    type: "website",
  },
};

function ogFallbackScript() {
  return {
    __html:
      'if(!document.head.querySelector(\'[property="og:title"]\')){' +
      "var t=document.createElement('meta');" +
      "t.setAttribute('property','og:title');" +
      "t.setAttribute('content','GastroPrime, корпоративное питание');" +
      'document.head.appendChild(t);' +
      "var d=document.createElement('meta');" +
      "d.setAttribute('property','og:description');" +
      "d.setAttribute('content','Корпоративное питание в Москве и МО');" +
      'document.head.appendChild(d);' +
      "var s=document.createElement('meta');" +
      "s.setAttribute('property','og:site_name');" +
      "s.setAttribute('content','GastroPrime');" +
      'document.head.appendChild(s);}',
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = localBusinessJsonLd();

  return (
    <html lang="ru">
      <head>
        <noscript>
          <div>
            <img src="https://mc.yandex.ru/watch/110067517" style={{ position: "absolute", left: -9999 }} alt="" />
          </div>
        </noscript>
      </head>
      <body className={`${manrope.variable} ${manrope.className} bg-slate-50 text-slate-950 antialiased`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <script
          type="text/javascript"
          dangerouslySetInnerHTML={ogFallbackScript()}
        />
        <Script id="yandex-metrika" strategy="afterInteractive">
          {`(function(m,e,t,r,i,k,a){
 m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
 m[i].l=1*new Date();
 for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
 k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
 })(window, document,'script','https://mc.yandex.ru/metrika/tag.js?id=110067517', 'ym');

 ym(110067517, 'init', {ssr:true, webvisor:true, clickmap:true, ecommerce:"dataLayer"});`}
        </Script>
        <Header />
        <SocialSidebar />
        {children}
        <Footer />
      </body>
    </html>
  );
}
