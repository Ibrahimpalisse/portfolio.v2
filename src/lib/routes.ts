import { brand } from "@/lib/brand";

/** Chemins canoniques du site — URLs SEO en français, sans slash final. */
export const routes = {
  home: "/",
  services: "/services",
  projects: "/projets",
  about: "/a-propos",
  reviews: "/avis",
  leaveReview: "/laisser-un-avis",
  contact: "/contact",
  legal: "/mentions-legales",
  admin: "/admin",
  adminLogin: "/admin/connexion",
} as const;

/** Ancres sur la page d'accueil (scroll interne uniquement). */
export const homeAnchors = {
  services: "#services",
  projects: "#projets",
  about: "#a-propos",
  reviews: "#avis",
  contact: "#contact",
} as const;

export type RoutePath = (typeof routes)[keyof typeof routes];

export function absoluteUrl(path: RoutePath | string) {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${brand.siteUrl.replace(/\/$/, "")}${normalized}`;
}

export function homeSectionUrl(section: keyof typeof homeAnchors) {
  return `${routes.home}${homeAnchors[section]}`;
}

type PageMetaInput = {
  title: string;
  description: string;
  path: RoutePath;
  index?: boolean;
};

export function createPageMetadata({
  title,
  description,
  path,
  index = true,
}: PageMetaInput) {
  const url = absoluteUrl(path);

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "website" as const,
      locale: "fr_FR",
      siteName: brand.name,
    },
    ...(index ? {} : { robots: { index: false, follow: false } }),
  };
}
