import { normalizeEmail } from "@/lib/form-validation";

function readEnv(name: string): string {
  return process.env[name]?.trim() ?? "";
}

/** Emails autorisés à accéder à l'espace admin (liste blanche). */
export function getAdminAllowedEmails(): string[] {
  const raw = readEnv("ADMIN_ALLOWED_EMAILS");
  if (!raw) return [];

  return [
    ...new Set(
      raw
        .split(",")
        .map((entry) => normalizeEmail(entry))
        .filter(Boolean)
    ),
  ];
}

export function isAdminConfigured(): boolean {
  return getAdminAllowedEmails().length > 0;
}

export function isAllowedAdminEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  const allowed = getAdminAllowedEmails();
  if (allowed.length === 0) return false;
  return allowed.includes(normalizeEmail(email));
}
