import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ADMIN_ERROR_CODES,
  ADMIN_ERROR_MESSAGES,
  type AdminErrorCode,
} from "@/lib/admin/error-codes";
import {
  adminErrorResponse,
  adminMethodNotAllowed,
  adminRateLimitResponse,
} from "@/lib/admin/error-response";

describe("admin error-response — OWASP A09 codes stables", () => {
  it("adminErrorResponse inclut code + message FR + no-store", async () => {
    const res = adminErrorResponse(ADMIN_ERROR_CODES.MFA_REQUIRED, 403);
    assert.equal(res.status, 403);
    assert.equal(res.headers.get("Cache-Control"), "no-store");
    const body = (await res.json()) as { code?: string; error?: string };
    assert.equal(body.code, "mfa_required");
    assert.equal(body.error, ADMIN_ERROR_MESSAGES.mfa_required);
  });

  it("adminRateLimitResponse inclut Retry-After", async () => {
    const res = adminRateLimitResponse(60);
    assert.equal(res.status, 429);
    assert.equal(res.headers.get("Retry-After"), "60");
    const body = (await res.json()) as { code?: string };
    assert.equal(body.code, ADMIN_ERROR_CODES.RATE_LIMITED);
  });

  it("adminMethodNotAllowed → 405", async () => {
    const res = adminMethodNotAllowed();
    assert.equal(res.status, 405);
    const body = (await res.json()) as { code?: string };
    assert.equal(body.code, ADMIN_ERROR_CODES.METHOD_NOT_ALLOWED);
  });

  it("chaque AdminErrorCode a un message non vide", () => {
    const codes = Object.values(ADMIN_ERROR_CODES) as AdminErrorCode[];
    assert.equal(codes.length > 0, true);
    for (const code of codes) {
      assert.ok(ADMIN_ERROR_MESSAGES[code]?.length > 0, `message manquant: ${code}`);
    }
  });

  it("les codes sont des slugs stables (snake_case)", () => {
    for (const code of Object.values(ADMIN_ERROR_CODES)) {
      assert.match(code, /^[a-z][a-z0-9_]*$/);
    }
  });
});
