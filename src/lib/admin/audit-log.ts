import { hashForAudit } from "@/lib/security/fingerprint";

type AdminAuditEvent =
  | "login_success"
  | "login_failed"
  | "login_blocked_allowlist"
  | "login_rate_limited"
  | "logout"
  | "mfa_challenge"
  | "mfa_success"
  | "mfa_failed"
  | "mfa_enroll_started"
  | "mfa_enroll_success"
  | "mfa_enroll_failed"
  | "password_change_success"
  | "password_change_failed"
  | "messages_listed"
  | "message_updated"
  | "message_deleted"
  | "reviews_listed"
  | "about_stats_listed"
  | "about_stats_updated"
  | "about_stats_update_failed"
  | "social_links_listed"
  | "social_links_updated"
  | "social_links_update_failed"
  | "projects_listed"
  | "project_created"
  | "project_create_failed"
  | "project_updated"
  | "project_update_failed"
  | "project_deleted"
  | "project_uploaded"
  | "project_upload_failed"
  | "review_updated"
  | "review_deleted";

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
