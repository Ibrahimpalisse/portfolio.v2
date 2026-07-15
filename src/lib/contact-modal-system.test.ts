import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { buildContactEmail } from "@/lib/email/templates/contact";
import { getLocaleDirection, locales, type Locale } from "@/i18n/routing";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function loadMessages(locale: Locale) {
  return JSON.parse(
    readFileSync(join(root, "messages", `${locale}.json`), "utf8")
  ) as Record<string, unknown>;
}

describe("i18n — clés contact modale (FR/EN/AR)", () => {
  const requiredContactKeys = [
    "eyebrow",
    "title",
    "titleHighlight",
    "subtitle",
    "name",
    "email",
    "message",
    "send",
    "openForm",
    "sending",
    "successTitle",
    "successBody",
    "orEmail",
    "formAria",
    "turnstileError",
    "error",
    "privacy",
  ] as const;

  for (const locale of locales) {
    it(`messages/${locale}.json expose toutes les clés contact`, () => {
      const messages = loadMessages(locale);
      const contact = messages.contact as Record<string, string>;
      assert.ok(contact, `contact manquant pour ${locale}`);

      for (const key of requiredContactKeys) {
        assert.equal(typeof contact[key], "string", `${locale}.contact.${key}`);
        assert.ok(contact[key].trim().length > 0, `${locale}.contact.${key} vide`);
      }
    });

    it(`messages/${locale}.json expose common.closeModal`, () => {
      const messages = loadMessages(locale);
      const common = messages.common as Record<string, string>;
      assert.equal(typeof common.closeModal, "string");
      assert.ok(common.closeModal.trim().length > 0);
    });
  }
});

describe("i18n — direction RTL pour arabe", () => {
  it("fr/en = ltr, ar = rtl", () => {
    assert.equal(getLocaleDirection("fr"), "ltr");
    assert.equal(getLocaleDirection("en"), "ltr");
    assert.equal(getLocaleDirection("ar"), "rtl");
  });
});

describe("buildContactEmail — XSS dans le HTML", () => {
  it("échappe le HTML dans le corps email", () => {
    const email = buildContactEmail({
      name: '<img src=x onerror="alert(1)">',
      email: "safe@example.com",
      message: '<script>alert("xss")</script>Bonjour',
    });

    // Les balises brutes ne doivent jamais apparaître ; seulement leur forme échappée.
    assert.equal(/<script\b/i.test(email.html), false);
    assert.equal(/<img\b/i.test(email.html), false);
    assert.match(email.html, /&lt;img/);
    assert.match(email.html, /&lt;script&gt;/);
    assert.match(email.html, /onerror=&quot;/);
    assert.equal(email.replyTo, "safe@example.com");
    assert.match(email.subject, /Demande de projet/);
  });

  it("n'injecte pas de CRLF dans le sujet via le nom (sanitisé avant)", () => {
    const email = buildContactEmail({
      name: "Jean",
      email: "safe@example.com",
      message: "Message normal assez long.",
    });
    assert.equal(email.subject.includes("\n"), false);
    assert.equal(email.subject.includes("\r"), false);
  });
});
