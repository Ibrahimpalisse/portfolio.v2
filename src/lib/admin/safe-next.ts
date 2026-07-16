import { ADMIN_ROUTES } from "@/lib/admin/constants";

/**
 * N'autorise que des chemins relatifs sous /admin (anti open-redirect).
 */
export function getSafeAdminNextPath(next: string | null | undefined): string | null {
  if (!next || typeof next !== "string") return null;

  const trimmed = next.trim();
  if (!trimmed.startsWith("/")) return null;
  if (trimmed.startsWith("//")) return null;
  if (trimmed.includes("\\") || trimmed.includes("://")) return null;
  if (!trimmed.startsWith(ADMIN_ROUTES.home)) return null;
  // Évite /admin-evil etc.
  if (trimmed !== ADMIN_ROUTES.home && !trimmed.startsWith(`${ADMIN_ROUTES.home}/`)) {
    return null;
  }

  return trimmed;
}
