import { z } from "zod";
import {
  DEFAULT_SITE_SETTINGS,
  SITE_SOCIAL_IDS,
  type SiteSettings,
  type SiteSocialLinks,
} from "@/data/site-social";
import { isValidEmail, normalizeEmail } from "@/lib/form-validation";
import { isSafeHttpUrl } from "@/lib/review-schema";

export const SITE_SOCIAL_LIMITS = {
  maxBodyBytes: 4_096,
  urlMax: 500,
  emailMax: 254,
} as const;

/** Hôtes autorisés par réseau (évite open-redirect / phishing via footer). */
const ALLOWED_HOSTS: Record<keyof SiteSocialLinks, readonly string[]> = {
  discord: ["discord.gg", "discord.com", "www.discord.com", "discordapp.com"],
  whatsapp: [
    "wa.me",
    "api.whatsapp.com",
    "www.whatsapp.com",
    "whatsapp.com",
    "chat.whatsapp.com",
  ],
  instagram: ["instagram.com", "www.instagram.com"],
  tiktok: ["tiktok.com", "www.tiktok.com", "vm.tiktok.com"],
};

function hostAllowed(url: string, network: keyof SiteSocialLinks): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase();
    return ALLOWED_HOSTS[network].some(
      (allowed) => host === allowed || host.endsWith(`.${allowed}`)
    );
  } catch {
    return false;
  }
}

function optionalSocialUrl(network: keyof SiteSocialLinks) {
  return z
    .string()
    .trim()
    .max(SITE_SOCIAL_LIMITS.urlMax)
    .transform((v) => (v === "" ? "" : v))
    .refine(
      (v) => v === "" || (isSafeHttpUrl(v) && hostAllowed(v, network)),
      `invalid_${network}_url`
    );
}

export const siteSocialUpdateSchema = z.object({
  contactEmail: z
    .string()
    .trim()
    .min(1)
    .max(SITE_SOCIAL_LIMITS.emailMax)
    .transform((v) => normalizeEmail(v))
    .refine((v) => isValidEmail(v), "invalid_contact_email"),
  discord: optionalSocialUrl("discord"),
  whatsapp: optionalSocialUrl("whatsapp"),
  instagram: optionalSocialUrl("instagram"),
  tiktok: optionalSocialUrl("tiktok"),
});

export type SiteSocialUpdateInput = z.infer<typeof siteSocialUpdateSchema>;

export function parseSiteSocialUpdateBody(
  body: unknown
):
  | { ok: true; values: SiteSettings }
  | { ok: false; error: string } {
  const parsed = siteSocialUpdateSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const msg = first?.message ?? "invalid_request";
    if (msg.startsWith("invalid_")) return { ok: false, error: msg };
    return { ok: false, error: "invalid_request" };
  }
  return { ok: true, values: parsed.data };
}

export function emptySiteSettings(): SiteSettings {
  return { ...DEFAULT_SITE_SETTINGS };
}

export function isSiteSocialId(value: string): value is keyof SiteSocialLinks {
  return (SITE_SOCIAL_IDS as readonly string[]).includes(value);
}
