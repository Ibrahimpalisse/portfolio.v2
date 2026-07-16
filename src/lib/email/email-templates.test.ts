import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildContactEmail } from "@/lib/email/templates/contact";
import { buildReviewEmail } from "@/lib/email/templates/review";
import { emailField, wrapEmailLayout } from "@/lib/email/templates/layout";

describe("email templates — HTML brut sans cadre ni styles", () => {
  it("wrapEmailLayout n'inclut pas de styles inline ni table de mise en page", () => {
    const html = wrapEmailLayout({
      title: "Test",
      bodyHtml: "<p>Contenu</p>",
      footerNote: "Footer",
    });
    assert.equal(html.includes("style="), false);
    assert.equal(html.includes("<table"), false);
    assert.equal(html.includes("border"), false);
    assert.equal(html.includes("border-radius"), false);
    assert.match(html, /<body>/);
    assert.match(html, /<p>Contenu<\/p>/);
  });

  it("emailField échappe le label XSS", () => {
    const field = emailField("<script>", "value");
    assert.equal(field.includes("<script>"), false);
    assert.match(field, /&lt;script&gt;/);
  });

  it("buildContactEmail — sujet, replyTo, texte brut", () => {
    const content = buildContactEmail({
      name: "Jean",
      email: "jean@example.com",
      message: "Bonjour\nLigne 2",
    });
    assert.match(content.subject, /Jean/);
    assert.equal(content.replyTo, "jean@example.com");
    assert.match(content.text, /jean@example.com/);
    assert.match(content.text, /Bonjour/);
  });

  it("buildContactEmail — neutralise XSS dans le HTML", () => {
    const content = buildContactEmail({
      name: "<img onerror=alert(1)>",
      email: "safe@test.com",
      message: "<script>alert(1)</script> message long enough",
    });
    assert.equal(content.html.includes("<script>"), false);
    assert.equal(content.html.includes("<img"), false);
    assert.match(content.html, /&lt;script&gt;/);
    assert.equal(content.html.includes("style="), false);
  });

  it("buildReviewEmail — note étoiles et champs optionnels", () => {
    const content = buildReviewEmail({
      name: "Marie",
      email: "",
      role: "",
      rating: 4,
      message: "Excellent travail, très professionnel.",
    });
    assert.match(content.subject, /4\/5/);
    assert.match(content.html, /★★★★/);
    assert.equal(content.replyTo, "");
  });

  it("buildReviewEmail — inclut email et rôle si présents", () => {
    const content = buildReviewEmail({
      name: "Paul",
      email: "paul@corp.com",
      role: "CEO",
      rating: 5,
      message: "Super collaboration sur le projet.",
    });
    assert.match(content.html, /paul@corp.com/);
    assert.match(content.html, /CEO/);
    assert.equal(content.replyTo, "paul@corp.com");
  });

  it("buildReviewEmail — neutralise XSS dans le HTML", () => {
    const content = buildReviewEmail({
      name: "<img onerror=alert(1)>",
      email: "safe@test.com",
      role: "<script>x</script>",
      rating: 3,
      message: "<script>alert(1)</script> message long enough",
    });
    assert.equal(content.html.includes("<script>"), false);
    assert.equal(content.html.includes("<img"), false);
    assert.match(content.html, /&lt;script&gt;/);
  });
});
