import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  contactFormDefaultValues,
  createContactFormSchema,
} from "@/lib/contact-form-schema";
import { CONTACT_LIMITS, parseContactPayload } from "@/lib/contact-schema";
import { ValidationErrors, type ValidationErrorKey } from "@/lib/validation-errors";

const t = (key: ValidationErrorKey) => key;

describe("createContactFormSchema — validation client", () => {
  const schema = createContactFormSchema(t);

  it("accepte un formulaire valide", () => {
    const result = schema.safeParse({
      name: "Jean Dupont",
      email: "jean@example.com",
      message: "Bonjour, je souhaite un devis pour mon projet.",
      _honeypot: "",
    });
    assert.equal(result.success, true);
  });

  it("trim les champs avant validation", () => {
    const result = schema.safeParse({
      name: "  Jean  ",
      email: "  jean@example.com  ",
      message: "  Message assez long pour passer.  ",
      _honeypot: "",
    });
    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.data.name, "Jean");
      assert.equal(result.data.email, "jean@example.com");
    }
  });

  it("rejette un nom trop court", () => {
    const result = schema.safeParse({
      ...contactFormDefaultValues,
      name: "A",
      email: "a@b.co",
      message: "Message assez long ici.",
    });
    assert.equal(result.success, false);
  });

  it("rejette un nom trop long", () => {
    const result = schema.safeParse({
      name: "x".repeat(CONTACT_LIMITS.nameMax + 1),
      email: "a@b.co",
      message: "Message assez long ici.",
      _honeypot: "",
    });
    assert.equal(result.success, false);
  });

  it("rejette un email invalide ou vide", () => {
    for (const email of ["", "pas-un-email", "a@", "@b.com", "a b@c.com"]) {
      const result = schema.safeParse({
        name: "Jean",
        email,
        message: "Message assez long ici.",
        _honeypot: "",
      });
      assert.equal(result.success, false, `email devrait échouer: ${email}`);
    }
  });

  it("rejette un message trop court ou trop long", () => {
    const tooShort = schema.safeParse({
      name: "Jean",
      email: "a@b.co",
      message: "court",
      _honeypot: "",
    });
    assert.equal(tooShort.success, false);

    const tooLong = schema.safeParse({
      name: "Jean",
      email: "a@b.co",
      message: "m".repeat(CONTACT_LIMITS.messageMax + 1),
      _honeypot: "",
    });
    assert.equal(tooLong.success, false);
  });

  it("autorise le honeypot comme champ optionnel (filtré plus loin)", () => {
    const result = schema.safeParse({
      name: "Jean",
      email: "a@b.co",
      message: "Message assez long ici.",
      _honeypot: "bot-filled",
    });
    assert.equal(result.success, true);
  });

  it("fournit des valeurs par défaut sûres (vides)", () => {
    assert.equal(contactFormDefaultValues.name, "");
    assert.equal(contactFormDefaultValues.email, "");
    assert.equal(contactFormDefaultValues.message, "");
    assert.equal(contactFormDefaultValues._honeypot, "");
  });
});

describe("parseContactPayload — sécurité serveur (modale contact)", () => {
  it("rejette un body non-objet (prototype / type confusion)", () => {
    for (const body of [null, undefined, "string", 42, true, []]) {
      const result = parseContactPayload(body);
      assert.equal(result.ok, false);
      if (!result.ok) {
        assert.equal(result.error, ValidationErrors.invalidRequest);
      }
    }
  });

  it("rejette les champs non-string en les traitant comme vides", () => {
    const result = parseContactPayload({
      name: { $ne: null },
      email: ["x@y.com"],
      message: { text: "hack" },
      _honeypot: "",
    });
    assert.equal(result.ok, false);
  });

  it("normalise l'email en minuscules", () => {
    const result = parseContactPayload({
      name: "Jean",
      email: "  Jean.DUPONT@Example.COM  ",
      message: "Message assez long pour validation.",
      _honeypot: "",
    });
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.data.email, "jean.dupont@example.com");
  });

  it("tronque aux limites CONTACT_LIMITS", () => {
    const result = parseContactPayload({
      name: "N".repeat(CONTACT_LIMITS.nameMax + 50),
      email: "a@b.co",
      message: "M".repeat(CONTACT_LIMITS.messageMax + 50),
      _honeypot: "",
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.ok(result.data.name.length <= CONTACT_LIMITS.nameMax);
      assert.ok(result.data.message.length <= CONTACT_LIMITS.messageMax);
    }
  });

  it("retire les chevrons HTML du nom (sanitizePersonName)", () => {
    const result = parseContactPayload({
      name: "<script>alert(1)</script>Jean",
      email: "safe@example.com",
      message: "Hello world enough length for validation.",
      _honeypot: "",
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.data.name.includes("<"), false);
      assert.equal(result.data.name.includes(">"), false);
      assert.match(result.data.name, /Jean/);
    }
  });

  it("conserve le message textuel mais tronqué (échappement email côté template)", () => {
    const result = parseContactPayload({
      name: "Jean",
      email: "safe@example.com",
      message: "Hello <img src=x onerror=alert(1)> world enough length.",
      _honeypot: "",
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.ok(result.data.message.length <= CONTACT_LIMITS.messageMax);
      assert.ok(result.data.message.includes("Hello"));
    }
  });

  it("détecte honeypot même avec espaces", () => {
    const result = parseContactPayload({
      name: "Jean",
      email: "a@b.co",
      message: "Message assez long pour passer.",
      _honeypot: "  filled  ",
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error, "honeypot");
  });

  it("accepte exactement la longueur minimale du message", () => {
    const message = "x".repeat(CONTACT_LIMITS.messageMin);
    const result = parseContactPayload({
      name: "Jo",
      email: "a@b.co",
      message,
      _honeypot: "",
    });
    assert.equal(result.ok, true);
  });

  it("rejette un caractère sous la longueur minimale du message", () => {
    const message = "x".repeat(CONTACT_LIMITS.messageMin - 1);
    const result = parseContactPayload({
      name: "Jo",
      email: "a@b.co",
      message,
      _honeypot: "",
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.error, ValidationErrors.messageTooShortMin);
      assert.equal(result.field, "message");
    }
  });
});
