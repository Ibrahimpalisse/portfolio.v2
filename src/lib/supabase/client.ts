import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseConfig } from "@/lib/supabase/config";

export function createSupabaseBrowserClient() {
  const config = getSupabaseConfig();
  if (!config.ok) {
    throw new Error("Supabase non configuré.");
  }

  return createBrowserClient(config.config.url, config.config.anonKey);
}
