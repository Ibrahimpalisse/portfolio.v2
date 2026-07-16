import { z } from "zod";
import type { AboutStatsValues } from "@/data/about-stats";

export const ABOUT_STATS_LIMITS = {
  maxBodyBytes: 2_048,
  years: { min: 0, max: 100 },
  clients: { min: 0, max: 100_000 },
  projects: { min: 0, max: 100_000 },
  responseHours: { min: 0, max: 720 },
} as const;

export const aboutStatsUpdateSchema = z.object({
  years: z
    .number()
    .finite()
    .min(ABOUT_STATS_LIMITS.years.min)
    .max(ABOUT_STATS_LIMITS.years.max),
  clients: z
    .number()
    .int()
    .min(ABOUT_STATS_LIMITS.clients.min)
    .max(ABOUT_STATS_LIMITS.clients.max),
  projects: z
    .number()
    .int()
    .min(ABOUT_STATS_LIMITS.projects.min)
    .max(ABOUT_STATS_LIMITS.projects.max),
  responseHours: z
    .number()
    .int()
    .min(ABOUT_STATS_LIMITS.responseHours.min)
    .max(ABOUT_STATS_LIMITS.responseHours.max),
});

export type AboutStatsUpdateInput = z.infer<typeof aboutStatsUpdateSchema>;

export function parseAboutStatsUpdateBody(
  body: unknown
):
  | { ok: true; values: AboutStatsValues }
  | { ok: false; error: string } {
  const parsed = aboutStatsUpdateSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      ok: false,
      error: first?.message ?? "invalid_request",
    };
  }
  return {
    ok: true,
    values: {
      years: Math.round(parsed.data.years * 10) / 10,
      clients: parsed.data.clients,
      projects: parsed.data.projects,
      responseHours: parsed.data.responseHours,
    },
  };
}
