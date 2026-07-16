/**
 * Suite OWASP Top 10 (focus) — formulaire contact + inbox admin.
 * Complète contact-inbox-security / admin-messages-api / archive-meta.
 */
import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
  isValidContactMessageStatus,
  parseAdminMessagesListQuery,
} from "@/lib/contact/admin-messages-query";
import { parseArchiveMeta } from "@/lib/contact/archive-meta";
import {
  countContactSubmissionsInWindow,
  deleteContactMessage,
  saveContactMessage,
  updateContactMessageStatus,
} from "@/lib/contact/messages";
import {
  CONTACT_LIMITS,
  parseContactPayload,
} from "@/lib/contact-schema";
import { buildContactEmail } from "@/lib/email/templates/contact";
import {
  sanitizeEmailSubject,
  sanitizeReplyTo,
} from "@/lib/email/sanitize-email-headers";
import { FORM_SECURITY } from "@/lib/security/constants";
import {
  checkContactEmailDailyLimit,
  checkContactIpDailyLimit,
  clearContactDailyLimitsForTests,
} from "@/lib/security/contact-daily-limit";
import { hashForAudit } from "@/lib/security/fingerprint";
import { verifyFormRequestOrigin } from "@/lib/security/request-origin";
import { ValidationErrors } from "@/lib/validation-errors";

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

function validContact(overrides: Record<string, unknown> = {}) {
  return {
    name: "Jean Dupont",
    email: "jean@example.com",
    message: "Bonjour, je souhaite un devis pour mon projet web.",
    _honeypot: "",
    ...overrides,
  };
}

describe("OWASP A01 — Broken Access Control (inbox admin contact)", () => {
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
      "'; DROP TABLE contact_messages;--",
      "../../../etc/passwd",
      "00000000-0000-0000-0000-000000000000",
      "08d86636-9162-4aca-9fb8-b2f77ad90539' OR '1'='1",
    ]) {
      assert.equal(
        await updateContactMessageStatus(badId, { status: "read" }),
        false,
        `update ${badId}`
      );
      assert.equal(await deleteContactMessage(badId), false, `delete ${badId}`);
    }
  });

  it("whitelist status PATCH stricte (anti mass-assignment)", () => {
    const invalid = [
      "all",
      "deleted",
      "pending",
      "READ",
      "archived\n",
      "unread;drop",
      "",
      null,
      1,
      {},
    ];
    for (const v of invalid) {
      assert.equal(isValidContactMessageStatus(v), false, String(v));
    }
    for (const v of ["unread", "read", "archived"] as const) {
      assert.equal(isValidContactMessageStatus(v), true);
    }
  });

  it("query admin : status injection → all (défaut sûr)", () => {
    for (const status of [
      "unread' OR '1'='1",
      "archived; DROP TABLE--",
      "../../read",
    ]) {
      const q = parseAdminMessagesListQuery(
        new URL(
          `http://localhost/api/admin/messages?status=${encodeURIComponent(status)}`
        )
      );
      assert.equal(q.status, "all", status);
    }
  });
});

describe("OWASP A03 — Injection (payload contact / HTML / archive URL)", () => {
  it("sanitizePersonName retire < > CR/LF du nom", () => {
    const r = parseContactPayload(
      validContact({
        name: "Evil\r\nBcc: bad@evil.com<script>x</script>",
      })
    );
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.data.name.includes("<"), false);
      assert.equal(r.data.name.includes("\r"), false);
      assert.equal(r.data.name.includes("\n"), false);
    }
  });

  it("null bytes / contrôles retirés du message", () => {
    const r = parseContactPayload(
      validContact({
        message: "Message propre\u0000avec null\u0007 bell assez long.",
      })
    );
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.data.message.includes("\u0000"), false);
  });

  it("buildContactEmail échappe XSS dans HTML", () => {
    const content = buildContactEmail({
      name: `<img src=x onerror="alert(1)">`,
      email: "safe@test.com",
      message: `<script>alert(1)</script>\nSuite du message.`,
    });
    assert.equal(content.html.includes("<script>"), false);
    assert.equal(content.html.includes("<img"), false);
    assert.match(content.html, /&lt;script&gt;/);
    assert.match(content.html, /&lt;img/);
  });

  it("sujet / replyTo : pas de CRLF après sanitizers", () => {
    const content = buildContactEmail({
      name: "Nom\r\nBcc: leak@evil.com",
      email: "reply@evil.com\r\nBcc: other@evil.com",
      message: "Message assez long pour être valide ici.",
    });
    const subject = sanitizeEmailSubject(content.subject);
    assert.equal(subject.includes("\r"), false);
    assert.equal(subject.includes("\n"), false);
    assert.equal(sanitizeReplyTo(content.replyTo ?? ""), undefined);
  });

  it("archive conversationUrl refuse schémas dangereux", () => {
    for (const url of [
      "javascript:alert(1)",
      "data:text/html,<script>",
      "file:///etc/passwd",
      "vbscript:msgbox(1)",
      "//evil.com/phishing",
      "/relative/path",
    ]) {
      const r = parseArchiveMeta({ conversationUrl: url });
      assert.equal(r.ok, false, url);
    }
  });

  it("honeypot bot → honeypot sans fuite métier", () => {
    const r = parseContactPayload(validContact({ _honeypot: "http://spam" }));
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, "honeypot");
  });
});

describe("OWASP A04 — Insecure Design (anti-abus contact)", () => {
  beforeEach(() => {
    clearContactDailyLimitsForTests();
    setEnv("SUPABASE_SERVICE_ROLE_KEY", undefined);
    setEnv("NEXT_PUBLIC_SUPABASE_URL", undefined);
  });
  afterEach(restoreEnv);

  it("plafonds journaliers IP + email définis", () => {
    assert.equal(FORM_SECURITY.CONTACT_IP_DAILY_MAX, 10);
    assert.equal(FORM_SECURITY.CONTACT_EMAIL_DAILY_MAX, 3);
    assert.ok(
      FORM_SECURITY.CONTACT_EMAIL_DAILY_MAX < FORM_SECURITY.CONTACT_IP_DAILY_MAX
    );
  });

  it("rate limit IP mémoire bloque après max", async () => {
    const ip = "203.0.113.88";
    for (let i = 0; i < FORM_SECURITY.CONTACT_IP_DAILY_MAX; i += 1) {
      assert.equal((await checkContactIpDailyLimit(ip)).allowed, true);
    }
    const blocked = await checkContactIpDailyLimit(ip);
    assert.equal(blocked.allowed, false);
    assert.ok((blocked.retryAfterSec ?? 0) > 0);
  });

  it("rate limit email mémoire bloque après max", async () => {
    const email = "rate-limit@example.com";
    for (let i = 0; i < FORM_SECURITY.CONTACT_EMAIL_DAILY_MAX; i += 1) {
      assert.equal((await checkContactEmailDailyLimit(email)).allowed, true);
    }
    assert.equal((await checkContactEmailDailyLimit(email)).allowed, false);
  });

  it("données validées respectent CHECK SQL (longueurs)", () => {
    const r = parseContactPayload(
      validContact({
        name: "Jo",
        message: "x".repeat(CONTACT_LIMITS.messageMin),
      })
    );
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.ok(r.data.name.length >= 2 && r.data.name.length <= 100);
      assert.ok(
        r.data.message.length >= 10 &&
          r.data.message.length <= CONTACT_LIMITS.messageMax
      );
      assert.ok(r.data.email.length <= 254);
    }
  });
});

describe("OWASP A05 — Security Misconfiguration (contact)", () => {
  beforeEach(() => {
    setEnv("SUPABASE_SERVICE_ROLE_KEY", undefined);
    setEnv("NEXT_PUBLIC_SUPABASE_URL", undefined);
    setEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", undefined);
  });
  afterEach(restoreEnv);

  it("saveContactMessage refuse sans service_role", async () => {
    const r = await saveContactMessage({
      name: "Jean",
      email: "j@example.com",
      message: "Message valide assez long pour test sécurité.",
      fingerprint: "fp-sec-contact",
      ip: "127.0.0.1",
    });
    assert.equal(r.ok, false);
  });

  it("countContactSubmissionsInWindow null sans Supabase (fail soft → mémoire)", async () => {
    const stats = await countContactSubmissionsInWindow({
      since: new Date(
        Date.now() - FORM_SECURITY.CONTACT_EMAIL_DAILY_WINDOW_MS
      ).toISOString(),
      email: "t@example.com",
    });
    assert.equal(stats, null);
  });
});

describe("OWASP A01/A08 — CSRF origine formulaire contact", () => {
  const envSnapshot = { ...process.env };

  beforeEach(() => {
    process.env = { ...envSnapshot, NODE_ENV: "production" };
    delete process.env.FORM_ALLOWED_ORIGINS;
    process.env.NEXT_PUBLIC_SITE_URL = "https://zishi.dev";
  });

  afterEach(() => {
    process.env = { ...envSnapshot };
  });

  it("origine étrangère rejetée pour /api/contact", () => {
    const req = new Request("https://zishi.dev/api/contact", {
      method: "POST",
      headers: {
        origin: "https://evil.example",
        "content-type": "application/json",
      },
    });
    assert.equal(verifyFormRequestOrigin(req), false);
  });

  it("origine site autorisée", () => {
    const req = new Request("https://zishi.dev/api/contact", {
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
    const req = new Request("http://localhost:3000/api/contact", {
      method: "POST",
      headers: {
        origin: "http://localhost:3000",
        "content-type": "application/json",
      },
    });
    assert.equal(verifyFormRequestOrigin(req), true);
  });
});

describe("OWASP A09 — Logging / Privacy (hashes contact)", () => {
  it("hash IP : 12 hex, pas de plaintext", () => {
    const ip = "198.51.100.44";
    const h = hashForAudit(ip);
    assert.equal(h, hashForAudit(ip));
    assert.equal(h.includes(ip), false);
    assert.match(h, /^[a-f0-9]{12}$/);
  });

  it("email normalisé lowercase avant rate-limit / insert", () => {
    const r = parseContactPayload(
      validContact({ email: "  MixedCase@Example.COM  " })
    );
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.data.email, "mixedcase@example.com");
  });

  it("clés d'erreur rate-limit stables (pas de fuite technique)", () => {
    assert.equal(ValidationErrors.dailyRateLimited, "dailyRateLimited");
    assert.equal(ValidationErrors.rateLimited, "rateLimited");
    assert.equal(ValidationErrors.unauthorized, "unauthorized");
  });
});

describe("OWASP A03/A08 — forme payload contact", () => {
  it("rejette body non-objet / pollution de forme", () => {
    for (const body of [[], null, "x", 42, true]) {
      const r = parseContactPayload(body);
      assert.equal(r.ok, false);
      if (!r.ok) assert.equal(r.error, ValidationErrors.invalidRequest);
    }
  });

  it("rejette emails invalides / injection", () => {
    for (const email of [
      "",
      "pas-un-email",
      "a@",
      "@b.com",
      "a b@c.com",
      "evil@test.com\r\nBcc:x@y.com",
    ]) {
      const r = parseContactPayload(validContact({ email }));
      assert.equal(r.ok, false, email);
    }
  });
});
