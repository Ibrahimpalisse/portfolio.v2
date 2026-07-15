function readEnv(name: string): string {
  return process.env[name]?.trim() ?? "";
}

export type SupabaseConfig = {
  url: string;
  anonKey: string;
};

export type SupabaseConfigResult =
  | { ok: true; config: SupabaseConfig }
  | { ok: false; reason: "missing_url" | "missing_anon_key" };

export function getSupabaseConfig(): SupabaseConfigResult {
  const url = readEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  if (!url) return { ok: false, reason: "missing_url" };
  if (!anonKey) return { ok: false, reason: "missing_anon_key" };

  return { ok: true, config: { url, anonKey } };
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseConfig().ok;
}
