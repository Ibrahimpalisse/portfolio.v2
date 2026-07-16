import type { MetadataRoute } from "next";
import { absoluteUrl, routes } from "@/lib/routes";

/** Pages indexables — pas d’admin, pas de laisser-un-avis, pas de redirects vides. */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const pages: Array<{
    path: (typeof routes)[keyof typeof routes];
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
    priority: number;
  }> = [
    { path: routes.home, changeFrequency: "monthly", priority: 1 },
    { path: routes.services, changeFrequency: "monthly", priority: 0.9 },
    { path: routes.projects, changeFrequency: "weekly", priority: 0.85 },
    { path: routes.about, changeFrequency: "monthly", priority: 0.75 },
    { path: routes.reviews, changeFrequency: "weekly", priority: 0.7 },
    { path: routes.contact, changeFrequency: "monthly", priority: 0.8 },
    { path: routes.legal, changeFrequency: "yearly", priority: 0.3 },
  ];

  return pages.map(({ path, changeFrequency, priority }) => ({
    url: absoluteUrl(path),
    lastModified: now,
    changeFrequency,
    priority,
  }));
}
