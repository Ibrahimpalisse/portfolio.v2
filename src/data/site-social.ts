export const SITE_SOCIAL_IDS = [
  "discord",
  "whatsapp",
  "instagram",
  "tiktok",
] as const;

export type SiteSocialId = (typeof SITE_SOCIAL_IDS)[number];

export type SiteSocialLinks = Record<SiteSocialId, string>;

/** Réglages publics éditables (email affiché + réseaux). */
export type SiteSettings = SiteSocialLinks & {
  contactEmail: string;
};

/** Fallback email affichage si BDD absente. */
export const DEFAULT_CONTACT_EMAIL = "contact@zishi.dev";

/** Défauts : pas d’icône si URL vide. */
export const DEFAULT_SITE_SOCIAL: SiteSocialLinks = {
  discord: "",
  whatsapp: "",
  instagram: "",
  tiktok: "",
};

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  ...DEFAULT_SITE_SOCIAL,
  contactEmail: DEFAULT_CONTACT_EMAIL,
};

export const SITE_SOCIAL_LABELS: Record<SiteSocialId, string> = {
  discord: "Discord",
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  tiktok: "TikTok",
};
