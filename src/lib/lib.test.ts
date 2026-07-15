import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isHoneypotTriggered,
  isValidEmail,
  normalizeEmail,
  sanitizeText,
} from "./form-validation.ts";
import { paginateReviews } from "./reviews-config.ts";
import { absoluteUrl, homeSectionUrl } from "./routes.ts";

describe("form-validation", () => {
  it("normalise les emails", () => {
    assert.equal(normalizeEmail("  Test@Example.COM  "), "test@example.com");
  });

  it("valide le format email", () => {
    assert.equal(isValidEmail("contact@zishi.dev"), true);
    assert.equal(isValidEmail("invalid"), false);
  });

  it("détecte le honeypot", () => {
    assert.equal(isHoneypotTriggered(""), false);
    assert.equal(isHoneypotTriggered("bot"), true);
  });

  it("tronque le texte sanitisé", () => {
    assert.equal(sanitizeText("  hello\x00world  ", 5), "hello");
  });
});

describe("reviews-config", () => {
  it("paginate les avis", () => {
    const items = Array.from({ length: 10 }, (_, i) => ({ id: String(i) }));
    const page1 = paginateReviews(items, 1, 9);
    assert.equal(page1.items.length, 9);
    assert.equal(page1.totalPages, 2);

    const page2 = paginateReviews(items, 2, 9);
    assert.equal(page2.items.length, 1);
    assert.equal(page2.page, 2);
  });
});

describe("routes", () => {
  it("construit les URLs absolues", () => {
    assert.match(absoluteUrl("/avis"), /^https?:\/\/.+\/avis$/);
    assert.equal(homeSectionUrl("contact"), "/#contact");
  });
});
