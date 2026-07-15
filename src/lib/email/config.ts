import { brand } from "@/lib/brand";
import { normalizeEmail } from "@/lib/form-validation";
import {
  isValidFromAddress,
  isValidNotifyAddress,
} from "@/lib/email/validate-address";

export type EmailConfig = {
  apiKey: string;
  from: string;
  notifyTo: string;
};

export type EmailConfigResult =
  | { ok: true; config: EmailConfig }
  | {
      ok: false;
      reason:
        | "missing_api_key"
        | "missing_from"
        | "missing_notify_to"
        | "invalid_from"
        | "invalid_notify_to";
    };

function readEnv(name: string): string {
  return process.env[name]?.trim() ?? "";
}

/** Lit et valide la configuration Resend (serveur uniquement). */
export function getEmailConfig(): EmailConfigResult {
  const apiKey = readEnv("RESEND_API_KEY");
  const from = readEnv("RESEND_FROM_EMAIL");
  const notifyTo = readEnv("RESEND_NOTIFY_EMAIL") || brand.email;

  if (!apiKey) return { ok: false, reason: "missing_api_key" };
  if (!from) return { ok: false, reason: "missing_from" };
  if (!notifyTo) return { ok: false, reason: "missing_notify_to" };

  if (!isValidFromAddress(from)) {
    return { ok: false, reason: "invalid_from" };
  }

  if (!isValidNotifyAddress(notifyTo)) {
    return { ok: false, reason: "invalid_notify_to" };
  }

  return {
    ok: true,
    config: {
      apiKey,
      from: from.trim(),
      notifyTo: normalizeEmail(notifyTo),
    },
  };
}

export function isEmailConfigured(): boolean {
  return getEmailConfig().ok;
}
