import { parseFormRequest } from "@/lib/api/parse-form-request";
import {
  jsonResponse,
  sendFailedResponse,
  serviceUnavailableResponse,
} from "@/lib/api/json-response";
import { logFormSecurityEvent } from "@/lib/security/audit-log";
import {
  checkContactEmailDailyLimit,
  checkContactIpDailyLimit,
} from "@/lib/security/contact-daily-limit";
import { checkReviewIpDailyLimit } from "@/lib/security/review-daily-limit";
import { checkEmailSubmissionLimit } from "@/lib/security/email-submission-limit";
import { createSubmissionFingerprint } from "@/lib/security/fingerprint";
import { isDuplicateSubmission } from "@/lib/security/submission-dedup";
import type { FormSubmitContext } from "@/lib/api/form-types";
import type { SendEmailResult } from "@/lib/email/types";
import { ValidationErrors } from "@/lib/validation-errors";

type ValidationSuccess<T> = { ok: true; data: T };
type ValidationFailure = { ok: false; error: string; field?: string };
type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

type PersistOk = true | false;
type PersistFail = { ok: false; error: string };
type PersistResult = PersistOk | PersistFail;

type HandleFormPostOptions<T> = {
  formKind: "contact" | "review";
  parsePayload: (body: unknown) => ValidationResult<T> | { ok: false; error: "honeypot" };
  sendEmail: (data: T, context: FormSubmitContext) => Promise<SendEmailResult>;
  getRateLimitEmail?: (data: T) => string | undefined;
  /**
   * Persistance optionnelle (ex. inbox Supabase / avis).
   * `true` = enregistré ; `false` = échec soft ; `{ ok:false, error }` = rejet métier (409).
   */
  afterValidated?: (ctx: {
    data: T;
    ip: string;
    fingerprint: string;
    request: Request;
  }) => Promise<PersistResult>;
};

export async function handleFormPost<T>(
  request: Request,
  options: HandleFormPostOptions<T>
): Promise<Response> {
  const { formKind } = options;
  const parsedRequest = await parseFormRequest(request, formKind);
  if (!parsedRequest.ok) return parsedRequest.response;

  const { body, ip } = parsedRequest;

  const parsed = options.parsePayload(body);

  if (!parsed.ok) {
    if (parsed.error === "honeypot") {
      logFormSecurityEvent(formKind, "accepted", ip, { honeypot: true });
      return jsonResponse({ ok: true }, 200);
    }
    logFormSecurityEvent(formKind, "validation_failed", ip);
    return jsonResponse({ error: parsed.error }, 400);
  }

  const fingerprint = createSubmissionFingerprint(ip, formKind, parsed.data);
  if (isDuplicateSubmission(fingerprint)) {
    logFormSecurityEvent(formKind, "duplicate", ip);
    return jsonResponse({ ok: true }, 200);
  }

  const rateEmail = options.getRateLimitEmail?.(parsed.data);

  if (formKind === "contact") {
    const ipDaily = await checkContactIpDailyLimit(ip);
    if (!ipDaily.allowed) {
      logFormSecurityEvent(formKind, "rate_limited_daily_ip", ip);
      return jsonResponse(
        { error: ValidationErrors.dailyRateLimited },
        429,
        ipDaily.retryAfterSec
          ? { "Retry-After": String(ipDaily.retryAfterSec) }
          : undefined
      );
    }

    const emailDaily = await checkContactEmailDailyLimit(rateEmail);
    if (!emailDaily.allowed) {
      logFormSecurityEvent(formKind, "rate_limited_daily_email", ip);
      return jsonResponse(
        { error: ValidationErrors.dailyRateLimited },
        429,
        emailDaily.retryAfterSec
          ? { "Retry-After": String(emailDaily.retryAfterSec) }
          : undefined
      );
    }
  }

  if (formKind === "review") {
    const reviewIpDaily = await checkReviewIpDailyLimit(ip);
    if (!reviewIpDaily.allowed) {
      logFormSecurityEvent(formKind, "rate_limited_daily_ip", ip);
      return jsonResponse(
        { error: ValidationErrors.reviewIpRateLimited },
        429,
        reviewIpDaily.retryAfterSec
          ? { "Retry-After": String(reviewIpDaily.retryAfterSec) }
          : undefined
      );
    }
  }

  const emailLimit = checkEmailSubmissionLimit(rateEmail);
  if (!emailLimit.allowed) {
    logFormSecurityEvent(formKind, "rate_limited_email", ip);
    return jsonResponse(
      { error: ValidationErrors.rateLimited },
      429,
      emailLimit.retryAfterSec
        ? { "Retry-After": String(emailLimit.retryAfterSec) }
        : undefined
    );
  }

  let persisted = false;
  if (options.afterValidated) {
    try {
      const persistResult = await options.afterValidated({
        data: parsed.data,
        ip,
        fingerprint,
        request,
      });
      if (
        persistResult &&
        typeof persistResult === "object" &&
        persistResult.ok === false
      ) {
        logFormSecurityEvent(formKind, "validation_failed", ip, {
          persist: persistResult.error,
        });
        return jsonResponse({ error: persistResult.error }, 409);
      }
      persisted = persistResult === true;
    } catch {
      logFormSecurityEvent(formKind, "persist_failed", ip);
      persisted = false;
    }
  }

  const result = await options.sendEmail(parsed.data, {
    idempotencyKey: fingerprint,
  });

  if (!result.ok) {
    // Inbox OK → succès UX même si Resend est down / clé invalide
    if (persisted) {
      logFormSecurityEvent(formKind, "sent", ip, { email_skipped: true });
      return jsonResponse({ ok: true, stored: true }, 200);
    }
    if (result.reason === "not_configured") {
      console.error(`[${formKind}] Configuration Resend manquante ou invalide`);
      return serviceUnavailableResponse();
    }
    logFormSecurityEvent(formKind, "send_failed", ip);
    return sendFailedResponse();
  }

  logFormSecurityEvent(formKind, "sent", ip);
  return jsonResponse({ ok: true }, 200);
}
