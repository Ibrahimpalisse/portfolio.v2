import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isSafeHttpUrl,
  parseReviewPayload,
  REVIEW_LIMITS,
} from "@/lib/review-schema";
import { ValidationErrors } from "@/lib/validation-errors";

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    name: "Jean Dupont",
    email: "jean@example.com",
    role: "CEO — Acme",
    rating: 5,
    message: "Excellent travail, très professionnel et réactif.",
    _honeypot: "",
    ...overrides,
  };
}

describe("parseReviewPayload — validation serveur avis", () => {
  it("accepte un avis valide et normalise l'email", () => {
    const parsed = parseReviewPayload(
      validBody({ email: "  Jean.Dupont@Example.COM " })
    );
    assert.equal(parsed.ok, true);
    if (parsed.ok) {
      assert.equal(parsed.data.email, "jean.dupont@example.com");
      assert.equal(parsed.data.name, "Jean Dupont");
      assert.equal(parsed.data.rating, 5);
      assert.ok(parsed.data.role);
    }
  });

  it("exige un email (plus d'avis anonymes)", () => {
    for (const email of [undefined, "", "   ", null]) {
      const parsed = parseReviewPayload(validBody({ email }));
      assert.equal(parsed.ok, false);
      if (!parsed.ok) {
        assert.equal(parsed.error, ValidationErrors.emailRequired);
        assert.equal(parsed.field, "email");
      }
    }
  });

  it("rejette un email invalide", () => {
    for (const email of ["pas-un-email", "a@", "@b.com", "a b@c.com"]) {
      const parsed = parseReviewPayload(validBody({ email }));
      assert.equal(parsed.ok, false, `email: ${email}`);
      if (!parsed.ok) {
        assert.equal(parsed.error, ValidationErrors.emailInvalid);
      }
    }
  });

  it("rejette body non objet / tableau", () => {
    for (const body of [null, undefined, "x", 1, [], true]) {
      const parsed = parseReviewPayload(body);
      assert.equal(parsed.ok, false);
      if (!parsed.ok) assert.equal(parsed.error, ValidationErrors.invalidRequest);
    }
  });

  it("honeypot rempli → honeypot (pas d'erreur métier)", () => {
    const parsed = parseReviewPayload(validBody({ _honeypot: "bot" }));
    assert.equal(parsed.ok, false);
    if (!parsed.ok) assert.equal(parsed.error, "honeypot");
  });

  it("rejette nom trop court", () => {
    const parsed = parseReviewPayload(validBody({ name: "A" }));
    assert.equal(parsed.ok, false);
    if (!parsed.ok) {
      assert.equal(parsed.error, ValidationErrors.nameTooShort);
      assert.equal(parsed.field, "name");
    }
  });

  it("rejette message trop court", () => {
    const parsed = parseReviewPayload(validBody({ message: "court" }));
    assert.equal(parsed.ok, false);
    if (!parsed.ok) {
      assert.equal(parsed.error, ValidationErrors.messageTooShortMin);
      assert.equal(parsed.field, "message");
    }
  });

  it("rejette rating hors 1–5 ou non entier", () => {
    for (const rating of [0, 6, 3.5, "abc", null, undefined, NaN]) {
      const parsed = parseReviewPayload(validBody({ rating }));
      assert.equal(parsed.ok, false, `rating: ${String(rating)}`);
      if (!parsed.ok) {
        assert.equal(parsed.error, ValidationErrors.ratingInvalidRange);
        assert.equal(parsed.field, "rating");
      }
    }
  });

  it("accepte ratings 1 à 5", () => {
    for (const rating of [1, 2, 3, 4, 5]) {
      const parsed = parseReviewPayload(validBody({ rating }));
      assert.equal(parsed.ok, true, `rating: ${rating}`);
      if (parsed.ok) assert.equal(parsed.data.rating, rating);
    }
  });

  it("role optionnel : vide → undefined", () => {
    const parsed = parseReviewPayload(validBody({ role: "   " }));
    assert.equal(parsed.ok, true);
    if (parsed.ok) assert.equal(parsed.data.role, undefined);
  });

  it("tronque aux limites REVIEW_LIMITS sans crash", () => {
    const parsed = parseReviewPayload(
      validBody({
        name: "N".repeat(REVIEW_LIMITS.nameMax + 50),
        message: "M".repeat(REVIEW_LIMITS.messageMax + 50),
        role: "R".repeat(REVIEW_LIMITS.roleMax + 50),
      })
    );
    assert.equal(parsed.ok, true);
    if (parsed.ok) {
      assert.ok(parsed.data.name.length <= REVIEW_LIMITS.nameMax);
      assert.ok(parsed.data.message.length <= REVIEW_LIMITS.messageMax);
      assert.ok((parsed.data.role?.length ?? 0) <= REVIEW_LIMITS.roleMax);
    }
  });

  it("REVIEW_LIMITS — bornes attendues", () => {
    assert.equal(REVIEW_LIMITS.nameMin, 2);
    assert.equal(REVIEW_LIMITS.messageMin, 10);
    assert.equal(REVIEW_LIMITS.messageMax, 2000);
    assert.equal(REVIEW_LIMITS.emailMax, 254);
  });
});

describe("isSafeHttpUrl", () => {
  it("autorise http/https uniquement", () => {
    assert.equal(isSafeHttpUrl("https://example.com/x"), true);
    assert.equal(isSafeHttpUrl("http://example.com"), true);
    assert.equal(isSafeHttpUrl("javascript:alert(1)"), false);
    assert.equal(isSafeHttpUrl("ftp://evil"), false);
    assert.equal(isSafeHttpUrl("not-a-url"), false);
  });
});
