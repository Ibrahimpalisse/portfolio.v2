import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { isAllowedAdminEmail } from "@/lib/admin/allowlist";
import { ADMIN_ROUTES } from "@/lib/admin/constants";
import { getAuthenticatedUser } from "@/lib/supabase/server";

/**
 * Garde légère pour les pages /admin.
 * MFA (AAL2) est déjà imposée par `handleAdminSession` dans le proxy —
 * on évite un 2e round-trip Auth/JWKS par navigation.
 */
export async function requireAdminPageUser(): Promise<User> {
  const user = await getAuthenticatedUser();
  if (!user || !isAllowedAdminEmail(user.email)) {
    redirect(ADMIN_ROUTES.login);
  }
  return user;
}
