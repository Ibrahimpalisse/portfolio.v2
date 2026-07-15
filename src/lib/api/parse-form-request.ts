import { getClientIp } from "@/lib/rate-limit-core";
import { jsonResponse } from "@/lib/api/json-response";
import { logFormSecurityEvent } from "@/lib/security/audit-log";
import { parseJsonBody } from "@/lib/security/parse-json-body";
import { getTurnstileGuardFailure } from "@/lib/security/production-guards";
import { verifyFormRequestOrigin } from "@/lib/security/request-origin";
import { isTurnstileEnabled, verifyTurnstileToken } from "@/lib/turnstile";
import { ValidationErrors } from "@/lib/validation-errors";

export type ParsedFormRequest =
  | { ok: true; body: unknown; ip: string; formKind: string }
  | { ok: false; response: Response };

function invalidRequestResponse() {
  return jsonResponse({ error: ValidationErrors.invalidRequest }, 400);
}

/**
 * Valide une requête POST JSON de formulaire :
 * origine, taille corps, JSON, Turnstile (si activé / requis).
 */
export async function parseFormRequest(
  request: Request,
  formKind: string
): Promise<ParsedFormRequest> {
  const ip = getClientIp(request);

  const turnstileGuard = getTurnstileGuardFailure();
  if (turnstileGuard === "missing_config") {
    console.error("[form-security] Turnstile requis en production mais non configuré");
    return {
      ok: false,
      response: jsonResponse({ error: ValidationErrors.serviceUnavailable }, 503),
    };
  }

  if (!verifyFormRequestOrigin(request)) {
    logFormSecurityEvent(formKind, "origin_rejected", ip);
    return {
      ok: false,
      response: jsonResponse({ error: ValidationErrors.unauthorized }, 403),
    };
  }

  const contentType = request.headers.get("content-type");
  if (!contentType?.includes("application/json")) {
    return {
      ok: false,
      response: jsonResponse({ error: ValidationErrors.invalidRequest }, 415),
    };
  }

  const parsedBody = await parseJsonBody(request);
  if (!parsedBody.ok) {
    return {
      ok: false,
      response: invalidRequestResponse(),
    };
  }

  const body = parsedBody.body;

  if (isTurnstileEnabled()) {
    const raw = body as Record<string, unknown>;
    const turnstileToken =
      typeof raw.turnstileToken === "string" ? raw.turnstileToken : "";

    const valid = await verifyTurnstileToken(turnstileToken, ip);
    if (!valid) {
      logFormSecurityEvent(formKind, "turnstile_failed", ip);
      return {
        ok: false,
        response: jsonResponse(
          { error: ValidationErrors.turnstileFailed },
          400
        ),
      };
    }
  }

  return { ok: true, body, ip, formKind };
}
