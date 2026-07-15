import { hashForAudit } from "@/lib/security/fingerprint";

type AdminAuditEvent =
  | "login_success"
  | "login_failed"
  | "login_blocked_allowlist"
  | "login_rate_limited"
  | "logout"
  | "mfa_challenge"
  | "mfa_success"
  | "mfa_failed";

export function logAdminAuthEvent(
  event: AdminAuditEvent,
  ip: string,
  extra?: Record<string, string | number | boolean>
) {
  console.info("[admin-auth]", {
    event,
    ip: hashForAudit(ip),
    ...extra,
  });
}
