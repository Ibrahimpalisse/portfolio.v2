import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CONTACT_LIMITS,
  parseContactPayload,
  validateContactForm,
} from "@/lib/contact-schema";
import { ValidationErrors } from "@/lib/validation-errors";

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    name: "Jean Dupont",
    email: "jean@example.com",
    message: "Bonjour, je souhaite un devis pour mon projet web.",
    _honeypot: "",
    ...overrides,
  };
}

describe("parseContactPayload — validation serveur contact", () => {
  it("accepte un message valide et normalise l'email", () => {
    const parsed = parseContactPayload(
      validBody({ email: "  Jean.Dupont@Example.COM " })
    );
    assert.equal(parsed.ok, true);
    if (parsed.ok) {
      assert.equal(parsed.data.email, "jean.dupont@example.com");
      assert.equal(parsed.data.name, "Jean Dupont");
    }
  });

  it("validateContactForm délègue à parseContactPayload", () => {
    const a = parseContactPayload(validBody());
    const b = validateContactForm(validBody() as never);
    assert.deepEqual(a, b);
  });

  it("rejette body non objet / tableau", () => {
    for (const body of [null, undefined, "x", 1, [], true]) {
      const parsed = parseContactPayload(body);
      assert.equal(parsed.ok, false);
      if (!parsed.ok) assert.equal(parsed.error, ValidationErrors.invalidRequest);
    }
  });

  it("honeypot rempli → honeypot", () => {
    const parsed = parseContactPayload(validBody({ _honeypot: "bot" }));
    assert.equal(parsed.ok, false);
    if (!parsed.ok) assert.equal(parsed.error, "honeypot");
  });

  it("rejette nom trop court", () => {
    const parsed = parseContactPayload(validBody({ name: "A" }));
    assert.equal(parsed.ok, false);
    if (!parsed.ok) {
      assert.equal(parsed.error, ValidationErrors.nameTooShort);
      assert.equal(parsed.field, "name");
    }
  });

  it("rejette email invalide / vide", () => {
    for (const email of ["", "bad", "a@", "@b.co"]) {
      const parsed = parseContactPayload(validBody({ email }));
      assert.equal(parsed.ok, false, email);
      if (!parsed.ok) {
        assert.equal(parsed.error, ValidationErrors.emailInvalid);
        assert.equal(parsed.field, "email");
      }
    }
  });

  it("rejette message trop court", () => {
    const parsed = parseContactPayload(validBody({ message: "court" }));
    assert.equal(parsed.ok, false);
    if (!parsed.ok) {
      assert.equal(parsed.error, ValidationErrors.messageTooShortMin);
      assert.equal(parsed.field, "message");
    }
  });

  it("tronque aux CONTACT_LIMITS sans crash", () => {
    const parsed = parseContactPayload(
      validBody({
        name: "N".repeat(CONTACT_LIMITS.nameMax + 50),
        message: "M".repeat(CONTACT_LIMITS.messageMax + 50),
      })
    );
    assert.equal(parsed.ok, true);
    if (parsed.ok) {
      assert.ok(parsed.data.name.length <= CONTACT_LIMITS.nameMax);
      assert.ok(parsed.data.message.length <= CONTACT_LIMITS.messageMax);
    }
  });

  it("CONTACT_LIMITS — bornes attendues", () => {
    assert.equal(CONTACT_LIMITS.nameMin, 2);
    assert.equal(CONTACT_LIMITS.messageMin, 10);
    assert.equal(CONTACT_LIMITS.messageMax, 5000);
    assert.equal(CONTACT_LIMITS.emailMax, 254);
  });
});
