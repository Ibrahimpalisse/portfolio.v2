/**
 * Suite OWASP Top 10 (focus) — settings site
 * (email affiché + liens Discord/WhatsApp/Instagram/TikTok).
 */
import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
  SITE_SOCIAL_LIMITS,
  parseSiteSocialUpdateBody,
} from "@/lib/social/schema";
import { ADMIN_ROUTES } from "@/lib/admin/constants";
import { verifyFormRequestOrigin } from "@/lib/security/request-origin";
import { parseJsonBody } from "@/lib/security/parse-json-body";
import { buildFooterSocials } from "@/lib/brand";
import { DEFAULT_CONTACT_EMAIL } from "@/data/site-social";

function valid(overrides: Record<string, unknown> = {}) {
  return {
    contactEmail: "contact@zishi.dev",
    discord: "",
    whatsapp: "",
    instagram: "",
    tiktok: "",
    ...overrides,
  };
}

describe("OWASP A01 — Broken Access Control (settings)", () => {
  it("route admin settings sous /admin", () => {
    assert.equal(ADMIN_ROUTES.settings, "/admin/settings");
    assert.equal(ADMIN_ROUTES.settings.startsWith("/admin"), true);
    assert.equal(ADMIN_ROUTES.settings.includes(".."), false);
  });

  it("mass-assignment : role/id non injectables", () => {
    const parsed = parseSiteSocialUpdateBody(
      valid({
        role: "service_role",
        id: "default', DROP TABLE--",
        contact_email: "evil@x.com",
      })
    );
    assert.equal(parsed.ok, true);
    if (parsed.ok) {
      assert.equal("role" in parsed.values, false);
      assert.equal("id" in parsed.values, false);
      assert.equal("contact_email" in parsed.values, false);
      assert.equal(parsed.values.contactEmail, "contact@zishi.dev");
    }
  });
});

describe("OWASP A01/A08 — CSRF origine PATCH settings", () => {
  const envSnapshot = { ...process.env };

  beforeEach(() => {
    process.env = { ...envSnapshot, NODE_ENV: "production" };
    delete process.env.FORM_ALLOWED_ORIGINS;
    process.env.NEXT_PUBLIC_SITE_URL = "https://zishi.dev";
  });

  afterEach(() => {
    process.env = { ...envSnapshot };
  });

  it("origine étrangère rejetée", () => {
    const req = new Request("https://zishi.dev/api/admin/social-links", {
      method: "PATCH",
      headers: {
        origin: "https://evil.example",
        "content-type": "application/json",
      },
    });
    assert.equal(verifyFormRequestOrigin(req), false);
  });

  it("origine site autorisée", () => {
    const req = new Request("https://zishi.dev/api/admin/social-links", {
      method: "PATCH",
      headers: {
        origin: "https://zishi.dev",
        "content-type": "application/json",
      },
    });
    assert.equal(verifyFormRequestOrigin(req), true);
  });

  it("sans Origin ni Referer → rejeté en production", () => {
    const req = new Request("https://zishi.dev/api/admin/social-links", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
    });
    assert.equal(verifyFormRequestOrigin(req), false);
  });
});

describe("OWASP A03 — Injection (email / URLs)", () => {
  it("rejette schemes dangereux sur réseaux", () => {
    for (const url of [
      "javascript:alert(1)",
      "data:text/html,<script>",
      "file:///etc/passwd",
      "https://evil.test/x",
    ]) {
      assert.equal(
        parseSiteSocialUpdateBody(valid({ discord: url })).ok,
        false,
        url
      );
    }
  });

  it("parseJsonBody bloque __proto__", async () => {
    const req = new Request("http://localhost/api/admin/social-links", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: '{"contactEmail":"a@b.co","__proto__":{"admin":true},"discord":"","whatsapp":"","instagram":"","tiktok":""}',
    });
    const parsed = await parseJsonBody(req, SITE_SOCIAL_LIMITS.maxBodyBytes);
    assert.equal(parsed.ok, false);
  });

  it("email : pas d'injection CRLF", () => {
    assert.equal(
      parseSiteSocialUpdateBody(
        valid({ contactEmail: "ok@x.com\nCc: bad@evil.com" })
      ).ok,
      false
    );
  });
});

describe("OWASP A04 — Insecure Design (limites)", () => {
  it("url / email / body bornés", () => {
    assert.ok(SITE_SOCIAL_LIMITS.urlMax <= 500);
    assert.ok(SITE_SOCIAL_LIMITS.emailMax <= 254);
    assert.ok(SITE_SOCIAL_LIMITS.maxBodyBytes <= 8_192);
  });

  it("https uniquement pour réseaux (pas http)", () => {
    assert.equal(
      parseSiteSocialUpdateBody(
        valid({ instagram: "http://www.instagram.com/x" })
      ).ok,
      false
    );
  });
});

describe("OWASP A05 — Misconfiguration (whitelist hôtes)", () => {
  it("chaque réseau a sa whitelist stricte", () => {
    assert.equal(
      parseSiteSocialUpdateBody(
        valid({ whatsapp: "https://www.instagram.com/x" })
      ).ok,
      false
    );
    assert.equal(
      parseSiteSocialUpdateBody(
        valid({ tiktok: "https://discord.gg/x" })
      ).ok,
      false
    );
  });
});

describe("OWASP A09 — Logging / erreurs sûres", () => {
  it("codes d'erreur stables (pas de détail Zod)", () => {
    const parsed = parseSiteSocialUpdateBody(valid({ contactEmail: "x" }));
    assert.equal(parsed.ok, false);
    if (!parsed.ok) {
      assert.match(parsed.error, /^invalid_/);
      assert.equal(parsed.error.includes("Zod"), false);
    }
  });
});

describe("OWASP A10 — Open redirect footer", () => {
  it("buildFooterSocials ne fabrique pas d'URL hors BDD validée", () => {
    const links = buildFooterSocials({
      discord: "",
      whatsapp: "",
      instagram: "",
      tiktok: "",
    });
    assert.ok(links.every((l) => l.href === "" || l.href.startsWith("https://")));
  });

  it("email contact par défaut sûr", () => {
    assert.equal(DEFAULT_CONTACT_EMAIL.includes("@"), true);
    assert.equal(DEFAULT_CONTACT_EMAIL.includes("\n"), false);
  });
});
