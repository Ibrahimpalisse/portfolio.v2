import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "@/lib/supabase/config";

function readEnv(name: string): string {
  return process.env[name]?.trim() ?? "";
}

/**
 * Client service_role — serveur UNIQUEMENT.
 * Bypass RLS : ne jamais exposer la clé ni l'importer dans un composant client.
 */
export function createSupabaseServiceClient(): SupabaseClient | null {
  const config = getSupabaseConfig();
  const serviceKey = readEnv("SUPABASE_SERVICE_ROLE_KEY");

  if (!config.ok || !serviceKey) {
    return null;
  }

  return createClient(config.config.url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export function isSupabaseServiceConfigured(): boolean {
  return Boolean(getSupabaseConfig().ok && readEnv("SUPABASE_SERVICE_ROLE_KEY"));
}
