/**
 * Suite OWASP Top 10 (focus) pour le système avis — parallèle à contact-inbox-security.
 * Couvre les contrôles applicatifs ajoutés avec reviews (unicité, IP daily, admin, payload).
 */
import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
  isValidReviewStatus,
  parseAdminReviewsListQuery,
} from "@/lib/reviews/admin-query";
import {
  countReviewsInWindow,
  deleteReview,
  saveReview,
  updateReviewStatus,
} from "@/lib/reviews/store";
import {
  parseReviewPayload,
  REVIEW_LIMITS,
  isSafeHttpUrl,
} from "@/lib/review-schema";
import { buildReviewEmail } from "@/lib/email/templates/review";
import { sanitizeEmailSubject, sanitizeReplyTo } from "@/lib/email/sanitize-email-headers";
import { hashForAudit } from "@/lib/security/fingerprint";
import { FORM_SECURITY } from "@/lib/security/constants";
import {
  checkReviewIpDailyLimit,
  clearReviewDailyLimitsForTests,
} from "@/lib/security/review-daily-limit";
import { ValidationErrors } from "@/lib/validation-errors";
import { verifyFormRequestOrigin } from "@/lib/security/request-origin";

const envBackup = new Map<string, string | undefined>();

function setEnv(key: string, value: string | undefined) {
  if (!envBackup.has(key)) envBackup.set(key, process.env[key]);
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

function restoreEnv() {
  for (const [key, value] of envBackup.entries()) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  envBackup.clear();
}

function validReview(overrides: Record<string, unknown> = {}) {
  return {
    name: "Marie Dupont",
    email: "marie@example.com",
    role: "CEO",
    rating: 5,
    message: "Excellent travail, très professionnel et réactif.",
    _honeypot: "",
    ...overrides,
  };
}

describe("OWASP A01 — Broken Access Control (avis admin / IDs)", () => {
  beforeEach(() => {
    setEnv("SUPABASE_SERVICE_ROLE_KEY", undefined);
    setEnv("NEXT_PUBLIC_SUPABASE_URL", undefined);
    setEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", undefined);
  });
  afterEach(restoreEnv);

  it("update/delete refusent IDs non-UUID (IDOR / injection)", async () => {
    for (const badId of [
      "",
      "123",
      "not-uuid",
      "'; DROP TABLE reviews;--",
      "../../../etc/passwd",
      "00000000-0000-0000-0000-000000000000",
      "08d86636-9162-4aca-9fb8-b2f77ad90539' OR '1'='1",
    ]) {
      assert.equal(
        await updateReviewStatus(badId, "published"),
        false,
        `update ${badId}`
      );
      assert.equal(await deleteReview(badId), false, `delete ${badId}`);
    }
  });

  it("isValidReviewStatus whitelist stricte (pas de mass-assignment status)", () => {
    const invalid = [
      "all",
      "unread",
      "published\n",
      "PUBLISHED",
      "pending;drop",
      "",
      null,
      1,
      {},
      "admin",
    ];
    for (const v of invalid) {
      assert.equal(isValidReviewStatus(v), false, String(v));
    }
    for (const v of ["pending", "published", "rejected"] as const) {
      assert.equal(isValidReviewStatus(v), true);
    }
  });

  it("query admin : status injection → pending (défaut sûr)", () => {
    const injections = [
      "pending' OR '1'='1",
      "published; DROP TABLE reviews--",
      "../../published",
      "rejected%00",
    ];
    for (const status of injections) {
      const q = parseAdminReviewsListQuery(
        new URL(
          `http://localhost/api/admin/reviews?status=${encodeURIComponent(status)}`
        )
      );
      assert.equal(q.status, "pending", status);
    }
  });
});

describe("OWASP A03 — Injection (payload avis / HTML / en-têtes)", () => {
  it("sanitizePersonName retire < > CR/LF du nom (anti XSS stocké + header)", () => {
    const r = parseReviewPayload(
      validReview({
        name: "Evil\r\nBcc: bad@evil.com<script>x</script>",
        email: "ok@example.com",
      })
    );
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.data.name.includes("<"), false);
      assert.equal(r.data.name.includes(">"), false);
      assert.equal(r.data.name.includes("\r"), false);
      assert.equal(r.data.name.includes("\n"), false);
    }
  });

  it("contrôle caractères / null bytes retirés des champs texte", () => {
    const r = parseReviewPayload(
      validReview({
        message: "Message propre\u0000avec null\u0007et bell assez long.",
        role: "Lead\u0000Dev",
      })
    );
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.data.message.includes("\u0000"), false);
      assert.equal(r.data.role?.includes("\u0000"), false);
    }
  });

  it("buildReviewEmail échappe XSS (A03) dans HTML", () => {
    const content = buildReviewEmail({
      name: `<img src=x onerror="alert(1)">`,
      email: `safe@test.com`,
      role: `<script>alert(1)</script>`,
      rating: 4,
      message: `<script>alert(1)</script>\nDeuxième ligne OK.`,
    });
    assert.equal(content.html.includes("<script>"), false);
    assert.equal(content.html.includes("<img"), false);
    assert.match(content.html, /&lt;script&gt;/);
    assert.match(content.html, /&lt;img/);
  });

  it("sujet & replyTo : sanitizers bloquent injection CRLF", () => {
    const content = buildReviewEmail({
      name: "Nom\r\nBcc: leak@evil.com",
      email: "reply@evil.com\r\nBcc: other@evil.com",
      rating: 5,
      message: "Message assez long pour être valide ici.",
    });
    const subject = sanitizeEmailSubject(content.subject);
    assert.equal(subject.includes("\r"), false);
    assert.equal(subject.includes("\n"), false);
    // CRLF dans reply-to → email invalide après strip
    assert.equal(sanitizeReplyTo(content.replyTo ?? ""), undefined);
    assert.equal(
      sanitizeReplyTo("attacker@evil.com\r\nBcc: other@evil.com"),
      undefined
    );
  });

  it("isSafeHttpUrl refuse javascript: / data: / file:", () => {
    for (const url of [
      "javascript:alert(1)",
      "data:text/html,<script>",
      "file:///etc/passwd",
      "vbscript:msgbox(1)",
    ]) {
      assert.equal(isSafeHttpUrl(url), false, url);
    }
  });

  it("honeypot bot → silencieux (pas d'info métier)", () => {
    const r = parseReviewPayload(validReview({ _honeypot: "http://spam" }));
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, "honeypot");
  });
});

describe("OWASP A04 — Insecure Design (anti-abus avis)", () => {
  beforeEach(() => {
    clearReviewDailyLimitsForTests();
    setEnv("SUPABASE_SERVICE_ROLE_KEY", undefined);
    setEnv("NEXT_PUBLIC_SUPABASE_URL", undefined);
  });
  afterEach(restoreEnv);

  it("plafond REVIEW_IP_DAILY_MAX = 2 (pas 1 à vie, pas illimité)", () => {
    assert.equal(FORM_SECURITY.REVIEW_IP_DAILY_MAX, 2);
    assert.ok(FORM_SECURITY.REVIEW_IP_DAILY_MAX < FORM_SECURITY.CONTACT_IP_DAILY_MAX);
  });

  it("rate limit IP mémoire bloque après max (A04 DoS / spam)", async () => {
    const ip = "203.0.113.44";
    for (let i = 0; i < FORM_SECURITY.REVIEW_IP_DAILY_MAX; i += 1) {
      assert.equal((await checkReviewIpDailyLimit(ip)).allowed, true);
    }
    const blocked = await checkReviewIpDailyLimit(ip);
    assert.equal(blocked.allowed, false);
    assert.ok((blocked.retryAfterSec ?? 0) > 0);
  });

  it("email obligatoire + clé d'erreur stable (traçabilité / unicité métier)", () => {
    const r = parseReviewPayload(validReview({ email: "" }));
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, ValidationErrors.emailRequired);
    assert.equal(
      ValidationErrors.reviewAlreadySubmitted,
      "reviewAlreadySubmitted"
    );
    assert.equal(ValidationErrors.reviewIpRateLimited, "reviewIpRateLimited");
  });

  it("données validées respectent CHECK SQL (longueurs + rating)", () => {
    const r = parseReviewPayload(
      validReview({
        name: "Jo",
        message: "x".repeat(REVIEW_LIMITS.messageMin),
        rating: 1,
      })
    );
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.ok(r.data.name.length >= 2 && r.data.name.length <= 100);
      assert.ok(
        r.data.message.length >= 10 &&
          r.data.message.length <= REVIEW_LIMITS.messageMax
      );
      assert.ok(r.data.rating >= 1 && r.data.rating <= 5);
      assert.ok(r.data.email.length <= 254);
    }
  });
});

describe("OWASP A05 — Security Misconfiguration (avis)", () => {
  beforeEach(() => {
    setEnv("SUPABASE_SERVICE_ROLE_KEY", undefined);
    setEnv("NEXT_PUBLIC_SUPABASE_URL", undefined);
    setEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", undefined);
  });
  afterEach(restoreEnv);

  it("saveReview refuse sans service_role (pas de chemin anon)", async () => {
    const r = await saveReview({
      name: "Jean",
      email: "j@example.com",
      message: "Message valide assez long pour test sécurité.",
      rating: 5,
      fingerprint: "fp-sec-1",
      ip: "127.0.0.1",
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.reason, "not_configured");
  });

  it("countReviewsInWindow null sans Supabase (fail-closed rate DB)", async () => {
    const stats = await countReviewsInWindow({
      since: new Date(
        Date.now() - FORM_SECURITY.REVIEW_IP_DAILY_WINDOW_MS
      ).toISOString(),
      ip: "203.0.113.1",
    });
    assert.equal(stats, null);
  });
});

describe("OWASP A01/A08 — CSRF origine formulaire avis", () => {
  const envSnapshot = { ...process.env };

  beforeEach(() => {
    process.env = { ...envSnapshot, NODE_ENV: "production" };
    delete process.env.FORM_ALLOWED_ORIGINS;
    process.env.NEXT_PUBLIC_SITE_URL = "https://zishi.dev";
  });

  afterEach(() => {
    process.env = { ...envSnapshot };
  });

  it("origine étrangère rejetée pour /api/review (même garde que contact)", () => {
    const req = new Request("https://zishi.dev/api/review", {
      method: "POST",
      headers: {
        origin: "https://evil.example",
        "content-type": "application/json",
      },
    });
    assert.equal(verifyFormRequestOrigin(req), false);
  });

  it("origine site autorisée", () => {
    const req = new Request("https://zishi.dev/api/review", {
      method: "POST",
      headers: {
        origin: "https://zishi.dev",
        "content-type": "application/json",
      },
    });
    assert.equal(verifyFormRequestOrigin(req), true);
  });

  it("localhost autorisé hors production", () => {
    process.env.NODE_ENV = "development";
    const req = new Request("http://localhost:3000/api/review", {
      method: "POST",
      headers: {
        origin: "http://localhost:3000",
        "content-type": "application/json",
      },
    });
    assert.equal(verifyFormRequestOrigin(req), true);
  });
});

describe("OWASP A09 — Logging / Privacy (hashes avis)", () => {
  it("hash IP/UA : 12 hex, pas de plaintext, déterministe", () => {
    const ip = "198.51.100.77";
    const ua = "Mozilla/5.0 (SecurityTest)";
    const ipHash = hashForAudit(ip);
    const uaHash = hashForAudit(ua.slice(0, 256));
    assert.equal(ipHash, hashForAudit(ip));
    assert.equal(ipHash.includes(ip), false);
    assert.equal(uaHash.includes("Mozilla"), false);
    assert.match(ipHash, /^[a-f0-9]{12}$/);
    assert.match(uaHash, /^[a-f0-9]{12}$/);
  });

  it("email normalisé lowercase avant unicité / audit", () => {
    const r = parseReviewPayload(
      validReview({ email: "  MixedCase@Example.COM  " })
    );
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.data.email, "mixedcase@example.com");
  });
});

describe("OWASP A03/A04 — rating et forme payload", () => {
  it("rejette rating spoofing (string, float, hors plage)", () => {
    for (const rating of [0, 6, -1, 3.14, "5", "★★★★★", null, undefined, {}]) {
      const r = parseReviewPayload(validReview({ rating }));
      assert.equal(r.ok, false, `rating=${JSON.stringify(rating)}`);
    }
  });

  it("rejette prototype pollution shape (body non-objet)", () => {
    for (const body of [[], null, "x", 42]) {
      const r = parseReviewPayload(body);
      assert.equal(r.ok, false);
      if (!r.ok) assert.equal(r.error, ValidationErrors.invalidRequest);
    }
  });
});
