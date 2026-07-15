import { parseFormRequest } from "@/lib/api/parse-form-request";
import {
  jsonResponse,
  sendFailedResponse,
  serviceUnavailableResponse,
} from "@/lib/api/json-response";
import { logFormSecurityEvent } from "@/lib/security/audit-log";
import { checkEmailSubmissionLimit } from "@/lib/security/email-submission-limit";
import { createSubmissionFingerprint } from "@/lib/security/fingerprint";
import { isDuplicateSubmission } from "@/lib/security/submission-dedup";
import type { FormSubmitContext } from "@/lib/api/form-types";
import type { SendEmailResult } from "@/lib/email/types";
import { ValidationErrors } from "@/lib/validation-errors";

type ValidationSuccess<T> = { ok: true; data: T };
type ValidationFailure = { ok: false; error: string; field?: string };
type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

type HandleFormPostOptions<T> = {
  formKind: "contact" | "review";
  parsePayload: (body: unknown) => ValidationResult<T> | { ok: false; error: "honeypot" };
  sendEmail: (data: T, context: FormSubmitContext) => Promise<SendEmailResult>;
  getRateLimitEmail?: (data: T) => string | undefined;
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

  const result = await options.sendEmail(parsed.data, {
    idempotencyKey: fingerprint,
  });

  if (!result.ok) {
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
