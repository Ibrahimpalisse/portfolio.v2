import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { escapeHtml, escapeHtmlWithBreaks } from "@/lib/email/escape-html";
import {
  sanitizeEmailSubject,
  sanitizeReplyTo,
} from "@/lib/email/sanitize-email-headers";
import {
  extractEmailAddress,
  isValidFromAddress,
  isValidNotifyAddress,
} from "@/lib/email/validate-address";

describe("OWASP A03 — email-security (XSS / injection en-têtes)", () => {
  it("escapeHtml neutralise les caractères HTML dangereux", () => {
    assert.equal(
      escapeHtml(`<img src=x onerror="alert('xss')">`),
      "&lt;img src=x onerror=&quot;alert(&#39;xss&#39;)&quot;&gt;"
    );
    assert.equal(escapeHtml("Tom & Jerry"), "Tom &amp; Jerry");
  });

  it("escapeHtmlWithBreaks préserve les sauts de ligne en <br>", () => {
    assert.equal(escapeHtmlWithBreaks("line1\n<script>"), "line1<br>&lt;script&gt;");
  });

  it("sanitizeEmailSubject bloque CR/LF", () => {
    const subject = sanitizeEmailSubject("Hello\r\nBcc: evil@test.com");
    assert.equal(subject.includes("\r"), false);
    assert.equal(subject.includes("\n"), false);
  });

  it("sanitizeReplyTo rejette injection et format invalide", () => {
    assert.equal(sanitizeReplyTo("not-an-email"), undefined);
    assert.equal(
      sanitizeReplyTo("attacker@evil.com\r\nBcc: other@evil.com"),
      undefined
    );
    assert.equal(sanitizeReplyTo("valid@test.com"), "valid@test.com");
  });

  it("isValidFromAddress valide Nom <email> sans injection", () => {
    assert.equal(isValidFromAddress("Portfolio <contact@zishi.dev>"), true);
    assert.equal(isValidFromAddress("Evil\r\n<bad@test.com>"), false);
    assert.equal(isValidFromAddress("contact@zishi.dev"), true);
  });

  it("isValidNotifyAddress valide les destinataires", () => {
    assert.equal(isValidNotifyAddress("notify@zishi.dev"), true);
    assert.equal(isValidNotifyAddress("bad"), false);
  });

  it("extractEmailAddress extrait l'email d'un format nommé", () => {
    assert.equal(
      extractEmailAddress("Vignes Ibrahim <Contact@Zishi.dev>"),
      "contact@zishi.dev"
    );
  });
});
