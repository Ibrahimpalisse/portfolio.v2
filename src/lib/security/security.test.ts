import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import { FORM_SECURITY } from "@/lib/security/constants";
import { parseJsonBody } from "@/lib/security/parse-json-body";
import {
  getAllowedFormOrigins,
  isAllowedFormOrigin,
  verifyFormRequestOrigin,
} from "@/lib/security/request-origin";
import {
  createSubmissionFingerprint,
  hashForAudit,
} from "@/lib/security/fingerprint";
import { isDuplicateSubmission } from "@/lib/security/submission-dedup";
import { checkEmailSubmissionLimit } from "@/lib/security/email-submission-limit";
import {
  getTurnstileGuardFailure,
  isTurnstileRequired,
} from "@/lib/security/production-guards";

function jsonRequest(body: unknown, headers: Record<string, string> = {}): Request {
  const text = JSON.stringify(body);
  return new Request("http://localhost/api/test", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    body: text,
  });
}

describe("OWASP A08 — parseJsonBody (intégrité / prototype pollution)", () => {
  it("accepte un objet JSON valide", async () => {
    const result = await parseJsonBody(jsonRequest({ name: "Test" }));
    assert.equal(result.ok, true);
  });

  it("rejette un corps trop volumineux (content-length)", async () => {
    const result = await parseJsonBody(
      new Request("http://localhost/api/test", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "content-length": String(FORM_SECURITY.MAX_BODY_BYTES + 1),
        },
        body: "{}",
      })
    );
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, "too_large");
  });

  it("rejette un corps texte trop long", async () => {
    const huge = " ".repeat(FORM_SECURITY.MAX_BODY_BYTES + 1);
    const result = await parseJsonBody(
      new Request("http://localhost/api/test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: huge,
      })
    );
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, "too_large");
  });

  it("rejette JSON invalide", async () => {
    const result = await parseJsonBody(
      new Request("http://localhost/api/test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{not-json",
      })
    );
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, "invalid_json");
  });

  it("rejette un tableau racine", async () => {
    const result = await parseJsonBody(jsonRequest([1, 2, 3]));
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, "invalid_shape");
  });

  it("rejette trop de clés racine", async () => {
    const body: Record<string, number> = {};
    for (let i = 0; i <= FORM_SECURITY.MAX_ROOT_KEYS; i += 1) {
      body[`k${i}`] = i;
    }
    const result = await parseJsonBody(jsonRequest(body));
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, "invalid_shape");
  });

  it("rejette les clés dangereuses __proto__ / constructor / prototype", async () => {
    for (const key of ["__proto__", "constructor", "prototype"]) {
      const result = await parseJsonBody(jsonRequest({ [key]: { polluted: true } }));
      assert.equal(result.ok, false);
      if (!result.ok) assert.equal(result.reason, "dangerous_keys");
    }
  });
});

describe("OWASP A01 — verifyFormRequestOrigin (CSRF / accès direct API)", () => {
  const envSnapshot = { ...process.env };

  beforeEach(() => {
    process.env = { ...envSnapshot, NODE_ENV: "production" };
    delete process.env.FORM_ALLOWED_ORIGINS;
  });

  afterEach(() => {
    process.env = envSnapshot;
  });

  it("autorise l'origine du site configurée", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://zishi.dev";
    const allowed = getAllowedFormOrigins();
    assert.ok(isAllowedFormOrigin("https://zishi.dev", allowed));
  });

  it("autorise aussi www quand le site est en apex", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://zishi.dev";
    const allowed = getAllowedFormOrigins();
    assert.ok(isAllowedFormOrigin("https://www.zishi.dev", allowed));
  });

  it("rejette une origine malveillante en production", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://zishi.dev";
    const request = new Request("https://zishi.dev/api/contact", {
      method: "POST",
      headers: { origin: "https://evil.example" },
    });
    assert.equal(verifyFormRequestOrigin(request), false);
  });

  it("accepte localhost en développement", () => {
    process.env.NODE_ENV = "development";
    process.env.NEXT_PUBLIC_SITE_URL = "https://zishi.dev";
    const request = new Request("http://localhost:3000/api/contact", {
      method: "POST",
      headers: { origin: "http://localhost:3000" },
    });
    assert.equal(verifyFormRequestOrigin(request), true);
  });

  it("utilise Referer si Origin absent", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://zishi.dev";
    const request = new Request("https://zishi.dev/api/contact", {
      method: "POST",
      headers: { referer: "https://zishi.dev/contact" },
    });
    assert.equal(verifyFormRequestOrigin(request), true);
  });
});

describe("OWASP A04 — anti-abus (empreinte, déduplication, rate limit email)", () => {
  it("génère une empreinte stable pour le même contenu", () => {
    const payload = { name: "Alice", email: "a@test.com" };
    const a = createSubmissionFingerprint("1.2.3.4", "contact", payload);
    const b = createSubmissionFingerprint("1.2.3.4", "contact", payload);
    assert.equal(a, b);
    assert.match(a, /^[a-f0-9]{64}$/);
  });

  it("différencie IP, type de formulaire et contenu", () => {
    const payload = { name: "Alice" };
    const base = createSubmissionFingerprint("1.2.3.4", "contact", payload);
    const otherIp = createSubmissionFingerprint("5.6.7.8", "contact", payload);
    const otherKind = createSubmissionFingerprint("1.2.3.4", "review", payload);
    const otherPayload = createSubmissionFingerprint("1.2.3.4", "contact", { name: "Bob" });
    assert.notEqual(base, otherIp);
    assert.notEqual(base, otherKind);
    assert.notEqual(base, otherPayload);
  });

  it("hashForAudit ne retourne pas la valeur en clair", () => {
    const hash = hashForAudit("contact@secret.com");
    assert.notEqual(hash, "contact@secret.com");
    assert.equal(hash.length, 12);
  });

  it("isDuplicateSubmission bloque un rejeu rapide", () => {
    const fp = `test-dedup-${Date.now()}-${Math.random()}`;
    const now = Date.now();
    assert.equal(isDuplicateSubmission(fp, now), false);
    assert.equal(isDuplicateSubmission(fp, now + 1000), true);
  });

  it("checkEmailSubmissionLimit limite par email", () => {
    const email = `limit-${Date.now()}@example.com`;
    const now = Date.now();
    for (let i = 0; i < FORM_SECURITY.EMAIL_RATE_MAX; i += 1) {
      const result = checkEmailSubmissionLimit(email, now);
      assert.equal(result.allowed, true);
    }
    const blocked = checkEmailSubmissionLimit(email, now);
    assert.equal(blocked.allowed, false);
    assert.ok(blocked.retryAfterSec && blocked.retryAfterSec > 0);
  });
});

describe("OWASP A05 — production-guards (Turnstile)", () => {
  const envSnapshot = { ...process.env };

  afterEach(() => {
    process.env = envSnapshot;
  });

  it("exige Turnstile en production par défaut", () => {
    process.env.NODE_ENV = "production";
    delete process.env.FORM_REQUIRE_TURNSTILE;
    delete process.env.TURNSTILE_SECRET_KEY;
    assert.equal(isTurnstileRequired(), true);
    assert.equal(getTurnstileGuardFailure(), "missing_config");
  });

  it("permet de désactiver explicitement Turnstile", () => {
    process.env.NODE_ENV = "production";
    process.env.FORM_REQUIRE_TURNSTILE = "false";
    delete process.env.TURNSTILE_SECRET_KEY;
    assert.equal(isTurnstileRequired(), false);
    assert.equal(getTurnstileGuardFailure(), null);
  });

  it("ne signale pas d'erreur si Turnstile est configuré", () => {
    process.env.NODE_ENV = "production";
    process.env.TURNSTILE_SECRET_KEY = "test-secret";
    assert.equal(getTurnstileGuardFailure(), null);
  });
});
