import {
  DEFAULT_CONTACT_EMAIL,
  DEFAULT_SITE_SETTINGS,
  type SiteSettings,
} from "@/data/site-social";
import { isValidEmail, normalizeEmail } from "@/lib/form-validation";
import {
  createSupabaseServiceClient,
  isSupabaseServiceConfigured,
} from "@/lib/supabase/service";

type SiteSocialRow = {
  contact_email?: string | null;
  discord: string;
  whatsapp: string;
  instagram: string;
  tiktok: string;
  updated_at?: string;
};

function normalizeContactEmail(raw: string | null | undefined): string {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return DEFAULT_CONTACT_EMAIL;
  const normalized = normalizeEmail(trimmed);
  return isValidEmail(normalized) ? normalized : DEFAULT_CONTACT_EMAIL;
}

function rowToValues(row: SiteSocialRow): SiteSettings {
  return {
    contactEmail: normalizeContactEmail(row.contact_email),
    discord: String(row.discord ?? "").trim(),
    whatsapp: String(row.whatsapp ?? "").trim(),
    instagram: String(row.instagram ?? "").trim(),
    tiktok: String(row.tiktok ?? "").trim(),
  };
}

/** Réglages publics (footer / SEO / affichage email). */
export async function getSiteSettings(): Promise<SiteSettings> {
  if (!isSupabaseServiceConfigured()) {
    return { ...DEFAULT_SITE_SETTINGS };
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) return { ...DEFAULT_SITE_SETTINGS };

  const { data, error } = await supabase
    .from("site_social_links")
    .select("contact_email, discord, whatsapp, instagram, tiktok")
    .eq("id", "default")
    .maybeSingle();

  if (error || !data) {
    return { ...DEFAULT_SITE_SETTINGS };
  }

  return rowToValues(data as SiteSocialRow);
}

/** Email affiché sur le site (pas la destination Resend). */
export async function getPublicContactEmail(): Promise<string> {
  const settings = await getSiteSettings();
  return settings.contactEmail;
}

/** Liens réseaux seuls (compat footer). */
export async function getSiteSocialLinks() {
  const settings = await getSiteSettings();
  const { contactEmail: _email, ...links } = settings;
  return links;
}

export type GetSiteSocialAdminResult =
  | {
      ok: true;
      configured: true;
      settings: SiteSettings;
      updatedAt: string | null;
    }
  | {
      ok: true;
      configured: false;
      settings: SiteSettings;
      updatedAt: null;
    }
  | { ok: false; reason: "not_configured" | "persist_failed" };

/** @deprecated alias — préférer getSiteSettingsForAdmin */
export async function getSiteSocialForAdmin(): Promise<GetSiteSocialAdminResult> {
  return getSiteSettingsForAdmin();
}

export async function getSiteSettingsForAdmin(): Promise<GetSiteSocialAdminResult> {
  if (!isSupabaseServiceConfigured()) {
    return {
      ok: true,
      configured: false,
      settings: { ...DEFAULT_SITE_SETTINGS },
      updatedAt: null,
    };
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return {
      ok: true,
      configured: false,
      settings: { ...DEFAULT_SITE_SETTINGS },
      updatedAt: null,
    };
  }

  const { data, error } = await supabase
    .from("site_social_links")
    .select("contact_email, discord, whatsapp, instagram, tiktok, updated_at")
    .eq("id", "default")
    .maybeSingle();

  if (error) {
    console.error("[site-social]", error.message);
    return { ok: false, reason: "persist_failed" };
  }

  if (!data) {
    const seeded = await upsertSiteSocialLinks(DEFAULT_SITE_SETTINGS);
    if (!seeded.ok) return { ok: false, reason: "persist_failed" };
    return {
      ok: true,
      configured: true,
      settings: seeded.settings,
      updatedAt: seeded.updatedAt,
    };
  }

  return {
    ok: true,
    configured: true,
    settings: rowToValues(data as SiteSocialRow),
    updatedAt: (data as SiteSocialRow).updated_at ?? null,
  };
}

export type UpsertSiteSocialResult =
  | { ok: true; settings: SiteSettings; updatedAt: string }
  | { ok: false; reason: "not_configured" | "persist_failed" };

export async function upsertSiteSocialLinks(
  values: SiteSettings
): Promise<UpsertSiteSocialResult> {
  if (!isSupabaseServiceConfigured()) {
    return { ok: false, reason: "not_configured" };
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return { ok: false, reason: "not_configured" };
  }

  const updatedAt = new Date().toISOString();
  const { data, error } = await supabase
    .from("site_social_links")
    .upsert(
      {
        id: "default",
        contact_email: values.contactEmail,
        discord: values.discord,
        whatsapp: values.whatsapp,
        instagram: values.instagram,
        tiktok: values.tiktok,
        updated_at: updatedAt,
      },
      { onConflict: "id" }
    )
    .select(
      "contact_email, discord, whatsapp, instagram, tiktok, updated_at"
    )
    .single();

  if (error || !data) {
    if (error) console.error("[site-social] upsert", error.message);
    return { ok: false, reason: "persist_failed" };
  }

  return {
    ok: true,
    settings: rowToValues(data as SiteSocialRow),
    updatedAt: (data as SiteSocialRow).updated_at ?? updatedAt,
  };
}
