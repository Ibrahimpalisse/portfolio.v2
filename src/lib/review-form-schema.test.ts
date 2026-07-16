import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createReviewFormSchema,
  reviewFormDefaultValues,
} from "@/lib/review-form-schema";
import { REVIEW_LIMITS } from "@/lib/review-schema";
import { ValidationErrors, type ValidationErrorKey } from "@/lib/validation-errors";

const t = (key: ValidationErrorKey) => key;

describe("createReviewFormSchema — validation client avis", () => {
  const schema = createReviewFormSchema(t);

  function valid(overrides: Record<string, unknown> = {}) {
    return {
      name: "Jean Dupont",
      email: "jean@example.com",
      role: "Lead",
      rating: 5,
      message: "Excellent travail, très professionnel.",
      _honeypot: "",
      ...overrides,
    };
  }

  it("accepte un formulaire valide", () => {
    const result = schema.safeParse(valid());
    assert.equal(result.success, true);
  });

  it("valeurs par défaut : rating 0 (invalide jusqu'au choix)", () => {
    assert.equal(reviewFormDefaultValues.rating, 0);
    const result = schema.safeParse(reviewFormDefaultValues);
    assert.equal(result.success, false);
  });

  it("trim les champs avant validation", () => {
    const result = schema.safeParse(
      valid({
        name: "  Jean  ",
        email: "  jean@example.com  ",
        message: "  Message assez long pour passer.  ",
      })
    );
    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.data.name, "Jean");
      assert.equal(result.data.email, "jean@example.com");
    }
  });

  it("exige un email", () => {
    const result = schema.safeParse(valid({ email: "" }));
    assert.equal(result.success, false);
  });

  it("rejette email invalide", () => {
    const result = schema.safeParse(valid({ email: "pas-email" }));
    assert.equal(result.success, false);
  });

  it("rejette nom trop court / trop long", () => {
    assert.equal(schema.safeParse(valid({ name: "A" })).success, false);
    assert.equal(
      schema.safeParse(valid({ name: "x".repeat(REVIEW_LIMITS.nameMax + 1) }))
        .success,
      false
    );
  });

  it("rejette message trop court / trop long", () => {
    assert.equal(schema.safeParse(valid({ message: "court" })).success, false);
    assert.equal(
      schema.safeParse(
        valid({ message: "m".repeat(REVIEW_LIMITS.messageMax + 1) })
      ).success,
      false
    );
  });

  it("rejette rating hors plage", () => {
    for (const rating of [0, 6, -1]) {
      assert.equal(
        schema.safeParse(valid({ rating })).success,
        false,
        `rating ${rating}`
      );
    }
  });

  it("role optionnel mais borné", () => {
    assert.equal(schema.safeParse(valid({ role: "" })).success, true);
    assert.equal(
      schema.safeParse(
        valid({ role: "r".repeat(REVIEW_LIMITS.roleMax + 1) })
      ).success,
      false
    );
  });

  it("clés d'erreur alignées ValidationErrors", () => {
    const short = schema.safeParse(valid({ name: "A" }));
    assert.equal(short.success, false);
    if (!short.success) {
      assert.ok(
        short.error.issues.some(
          (i) => i.message === ValidationErrors.nameTooShortMin
        )
      );
    }
  });
});
