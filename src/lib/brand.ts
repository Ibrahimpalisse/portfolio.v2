export const brand = {
  name: "Vignes Ibrahim",
  owner: "Vignes Ibrahim",
  tagline: "Sites web sur-mesure",
  profileImage: "/images/profile.png",
  profileImageAlt: "Logo de Vignes Ibrahim",
  heroBanner: "/images/hero-banner.jpg",
  heroBannerAlt:
    "Espace de travail — portfolio et création de sites web sur-mesure",
  heroBannerDark: "/images/hero-banner-dark.jpg",
  heroBannerDarkAlt:
    "Espace de travail en ambiance sombre — portfolio et sites web sur-mesure",
  email: "contact@zishi.dev",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "https://zishi.dev",
  description:
    "Développeur web, backend & designer freelance. Sites et applications sur-mesure par Vignes Ibrahim.",
  preferredContactText: "Contact préféré · Discord",
  /**
   * Réseaux sociaux — laisse vide pour afficher l'icône grisée (non cliquable).
   * WhatsApp : https://wa.me/33612345678 (indicatif sans +)
   * Discord : https://discord.gg/ton-invite ou profil
   */
  social: {
    discord: "",
    whatsapp: "",
    instagram: "",
    tiktok: "",
  },
} as const;

export type FooterSocialId = "discord" | "whatsapp" | "instagram" | "tiktok";

export type FooterSocialLink = {
  id: FooterSocialId;
  label: string;
  href: string;
  preferred?: boolean;
};

export function getFooterSocials(): FooterSocialLink[] {
  return [
    { id: "discord", label: "Discord", href: brand.social.discord, preferred: true },
    { id: "whatsapp", label: "WhatsApp", href: brand.social.whatsapp },
    { id: "instagram", label: "Instagram", href: brand.social.instagram },
    { id: "tiktok", label: "TikTok", href: brand.social.tiktok },
  ];
}
