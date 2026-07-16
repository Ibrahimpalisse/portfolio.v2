import {
  SITE_SOCIAL_LABELS,
  type SiteSocialId,
  type SiteSocialLinks,
} from "@/data/site-social";
import { getSiteSocialLinks } from "@/lib/social/store";

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
  email: "contact@zishi.dev", // fallback display — sourcé BDD via getPublicContactEmail()
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "https://zishi.dev",
  description:
    "Développeur web, backend & designer freelance. Sites et applications sur-mesure par Vignes Ibrahim.",
  preferredContactText: "Contact préféré · Discord",
} as const;

export type { SiteSocialId as FooterSocialId, SiteSocialLinks };

export type FooterSocialLink = {
  id: SiteSocialId;
  label: string;
  href: string;
  preferred?: boolean;
};

export function buildFooterSocials(
  social: SiteSocialLinks
): FooterSocialLink[] {
  return [
    {
      id: "discord",
      label: SITE_SOCIAL_LABELS.discord,
      href: social.discord,
      preferred: true,
    },
    {
      id: "whatsapp",
      label: SITE_SOCIAL_LABELS.whatsapp,
      href: social.whatsapp,
    },
    {
      id: "instagram",
      label: SITE_SOCIAL_LABELS.instagram,
      href: social.instagram,
    },
    {
      id: "tiktok",
      label: SITE_SOCIAL_LABELS.tiktok,
      href: social.tiktok,
    },
  ];
}

/** Liens footer : sourcés depuis Supabase (admin /settings), sinon vides. */
export async function getFooterSocials(): Promise<FooterSocialLink[]> {
  const social = await getSiteSocialLinks();
  return buildFooterSocials(social);
}
