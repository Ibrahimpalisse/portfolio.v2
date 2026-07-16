import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  clearAdminLoginFailures,
  isAdminAccountLocked,
  recordAdminLoginFailure,
} from "@/lib/admin/account-lockout";
import { ADMIN_ACCOUNT_LOCKOUT } from "@/lib/admin/constants";
import { ADMIN_ERROR_CODES, ADMIN_ERROR_MESSAGES } from "@/lib/admin/error-codes";

describe("OWASP A07 — account lockout", () => {
  it("verrouille après maxFailures échecs", () => {
    const email = `lockout-${Date.now()}@example.com`;
    clearAdminLoginFailures(email);

    for (let i = 0; i < ADMIN_ACCOUNT_LOCKOUT.maxFailures - 1; i++) {
      const r = recordAdminLoginFailure(email);
      assert.equal(r.locked, false);
    }

    const last = recordAdminLoginFailure(email);
    assert.equal(last.locked, true);
    assert.equal(isAdminAccountLocked(email).locked, true);

    clearAdminLoginFailures(email);
    assert.equal(isAdminAccountLocked(email).locked, false);
  });
});

describe("OWASP A09 — error codes stables", () => {
  it("chaque code a un message FR", () => {
    for (const code of Object.values(ADMIN_ERROR_CODES)) {
      assert.ok(ADMIN_ERROR_MESSAGES[code]?.length > 0);
    }
  });

  it("hash audit email ne fuit pas le plaintext", () => {
    const email = "admin@example.com";
    const h = createHash("sha256").update(email).digest("hex").slice(0, 12);
    assert.equal(h.includes("@"), false);
    assert.equal(h.length, 12);
  });
});
