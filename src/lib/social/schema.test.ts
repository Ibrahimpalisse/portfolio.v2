import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  SITE_SOCIAL_LIMITS,
  parseSiteSocialUpdateBody,
} from "@/lib/social/schema";

function valid(overrides: Record<string, unknown> = {}) {
  return {
    contactEmail: "contact@zishi.dev",
    discord: "https://discord.gg/abc",
    whatsapp: "https://wa.me/33612345678",
    instagram: "",
    tiktok: "https://www.tiktok.com/@user",
    ...overrides,
  };
}

describe("parseSiteSocialUpdateBody", () => {
  it("accepte email + liens https valides + champs vides", () => {
    const parsed = parseSiteSocialUpdateBody(valid());
    assert.equal(parsed.ok, true);
    if (parsed.ok) {
      assert.equal(parsed.values.instagram, "");
      assert.equal(parsed.values.contactEmail, "contact@zishi.dev");
      assert.equal(parsed.values.discord, "https://discord.gg/abc");
    }
  });

  it("normalise l'email", () => {
    const parsed = parseSiteSocialUpdateBody(
      valid({ contactEmail: "  Contact@Zishi.DEV  " })
    );
    assert.equal(parsed.ok, true);
    if (parsed.ok) assert.equal(parsed.values.contactEmail, "contact@zishi.dev");
  });

  it("rejette email invalide / vide / trop long", () => {
    assert.equal(
      parseSiteSocialUpdateBody(valid({ contactEmail: "pas-un-email" })).ok,
      false
    );
    assert.equal(
      parseSiteSocialUpdateBody(valid({ contactEmail: "" })).ok,
      false
    );
    assert.equal(
      parseSiteSocialUpdateBody(
        valid({ contactEmail: `${"a".repeat(250)}@x.com` })
      ).ok,
      false
    );
  });

  it("rejette injection header email (CRLF)", () => {
    const parsed = parseSiteSocialUpdateBody(
      valid({ contactEmail: "evil@x.com\r\nBcc: leak@evil.com" })
    );
    assert.equal(parsed.ok, false);
  });

  it("rejette javascript / http / hôte hors whitelist", () => {
    assert.equal(
      parseSiteSocialUpdateBody(valid({ discord: "javascript:alert(1)" })).ok,
      false
    );
    assert.equal(
      parseSiteSocialUpdateBody(valid({ discord: "http://discord.gg/abc" })).ok,
      false
    );
    assert.equal(
      parseSiteSocialUpdateBody(
        valid({ discord: "https://evil.example/discord" })
      ).ok,
      false
    );
  });

  it("rejette Instagram hors domaine", () => {
    const parsed = parseSiteSocialUpdateBody(
      valid({ instagram: "https://facebook.com/x" })
    );
    assert.equal(parsed.ok, false);
    if (!parsed.ok) assert.equal(parsed.error, "invalid_instagram_url");
  });

  it("accepte chat.whatsapp.com / discord.com", () => {
    assert.equal(
      parseSiteSocialUpdateBody(
        valid({ whatsapp: "https://chat.whatsapp.com/Invite" })
      ).ok,
      true
    );
    assert.equal(
      parseSiteSocialUpdateBody(
        valid({ discord: "https://discord.com/users/123" })
      ).ok,
      true
    );
  });

  it("borne maxBodyBytes / urlMax / emailMax", () => {
    assert.ok(SITE_SOCIAL_LIMITS.maxBodyBytes <= 8_192);
    assert.equal(SITE_SOCIAL_LIMITS.urlMax, 500);
    assert.equal(SITE_SOCIAL_LIMITS.emailMax, 254);
  });

  it("strip clés inconnues (schéma object sans passthrough)", () => {
    const parsed = parseSiteSocialUpdateBody(
      valid({ role: "admin", id: "hack" })
    );
    assert.equal(parsed.ok, true);
    if (parsed.ok) {
      assert.equal("role" in parsed.values, false);
      assert.equal("id" in parsed.values, false);
    }
  });
});
