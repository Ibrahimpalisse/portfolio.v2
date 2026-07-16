import { hashForAudit } from "@/lib/security/fingerprint";

type FormAuditEvent =
  | "accepted"
  | "duplicate"
  | "rate_limited_email"
  | "rate_limited_daily_ip"
  | "rate_limited_daily_email"
  | "origin_rejected"
  | "turnstile_failed"
  | "validation_failed"
  | "send_failed"
  | "persist_failed"
  | "sent";

/** Logs structurés sans PII (IP hashée, pas d'email/nom/message). */
export function logFormSecurityEvent(
  formKind: string,
  event: FormAuditEvent,
  ip: string,
  extra?: Record<string, string | number | boolean>
) {
  const payload = {
    form: formKind,
    event,
    ip: hashForAudit(ip),
    ...extra,
  };

  if (event === "sent") {
    console.info("[form-security]", payload);
    return;
  }

  if (event === "send_failed" || event === "turnstile_failed") {
    console.warn("[form-security]", payload);
    return;
  }

  console.info("[form-security]", payload);
}
