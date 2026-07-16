import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readAdminApiError } from "@/lib/admin/api-error";
import { parseAdminLoginBody } from "@/lib/admin/login-schema";
import { getSafeAdminNextPath } from "@/lib/admin/safe-next";

describe("parseAdminLoginBody — login admin", () => {
  it("accepte un login valide et normalise l'email", () => {
    const result = parseAdminLoginBody({
      email: "  Admin@Example.COM ",
      password: "password123",
      _honeypot: "",
      turnstileToken: "tok_abc",
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.data.email, "admin@example.com");
      assert.equal(result.data.password, "password123");
      assert.equal(result.data.turnstileToken, "tok_abc");
    }
  });

  it("rejette honeypot", () => {
    const result = parseAdminLoginBody({
      email: "admin@example.com",
      password: "password123",
      _honeypot: "filled",
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error, "honeypot");
  });

  it("rejette body non-objet ou tableau", () => {
    for (const body of [null, undefined, "x", 1, true, []]) {
      const result = parseAdminLoginBody(body);
      assert.equal(result.ok, false);
      if (!result.ok) assert.equal(result.error, "invalid");
    }
  });

  it("rejette email ou mot de passe invalide", () => {
    assert.equal(
      parseAdminLoginBody({
        email: "not-an-email",
        password: "password123",
      }).ok,
      false
    );
    assert.equal(
      parseAdminLoginBody({
        email: "admin@example.com",
        password: "short",
      }).ok,
      false
    );
  });

  it("autorise turnstileToken optionnel / vide", () => {
    const without = parseAdminLoginBody({
      email: "admin@example.com",
      password: "password123",
    });
    assert.equal(without.ok, true);
    if (without.ok) assert.equal(without.data.turnstileToken, "");

    const empty = parseAdminLoginBody({
      email: "admin@example.com",
      password: "password123",
      turnstileToken: "   ",
    });
    assert.equal(empty.ok, true);
    if (empty.ok) assert.equal(empty.data.turnstileToken, "");
  });
});

describe("getSafeAdminNextPath", () => {
  it("autorise uniquement des chemins /admin", () => {
    assert.equal(getSafeAdminNextPath("/admin"), "/admin");
    assert.equal(getSafeAdminNextPath("/admin/"), "/admin/");
    assert.equal(getSafeAdminNextPath("/admin/connexion"), "/admin/connexion");
  });

  it("bloque les open-redirects", () => {
    for (const next of [
      null,
      "",
      "//evil.com",
      "https://evil.com",
      "/\\evil",
      "/admin-evil",
      "/api/admin/login",
      "../admin",
      "admin",
    ]) {
      assert.equal(getSafeAdminNextPath(next), null, String(next));
    }
  });
});

describe("readAdminApiError", () => {
  it("formate un 429 avec Retry-After en secondes", () => {
    const res = new Response(null, {
      status: 429,
      headers: { "Retry-After": "45" },
    });
    const msg = readAdminApiError(res, null);
    assert.match(msg, /45 secondes/i);
  });

  it("formate un 429 avec Retry-After en minutes", () => {
    const res = new Response(null, {
      status: 429,
      headers: { "Retry-After": "120" },
    });
    const msg = readAdminApiError(res, null);
    assert.match(msg, /2 minutes/i);
  });

  it("utilise le message body sinon le fallback", () => {
    const res = new Response(null, { status: 401 });
    assert.equal(
      readAdminApiError(res, { error: "Identifiants invalides." }),
      "Identifiants invalides."
    );
    assert.equal(readAdminApiError(res, null, "Fallback"), "Fallback");
  });
});
