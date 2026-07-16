/**
 * Messages d'erreur admin côté client (codes stables + i18n).
 */
import { ADMIN_ERROR_MESSAGES, type AdminErrorCode } from "@/lib/admin/error-codes";

type AdminErrorBody = {
  error?: string;
  code?: string;
} | null;

type TranslateFn = (key: string) => string;

export function readAdminApiError(
  res: Response,
  body: AdminErrorBody,
  fallback = ADMIN_ERROR_MESSAGES.internal,
  t?: TranslateFn
): string {
  const translate = (code: string) => {
    if (!t) return null;
    try {
      return t(code);
    } catch {
      return null;
    }
  };

  if (res.status === 429) {
    const retryAfter = res.headers.get("Retry-After");
    const seconds = retryAfter ? Number(retryAfter) : NaN;
    const locked =
      body?.code === "account_locked"
        ? translate("account_locked") ?? ADMIN_ERROR_MESSAGES.account_locked
        : null;
    if (locked) return locked;

    if (Number.isFinite(seconds) && seconds > 0) {
      const minutes = Math.ceil(seconds / 60);
      if (t) {
        return translate("rate_limited") ?? ADMIN_ERROR_MESSAGES.rate_limited;
      }
      return minutes > 1
        ? `Trop de tentatives. Réessayez dans environ ${minutes} minutes.`
        : `Trop de tentatives. Réessayez dans environ ${Math.ceil(seconds)} secondes.`;
    }
    return (
      translate("rate_limited") ??
      body?.error ??
      ADMIN_ERROR_MESSAGES.rate_limited
    );
  }

  if (body?.code) {
    const localized = translate(body.code);
    if (localized) return localized;
    if (body.code in ADMIN_ERROR_MESSAGES) {
      return ADMIN_ERROR_MESSAGES[body.code as AdminErrorCode];
    }
  }

  if (body?.error?.trim()) return body.error.trim();
  return fallback;
}
