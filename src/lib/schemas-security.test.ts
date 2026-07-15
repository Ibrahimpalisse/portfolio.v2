import assert from "node:assert/strict";
import { describe, it, afterEach } from "node:test";
import { parseContactPayload } from "@/lib/contact-schema";
import { parseReviewPayload, isSafeHttpUrl } from "@/lib/review-schema";
import { parseAdminLoginBody } from "@/lib/admin/login-schema";
import { parseAdminMfaVerifyBody } from "@/lib/admin/mfa-schema";
import { isAllowedAdminEmail, getAdminAllowedEmails } from "@/lib/admin/allowlist";
import { ValidationErrors } from "@/lib/validation-errors";

describe("OWASP — parseContactPayload", () => {
  it("accepte une soumission valide", () => {
    const result = parseContactPayload({
      name: "Jean Dupont",
      email: "jean@example.com",
      message: "Bonjour, je souhaite un devis pour mon site.",
      _honeypot: "",
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.data.email, "jean@example.com");
      assert.equal(result.data.name, "Jean Dupont");
    }
  });

  it("rejette le honeypot silencieusement côté parseur", () => {
    const result = parseContactPayload({
      name: "Bot",
      email: "bot@spam.com",
      message: "Spam message long enough",
      _honeypot: "filled",
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error, "honeypot");
  });

  it("sanitise les champs XSS/injection", () => {
    const result = parseContactPayload({
      name: "<img onerror=alert(1)>",
      email: "test@example.com",
      message: "Message valide assez long pour passer.",
      _honeypot: "",
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.data.name.includes("<"), false);
    }
  });

  it("rejette message trop court", () => {
    const result = parseContactPayload({
      name: "Jean",
      email: "jean@example.com",
      message: "court",
      _honeypot: "",
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error, ValidationErrors.messageTooShortMin);
  });
});

describe("OWASP — parseReviewPayload", () => {
  it("accepte un avis valide", () => {
    const result = parseReviewPayload({
      name: "Marie",
      rating: 5,
      message: "Excellent travail, très professionnel.",
      _honeypot: "",
    });
    assert.equal(result.ok, true);
  });

  it("rejette une note hors plage", () => {
    for (const rating of [0, 6, 3.5, NaN]) {
      const result = parseReviewPayload({
        name: "Marie",
        rating,
        message: "Message valide assez long.",
        _honeypot: "",
      });
      assert.equal(result.ok, false);
    }
  });

  it("isSafeHttpUrl n'autorise que http(s)", () => {
    assert.equal(isSafeHttpUrl("https://zishi.dev"), true);
    assert.equal(isSafeHttpUrl("http://localhost:3000"), true);
    assert.equal(isSafeHttpUrl("javascript:alert(1)"), false);
    assert.equal(isSafeHttpUrl("file:///etc/passwd"), false);
  });
});

describe("OWASP A07 — admin login & allowlist", () => {
  const envSnapshot = { ...process.env };

  afterEach(() => {
    process.env = envSnapshot;
  });

  it("parseAdminLoginBody rejette honeypot", () => {
    const result = parseAdminLoginBody({
      email: "admin@test.com",
      password: "password123",
      _honeypot: "bot",
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error, "honeypot");
  });

  it("parseAdminLoginBody valide email et mot de passe minimum", () => {
    const result = parseAdminLoginBody({
      email: "admin@test.com",
      password: "short",
      _honeypot: "",
    });
    assert.equal(result.ok, false);

    const valid = parseAdminLoginBody({
      email: "Admin@Test.com",
      password: "validpass",
      _honeypot: "",
    });
    assert.equal(valid.ok, true);
    if (valid.ok) assert.equal(valid.data.email, "admin@test.com");
  });

  it("isAllowedAdminEmail respecte la liste blanche", () => {
    process.env.ADMIN_ALLOWED_EMAILS = "admin@zishi.dev, ops@zishi.dev";
    assert.equal(getAdminAllowedEmails().length, 2);
    assert.equal(isAllowedAdminEmail("admin@zishi.dev"), true);
    assert.equal(isAllowedAdminEmail("hacker@evil.com"), false);
    assert.equal(isAllowedAdminEmail(null), false);
  });

  it("refuse tout accès admin si liste vide", () => {
    delete process.env.ADMIN_ALLOWED_EMAILS;
    assert.equal(getAdminAllowedEmails().length, 0);
    assert.equal(isAllowedAdminEmail("admin@zishi.dev"), false);
  });
});

describe("OWASP A07 — MFA TOTP verify", () => {
  it("parseAdminMfaVerifyBody accepte un code 6 chiffres", () => {
    const result = parseAdminMfaVerifyBody({
      code: "123456",
      factorId: "factor-uuid",
      challengeId: "challenge-uuid",
    });
    assert.equal(result.ok, true);
  });

  it("parseAdminMfaVerifyBody rejette un code invalide", () => {
    for (const code of ["12345", "1234567", "abcdef", ""]) {
      const result = parseAdminMfaVerifyBody({
        code,
        factorId: "factor-uuid",
        challengeId: "challenge-uuid",
      });
      assert.equal(result.ok, false);
    }
  });
});
