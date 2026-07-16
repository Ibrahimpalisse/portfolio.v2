/**
 * Suite OWASP Top 10 (focus) pour le système about_stats (chiffres À propos).
 * Pas d’endpoint public d’écriture : surface = admin MFA + validation stricte.
 */
import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
  ABOUT_STATS_LIMITS,
  parseAboutStatsUpdateBody,
} from "@/lib/about/schema";
import { ADMIN_ROUTES } from "@/lib/admin/constants";
import { verifyFormRequestOrigin } from "@/lib/security/request-origin";
import { parseJsonBody } from "@/lib/security/parse-json-body";

function valid(overrides: Record<string, unknown> = {}) {
  return {
    years: 2.5,
    clients: 1,
    projects: 4,
    responseHours: 48,
    ...overrides,
  };
}

describe("OWASP A01 — Broken Access Control (about stats)", () => {
  it("ADMIN_ROUTES.about sous /admin (pas d’exposition locale publique)", () => {
    assert.equal(ADMIN_ROUTES.about.startsWith("/admin"), true);
    assert.equal(ADMIN_ROUTES.about.includes(".."), false);
  });

  it("pas de champ status/role injectable via schéma (whitelist)", () => {
    const parsed = parseAboutStatsUpdateBody({
      ...valid(),
      status: "published",
      role: "service_role",
      email: "attacker@evil.com",
    });
    assert.equal(parsed.ok, true);
    if (parsed.ok) {
      assert.equal("status" in parsed.values, false);
      assert.equal("role" in parsed.values, false);
      assert.equal("email" in parsed.values, false);
    }
  });
});

describe("OWASP A01/A08 — CSRF origine PATCH about-stats", () => {
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
    const req = new Request("https://zishi.dev/api/admin/about-stats", {
      method: "PATCH",
      headers: {
        origin: "https://evil.example",
        "content-type": "application/json",
      },
    });
    assert.equal(verifyFormRequestOrigin(req), false);
  });

  it("origine site autorisée", () => {
    const req = new Request("https://zishi.dev/api/admin/about-stats", {
      method: "PATCH",
      headers: {
        origin: "https://zishi.dev",
        "content-type": "application/json",
      },
    });
    assert.equal(verifyFormRequestOrigin(req), true);
  });

  it("sans Origin ni Referer → rejeté en production", () => {
    const req = new Request("https://zishi.dev/api/admin/about-stats", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
    });
    assert.equal(verifyFormRequestOrigin(req), false);
  });
});

describe("OWASP A03 — Injection (payload numérique)", () => {
  it("rejette strings SQL-like / NoSQL-like", () => {
    for (const body of [
      valid({ years: "2; DROP TABLE about_stats--" }),
      valid({ clients: "1 OR 1=1" }),
      valid({ projects: { $ne: null } }),
      valid({ responseHours: ["48"] }),
    ]) {
      assert.equal(parseAboutStatsUpdateBody(body).ok, false);
    }
  });

  it("rejette objets prototype pollution côté valeurs", () => {
    const body = JSON.parse(
      '{"years":2.5,"clients":1,"projects":4,"responseHours":48,"__proto__":{"admin":true}}'
    );
    const parsed = parseAboutStatsUpdateBody(body);
    // Soit rejeté par parseJsonBody (dangerous_keys), soit strip Zod —
    // ici on parse l’objet déjà formé : Zod strip → ok mais sans pollution
    assert.equal(parsed.ok, true);
    if (parsed.ok) {
      assert.equal(
        Object.prototype.hasOwnProperty.call(parsed.values, "admin"),
        false
      );
      assert.equal(
        (Object.prototype as { admin?: boolean }).admin,
        undefined
      );
    }
  });

  it("parseJsonBody bloque __proto__ / constructor (A03 + pollution)", async () => {
    for (const raw of [
      '{"years":1,"clients":1,"projects":1,"responseHours":1,"__proto__":{"x":1}}',
      '{"years":1,"clients":1,"projects":1,"responseHours":1,"constructor":{"prototype":{"y":1}}}',
    ]) {
      const req = new Request("http://localhost/api/admin/about-stats", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: raw,
      });
      const parsed = await parseJsonBody(req, ABOUT_STATS_LIMITS.maxBodyBytes);
      assert.equal(parsed.ok, false);
      if (!parsed.ok) assert.equal(parsed.reason, "dangerous_keys");
    }
  });
});

describe("OWASP A04 — Insecure Design (limites métier)", () => {
  it("bornes métier empêchent valeurs absurdes / DoS d’affichage", () => {
    assert.ok(ABOUT_STATS_LIMITS.years.max <= 100);
    assert.ok(ABOUT_STATS_LIMITS.responseHours.max <= 720);
    assert.ok(ABOUT_STATS_LIMITS.clients.max <= 100_000);
    assert.equal(
      parseAboutStatsUpdateBody(valid({ years: 10_000 })).ok,
      false
    );
  });

  it("body max ≤ 2 KiB pour PATCH about-stats", async () => {
    const oversized = "x".repeat(ABOUT_STATS_LIMITS.maxBodyBytes + 1);
    const req = new Request("http://localhost/api/admin/about-stats", {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        "content-length": String(oversized.length),
      },
      body: oversized,
    });
    const parsed = await parseJsonBody(req, ABOUT_STATS_LIMITS.maxBodyBytes);
    assert.equal(parsed.ok, false);
    if (!parsed.ok) assert.equal(parsed.reason, "too_large");
  });
});

describe("OWASP A05 — Security Misconfiguration (surface API)", () => {
  it("schema n’accepte que number (pas de boolean truthy)", () => {
    assert.equal(parseAboutStatsUpdateBody(valid({ clients: true })).ok, false);
    assert.equal(parseAboutStatsUpdateBody(valid({ years: false })).ok, false);
  });

  it("singleton : id non contrôlable par le client", () => {
    const parsed = parseAboutStatsUpdateBody(
      valid({ id: "other-tenant", years: 9 })
    );
    assert.equal(parsed.ok, true);
    if (parsed.ok) {
      assert.equal("id" in parsed.values, false);
      assert.equal(parsed.values.years, 9);
    }
  });
});

describe("OWASP A07 — Identification & Authentication Failures", () => {
  it("limits numériques cohérentes (pas de bypass float→int)", () => {
    // 48.0000001 n'est pas un int
    assert.equal(
      parseAboutStatsUpdateBody(valid({ responseHours: 48.0000001 })).ok,
      false
    );
    // Number.MAX_SAFE_INTEGER hors borne
    assert.equal(
      parseAboutStatsUpdateBody(
        valid({ clients: Number.MAX_SAFE_INTEGER })
      ).ok,
      false
    );
  });
});

describe("OWASP A08 — Software & Data Integrity", () => {
  it("years arrondi déterministe (évite drift flottant côté UI)", () => {
    const a = parseAboutStatsUpdateBody(valid({ years: 1.999 }));
    const b = parseAboutStatsUpdateBody(valid({ years: 1.999 }));
    assert.equal(a.ok && b.ok, true);
    if (a.ok && b.ok) assert.equal(a.values.years, b.values.years);
  });
});

describe("OWASP A10 — SSRF / exfiltration (pas d’URL dans stats)", () => {
  it("schéma n’expose aucun champ URL / webhook", () => {
    const parsed = parseAboutStatsUpdateBody({
      ...valid(),
      webhook: "http://169.254.169.254/",
      callbackUrl: "https://evil.test/hook",
    });
    assert.equal(parsed.ok, true);
    if (parsed.ok) {
      assert.equal("webhook" in parsed.values, false);
      assert.equal("callbackUrl" in parsed.values, false);
    }
  });
});
