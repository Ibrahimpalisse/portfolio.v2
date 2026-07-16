import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isValidProjectSlug,
  resolveProjectSlug,
  slugifyProjectTitle,
} from "@/lib/projects/slug";

describe("project slug", () => {
  it("slugifie un titre FR", () => {
    assert.equal(slugifyProjectTitle("Maison Belle Café"), "maison-belle-cafe");
    assert.equal(slugifyProjectTitle("  Nova  App  "), "nova-app");
  });

  it("ignore un titre purement arabe", () => {
    assert.equal(slugifyProjectTitle("مشروع جديد"), "");
  });

  it("accepte un slug valide", () => {
    assert.equal(isValidProjectSlug("maison-belle"), true);
    assert.equal(isValidProjectSlug("Bad Slug"), false);
    assert.equal(isValidProjectSlug("a"), false);
  });

  it("resolveProjectSlug préfère le slug valide", () => {
    assert.equal(resolveProjectSlug("mon-site", "Autre Titre"), "mon-site");
    assert.equal(resolveProjectSlug("Bad!", "Mon Site"), "mon-site");
  });

  it("fallback horodaté si titre inexploitable", () => {
    const slug = resolveProjectSlug("", "مشروع");
    assert.match(slug, /^projet-[a-z0-9]+$/);
  });
});
