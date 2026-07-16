import {
  DEFAULT_ABOUT_STATS,
  type AboutStatsValues,
} from "@/data/about-stats";
import {
  createSupabaseServiceClient,
  isSupabaseServiceConfigured,
} from "@/lib/supabase/service";

type AboutStatsRow = {
  years: number | string;
  clients: number;
  projects: number;
  response_hours: number;
  updated_at?: string;
};

function rowToValues(row: AboutStatsRow): AboutStatsValues {
  return {
    years: Number(row.years),
    clients: Number(row.clients),
    projects: Number(row.projects),
    responseHours: Number(row.response_hours),
  };
}

/**
 * Stats publiques pour la section À propos.
 * Fallback : DEFAULT_ABOUT_STATS si Supabase / table absents.
 */
export async function getAboutStats(): Promise<AboutStatsValues> {
  if (!isSupabaseServiceConfigured()) {
    return { ...DEFAULT_ABOUT_STATS };
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) return { ...DEFAULT_ABOUT_STATS };

  const { data, error } = await supabase
    .from("about_stats")
    .select("years, clients, projects, response_hours")
    .eq("id", "default")
    .maybeSingle();

  if (error || !data) {
    return { ...DEFAULT_ABOUT_STATS };
  }

  return rowToValues(data as AboutStatsRow);
}

export type GetAboutStatsAdminResult =
  | {
      ok: true;
      configured: true;
      stats: AboutStatsValues;
      updatedAt: string | null;
    }
  | {
      ok: true;
      configured: false;
      stats: AboutStatsValues;
      updatedAt: null;
    }
  | { ok: false; reason: "not_configured" | "persist_failed" };

export async function getAboutStatsForAdmin(): Promise<GetAboutStatsAdminResult> {
  if (!isSupabaseServiceConfigured()) {
    return {
      ok: true,
      configured: false,
      stats: { ...DEFAULT_ABOUT_STATS },
      updatedAt: null,
    };
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return {
      ok: true,
      configured: false,
      stats: { ...DEFAULT_ABOUT_STATS },
      updatedAt: null,
    };
  }

  const { data, error } = await supabase
    .from("about_stats")
    .select("years, clients, projects, response_hours, updated_at")
    .eq("id", "default")
    .maybeSingle();

  if (error) {
    console.error("[about-stats]", error.message);
    return { ok: false, reason: "persist_failed" };
  }

  if (!data) {
    // Table vide : seed depuis les défauts
    const seeded = await upsertAboutStats(DEFAULT_ABOUT_STATS);
    if (!seeded.ok) return { ok: false, reason: "persist_failed" };
    return {
      ok: true,
      configured: true,
      stats: seeded.stats,
      updatedAt: seeded.updatedAt,
    };
  }

  return {
    ok: true,
    configured: true,
    stats: rowToValues(data as AboutStatsRow),
    updatedAt: (data as AboutStatsRow).updated_at ?? null,
  };
}

export type UpsertAboutStatsResult =
  | { ok: true; stats: AboutStatsValues; updatedAt: string }
  | { ok: false; reason: "not_configured" | "persist_failed" };

export async function upsertAboutStats(
  values: AboutStatsValues
): Promise<UpsertAboutStatsResult> {
  if (!isSupabaseServiceConfigured()) {
    return { ok: false, reason: "not_configured" };
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return { ok: false, reason: "not_configured" };
  }

  const updatedAt = new Date().toISOString();
  const { data, error } = await supabase
    .from("about_stats")
    .upsert(
      {
        id: "default",
        years: values.years,
        clients: values.clients,
        projects: values.projects,
        response_hours: values.responseHours,
        updated_at: updatedAt,
      },
      { onConflict: "id" }
    )
    .select("years, clients, projects, response_hours, updated_at")
    .single();

  if (error || !data) {
    if (error) console.error("[about-stats] upsert", error.message);
    return { ok: false, reason: "persist_failed" };
  }

  return {
    ok: true,
    stats: rowToValues(data as AboutStatsRow),
    updatedAt: (data as AboutStatsRow).updated_at ?? updatedAt,
  };
}
