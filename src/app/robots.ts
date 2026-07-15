import type { MetadataRoute } from "next";
import { brand } from "@/lib/brand";
import { absoluteUrl } from "@/lib/routes";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/laisser-un-avis", "/admin", "/admin/"],
    },
    sitemap: `${absoluteUrl("/").replace(/\/$/, "")}/sitemap.xml`,
  };
}
