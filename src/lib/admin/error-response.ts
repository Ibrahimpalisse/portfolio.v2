import { jsonResponse } from "@/lib/api/json-response";
import {
  ADMIN_ERROR_CODES,
  ADMIN_ERROR_MESSAGES,
  type AdminErrorCode,
} from "@/lib/admin/error-codes";

export function adminErrorResponse(
  code: AdminErrorCode,
  status: number,
  extraHeaders?: HeadersInit
) {
  return jsonResponse(
    {
      code,
      error: ADMIN_ERROR_MESSAGES[code],
    },
    status,
    extraHeaders
  );
}

export function adminRateLimitResponse(retryAfterSec?: number) {
  return adminErrorResponse(ADMIN_ERROR_CODES.RATE_LIMITED, 429, {
    ...(retryAfterSec ? { "Retry-After": String(retryAfterSec) } : {}),
  });
}

export function adminMethodNotAllowed() {
  return adminErrorResponse(ADMIN_ERROR_CODES.METHOD_NOT_ALLOWED, 405);
}
