import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildSafeMailtoUrl,
  isHoneypotTriggered,
  isValidEmail,
  normalizeEmail,
  sanitizeForMailtoHeader,
  sanitizePersonName,
  sanitizeText,
  stripControlChars,
  MAILTO_MAX_URL_LENGTH,
} from "@/lib/form-validation";

describe("OWASP A03 — form-validation (injection / XSS entrée)", () => {
  it("supprime les caractères de contrôle et NULL bytes", () => {
    assert.equal(stripControlChars("a\x00b\x07c"), "abc");
  });

  it("normalise les emails", () => {
    assert.equal(normalizeEmail("  Test@Example.COM  "), "test@example.com");
  });

  it("rejette les emails invalides", () => {
    assert.equal(isValidEmail("invalid"), false);
    assert.equal(isValidEmail("a@b"), false);
    assert.equal(isValidEmail("contact@zishi.dev"), true);
  });

  it("rejette les emails trop longs (>254)", () => {
    const longLocal = "a".repeat(250);
    assert.equal(isValidEmail(`${longLocal}@test.com`), false);
  });

  it("détecte le honeypot rempli", () => {
    assert.equal(isHoneypotTriggered(""), false);
    assert.equal(isHoneypotTriggered("   "), false);
    assert.equal(isHoneypotTriggered("bot"), true);
  });

  it("tronque le texte sanitisé", () => {
    assert.equal(sanitizeText("  hello\x00world  ", 5), "hello");
  });

  it("sanitizePersonName retire HTML et retours ligne", () => {
    assert.equal(
      sanitizePersonName("<script>alert(1)</script>\nEvil", 100),
      "script alert(1) /script Evil"
    );
    assert.equal(sanitizePersonName("Jean   Dupont", 100), "Jean Dupont");
  });

  it("sanitizeForMailtoHeader bloque l'injection CR/LF (email header)", () => {
    const injected = "Subject\r\nBcc: attacker@evil.com";
    const clean = sanitizeForMailtoHeader(injected, 200);
    assert.equal(clean.includes("\r"), false);
    assert.equal(clean.includes("\n"), false);
  });

  it("buildSafeMailtoUrl encode correctement et limite la longueur", () => {
    const url = buildSafeMailtoUrl(
      "contact@test.com",
      "Bonjour",
      "Message avec accents éàù"
    );
    assert.ok(url);
    assert.match(url!, /^mailto:/);
    assert.ok(url!.length <= MAILTO_MAX_URL_LENGTH);

    const tooLong = buildSafeMailtoUrl(
      "contact@test.com",
      "x".repeat(1000),
      "y".repeat(2000)
    );
    assert.equal(tooLong, null);
  });
});
