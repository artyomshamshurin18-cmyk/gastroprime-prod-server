export const SITE_NAME = "Gastroprime";
export const SITE_URL = "https://gastroprime.ru";
export const SITE_PHONE = "+79166847288";
export const SITE_EMAIL = "info@gastroprime.ru";
export const SITE_ADDRESS = "Москва, Московская область";

export function localBusinessJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: SITE_NAME,
    description: "Организация питания и кейтеринг в Москве и Московской области. Доставка обедов на стройки, склады, в офисы.",
    url: SITE_URL,
    telephone: SITE_PHONE,
    email: SITE_EMAIL,
    areaServed: "Москва и Московская область",
    image: "https://app.gastroprime.ru/file_150.jpg",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Москва",
      addressRegion: "Московская область",
      addressCountry: "RU",
    },
  };
}

export function faqJsonLd(faqs: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.a,
      },
    })),
  };
}

export function openGraph(title: string, description: string, image?: string) {
  return {
    openGraph: {
      title: `${title} | ${SITE_NAME}`,
      description,
      url: SITE_URL,
      siteName: SITE_NAME,
      images: [{ url: image || "https://app.gastroprime.ru/file_150.jpg", width: 1200, height: 630 }],
      locale: "ru_RU",
      type: "website",
    },
  };
}
