import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseConfig } from "@/lib/supabase/config";

export async function createSupabaseServerClient() {
  const config = getSupabaseConfig();
  if (!config.ok) {
    throw new Error("Supabase non configuré.");
  }

  const cookieStore = await cookies();

  return createServerClient(config.config.url, config.config.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Ignoré dans les Server Components en lecture seule.
        }
      },
    },
  });
}

/** Utilisateur authentifié — toujours via getUser() (validation JWT côté Supabase). */
export async function getAuthenticatedUser() {
  if (!getSupabaseConfig().ok) return null;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;
  return user;
}
