import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://gastroprime.ru";

  const pages = [
    { path: "", priority: 1.0, changefreq: "weekly" as const },
    { path: "/production", priority: 0.9, changefreq: "monthly" as const },
    { path: "/office", priority: 0.9, changefreq: "monthly" as const },
    { path: "/construction", priority: 0.8, changefreq: "monthly" as const },
    { path: "/warehouses", priority: 0.8, changefreq: "monthly" as const },
    { path: "/quality", priority: 0.8, changefreq: "monthly" as const },
    { path: "/events", priority: 0.7, changefreq: "monthly" as const },
  ];

  return pages.map(({ path, priority, changefreq }) => ({
    url: `${base}${path}/`,
    lastModified: new Date(),
    changeFrequency: changefreq,
    priority,
  }));
}
