import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PROJECT_LIMITS,
  parseProjectPatchBody,
  parseProjectWriteBody,
} from "@/lib/projects/schema";
import { PROJECT_BUSINESS_TYPE_IDS } from "@/data/project-business-types";

function valid(overrides: Record<string, unknown> = {}) {
  return {
    slug: "nova-app",
    title: {
      fr: "Titre FR assez long",
      en: "Title EN long enough",
      ar: "عنوان عربي كافٍ هنا",
    },
    description: {
      fr: "Description française assez longue pour passer.",
      en: "English description long enough to pass validation.",
      ar: "وصف عربي طويل بما يكفي لاجتياز التحقق من الصحة.",
    },
    kind: "personal",
    businessTypeIds: ["showcase", "webapp"],
    images: [
      {
        url: "https://abc.supabase.co/storage/v1/object/public/portfolio-projects/x.jpg",
      },
    ],
    link: "https://example.com",
    sortOrder: 1,
    published: true,
    ...overrides,
  };
}

describe("parseProjectWriteBody", () => {
  it("accepte un projet valide", () => {
    const parsed = parseProjectWriteBody(valid());
    assert.equal(parsed.ok, true);
    if (parsed.ok) {
      assert.equal(parsed.values.slug, "nova-app");
      assert.equal(parsed.values.kind, "personal");
      assert.deepEqual(parsed.values.businessTypeIds, ["showcase", "webapp"]);
    }
  });

  it("accepte les 4 types métier max du catalogue", () => {
    const ids = PROJECT_BUSINESS_TYPE_IDS.slice(0, PROJECT_LIMITS.maxBusinessTypes);
    const parsed = parseProjectWriteBody(valid({ businessTypeIds: ids }));
    assert.equal(parsed.ok, true);
    if (parsed.ok) assert.deepEqual(parsed.values.businessTypeIds, ids);
  });

  it("accepte businessTypeIds vide", () => {
    const parsed = parseProjectWriteBody(valid({ businessTypeIds: [] }));
    assert.equal(parsed.ok, true);
    if (parsed.ok) assert.deepEqual(parsed.values.businessTypeIds, []);
  });

  it("normalise le slug en minuscules", () => {
    const parsed = parseProjectWriteBody(valid({ slug: "Nova-App" }));
    assert.equal(parsed.ok, true);
    if (parsed.ok) assert.equal(parsed.values.slug, "nova-app");
  });

  it("rejette slug invalide → project_invalid_slug", () => {
    const bad = parseProjectWriteBody(valid({ slug: "Bad Slug!" }));
    assert.equal(bad.ok, false);
    if (!bad.ok) assert.equal(bad.error, "project_invalid_slug");
    assert.equal(parseProjectWriteBody(valid({ slug: "a" })).ok, false);
  });

  it("rejette type métier inconnu → invalid_business_type", () => {
    const parsed = parseProjectWriteBody(
      valid({ businessTypeIds: ["hacked"] })
    );
    assert.equal(parsed.ok, false);
    if (!parsed.ok) assert.equal(parsed.error, "invalid_business_type");
  });

  it("rejette doublon type métier → duplicate_business_type", () => {
    const parsed = parseProjectWriteBody(
      valid({ businessTypeIds: ["showcase", "showcase"] })
    );
    assert.equal(parsed.ok, false);
    if (!parsed.ok) assert.equal(parsed.error, "duplicate_business_type");
  });

  it("rejette > maxBusinessTypes → project_too_many_business_types", () => {
    const ids = PROJECT_BUSINESS_TYPE_IDS.slice(
      0,
      PROJECT_LIMITS.maxBusinessTypes + 1
    );
    const parsed = parseProjectWriteBody(valid({ businessTypeIds: ids }));
    assert.equal(parsed.ok, false);
    if (!parsed.ok) {
      assert.equal(parsed.error, "project_too_many_business_types");
    }
  });

  it("rejette URL image non supabase → project_invalid_image", () => {
    const evil = parseProjectWriteBody(
      valid({ images: [{ url: "https://evil.example/x.jpg" }] })
    );
    assert.equal(evil.ok, false);
    if (!evil.ok) assert.equal(evil.error, "project_invalid_image");

    const js = parseProjectWriteBody(
      valid({ images: [{ url: "javascript:alert(1)" }] })
    );
    assert.equal(js.ok, false);
    if (!js.ok) assert.equal(js.error, "project_invalid_image");
  });

  it("accepte localhost / 127.0.0.1 pour images (dev)", () => {
    for (const url of [
      "http://localhost:54321/storage/v1/object/public/portfolio-projects/x.png",
      "http://127.0.0.1:54321/storage/v1/object/public/portfolio-projects/x.png",
    ]) {
      const parsed = parseProjectWriteBody(valid({ images: [{ url }] }));
      assert.equal(parsed.ok, true, url);
    }
  });

  it("rejette lien unsafe → project_invalid_link", () => {
    const parsed = parseProjectWriteBody(
      valid({ link: "javascript:alert(1)" })
    );
    assert.equal(parsed.ok, false);
    if (!parsed.ok) assert.equal(parsed.error, "project_invalid_link");
  });

  it("normalise link vide → null", () => {
    const parsed = parseProjectWriteBody(valid({ link: "" }));
    assert.equal(parsed.ok, true);
    if (parsed.ok) assert.equal(parsed.values.link, null);
  });

  it("strip mass-assignment (id / role)", () => {
    const parsed = parseProjectWriteBody(
      valid({ id: "evil", role: "admin", published: false })
    );
    assert.equal(parsed.ok, true);
    if (parsed.ok) {
      assert.equal("id" in parsed.values, false);
      assert.equal("role" in parsed.values, false);
      assert.equal(parsed.values.published, false);
    }
  });

  it("exige au moins une image → project_invalid_images", () => {
    const parsed = parseProjectWriteBody(valid({ images: [] }));
    assert.equal(parsed.ok, false);
    if (!parsed.ok) assert.equal(parsed.error, "project_invalid_images");
  });

  it("rejette trop d'images", () => {
    const images = Array.from({ length: PROJECT_LIMITS.maxImages + 1 }, () => ({
      url: "https://abc.supabase.co/storage/v1/object/public/portfolio-projects/x.jpg",
    }));
    assert.equal(parseProjectWriteBody(valid({ images })).ok, false);
  });

  it("rejette titre trop court → project_invalid_title", () => {
    const parsed = parseProjectWriteBody(
      valid({
        title: { fr: "x", en: "Title EN long enough", ar: "عنوان عربي كافٍ هنا" },
      })
    );
    assert.equal(parsed.ok, false);
    if (!parsed.ok) assert.equal(parsed.error, "project_invalid_title");
  });

  it("rejette description trop courte → project_invalid_description", () => {
    const parsed = parseProjectWriteBody(
      valid({
        description: {
          fr: "court",
          en: "English description long enough to pass validation.",
          ar: "وصف عربي طويل بما يكفي لاجتياز التحقق من الصحة.",
        },
      })
    );
    assert.equal(parsed.ok, false);
    if (!parsed.ok) assert.equal(parsed.error, "project_invalid_description");
  });

  it("rejette kind inconnu", () => {
    assert.equal(parseProjectWriteBody(valid({ kind: "admin" })).ok, false);
  });

  it("borne maxBodyBytes / upload / mime", () => {
    assert.ok(PROJECT_LIMITS.maxBodyBytes <= 64_000);
    assert.ok(PROJECT_LIMITS.uploadMaxBytes <= 3 * 1024 * 1024);
    assert.equal(PROJECT_LIMITS.maxBusinessTypes, 4);
    assert.ok(PROJECT_LIMITS.allowedMime.includes("image/png"));
    assert.equal(
      (PROJECT_LIMITS.allowedMime as readonly string[]).includes(
        "image/svg+xml"
      ),
      false
    );
  });
});

describe("parseProjectPatchBody", () => {
  it("accepte patch partiel", () => {
    const parsed = parseProjectPatchBody({ published: true });
    assert.equal(parsed.ok, true);
  });

  it("rejette patch vide → empty_patch", () => {
    const parsed = parseProjectPatchBody({});
    assert.equal(parsed.ok, false);
    if (!parsed.ok) assert.equal(parsed.error, "empty_patch");
  });

  it("accepte kind sold", () => {
    const parsed = parseProjectPatchBody({ kind: "sold" });
    assert.equal(parsed.ok, true);
    if (parsed.ok) assert.equal(parsed.values.kind, "sold");
  });

  it("patch businessTypeIds : max + whitelist", () => {
    const tooMany = parseProjectPatchBody({
      businessTypeIds: PROJECT_BUSINESS_TYPE_IDS.slice(0, 5),
    });
    assert.equal(tooMany.ok, false);
    if (!tooMany.ok) {
      assert.equal(tooMany.error, "project_too_many_business_types");
    }

    const bad = parseProjectPatchBody({ businessTypeIds: ["xss"] });
    assert.equal(bad.ok, false);
    if (!bad.ok) assert.equal(bad.error, "invalid_business_type");

    const ok = parseProjectPatchBody({
      businessTypeIds: ["showcase", "other"],
    });
    assert.equal(ok.ok, true);
  });

  it("rejette clés inconnues (strict)", () => {
    assert.equal(
      parseProjectPatchBody({ published: true, evil: true }).ok,
      false
    );
  });

  it("ne peupler pas sortOrder/published par défaut sur {}", () => {
    assert.equal(parseProjectPatchBody({}).ok, false);
  });
});
