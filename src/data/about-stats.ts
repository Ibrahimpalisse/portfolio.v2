/**
 * Valeurs par défaut de la section « À propos ».
 * En production (Supabase configuré + migration 006), l'admin édite via /admin/about.
 * Les libellés restent dans messages (about.stats.*).
 */

export type AboutStatsValues = {
  years: number;
  clients: number;
  projects: number;
  responseHours: number;
};

export const DEFAULT_ABOUT_STATS: AboutStatsValues = {
  years: 2.5,
  clients: 1,
  projects: 4,
  responseHours: 48,
};

export type AboutStatDisplay = {
  id: "years" | "clients" | "projects" | "response";
  value: number;
  decimals: number;
  suffix?: string;
};

export function aboutStatsToDisplay(values: AboutStatsValues): AboutStatDisplay[] {
  const yearsDecimals = Number.isInteger(values.years) ? 0 : 1;
  return [
    { id: "years", value: values.years, decimals: yearsDecimals },
    { id: "clients", value: values.clients, decimals: 0 },
    { id: "projects", value: values.projects, decimals: 0 },
    {
      id: "response",
      value: values.responseHours,
      decimals: 0,
      suffix: "h",
    },
  ];
}

/** @deprecated Préférer getAboutStats() + aboutStatsToDisplay() */
export const aboutStats = aboutStatsToDisplay(DEFAULT_ABOUT_STATS);

export type AboutStatId = AboutStatDisplay["id"];
