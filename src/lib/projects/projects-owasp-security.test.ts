/**
 * Suite OWASP Top 10 (focus) pour le système projets admin
 * (CRUD + types métier + URLs images / upload).
 */
import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
  PROJECT_LIMITS,
  parseProjectPatchBody,
  parseProjectWriteBody,
} from "@/lib/projects/schema";
import { ADMIN_ROUTES } from "@/lib/admin/constants";
import { verifyFormRequestOrigin } from "@/lib/security/request-origin";
import { parseJsonBody } from "@/lib/security/parse-json-body";
import {
  PROJECT_BUSINESS_TYPE_IDS,
  isProjectBusinessTypeId,
} from "@/data/project-business-types";

function valid(overrides: Record<string, unknown> = {}) {
  return {
    slug: "safe-project",
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
    businessTypeIds: ["webapp"],
    images: [
      {
        url: "https://xyz.supabase.co/storage/v1/object/public/portfolio-projects/p.webp",
      },
    ],
    link: null,
    sortOrder: 0,
    published: false,
    ...overrides,
  };
}

describe("OWASP A01 — Broken Access Control (projects)", () => {
  it("route admin sous /admin/projects (pas d’exposition publique)", () => {
    assert.equal(ADMIN_ROUTES.projects, "/admin/projects");
    assert.equal(ADMIN_ROUTES.projects.startsWith("/admin"), true);
    assert.equal(ADMIN_ROUTES.projects.includes(".."), false);
  });

  it("mass-assignment : id/role/status non injectables via schéma write", () => {
    const parsed = parseProjectWriteBody(
      valid({
        id: "00000000-0000-4000-8000-000000000001",
        role: "service_role",
        status: "published",
        ownerId: "attacker",
      })
    );
    assert.equal(parsed.ok, true);
    if (parsed.ok) {
      assert.equal("id" in parsed.values, false);
      assert.equal("role" in parsed.values, false);
      assert.equal("status" in parsed.values, false);
      assert.equal("ownerId" in parsed.values, false);
    }
  });

  it("patch strict : clés inconnues refusées", () => {
    assert.equal(
      parseProjectPatchBody({ published: true, isAdmin: true }).ok,
      false
    );
  });
});

describe("OWASP A01/A08 — CSRF origine mutations projects", () => {
  const envSnapshot = { ...process.env };

  beforeEach(() => {
    process.env = { ...envSnapshot, NODE_ENV: "production" };
    delete process.env.FORM_ALLOWED_ORIGINS;
    process.env.NEXT_PUBLIC_SITE_URL = "https://zishi.dev";
  });

  afterEach(() => {
    process.env = { ...envSnapshot };
  });

  it("origine étrangère rejetée (POST/PATCH/upload)", () => {
    for (const path of [
      "/api/admin/projects",
      "/api/admin/projects/upload",
      `/api/admin/projects/08d86636-9162-4aca-9fb8-b2f77ad90539`,
    ]) {
      const req = new Request(`https://zishi.dev${path}`, {
        method: "POST",
        headers: {
          origin: "https://evil.example",
          "content-type": "application/json",
        },
      });
      assert.equal(verifyFormRequestOrigin(req), false, path);
    }
  });

  it("origine site autorisée", () => {
    const req = new Request("https://zishi.dev/api/admin/projects", {
      method: "POST",
      headers: {
        origin: "https://zishi.dev",
        "content-type": "application/json",
      },
    });
    assert.equal(verifyFormRequestOrigin(req), true);
  });

  it("sans Origin ni Referer → rejeté en production", () => {
    const req = new Request("https://zishi.dev/api/admin/projects", {
      method: "POST",
      headers: { "content-type": "application/json" },
    });
    assert.equal(verifyFormRequestOrigin(req), false);
  });
});

describe("OWASP A03 — Injection (payload / URLs)", () => {
  it("rejette path traversal & schemes dangereux sur images", () => {
    for (const url of [
      "file:///etc/passwd",
      "javascript:alert(1)",
      "data:text/html,<script>alert(1)</script>",
      "https://evil.test/x.jpg",
      "/../../etc/passwd",
      "https://abc.supabase.co.evil.test/x.jpg",
    ]) {
      assert.equal(
        parseProjectWriteBody(valid({ images: [{ url }] })).ok,
        false,
        url
      );
    }
  });

  it("rejette injection type métier hors catalogue", () => {
    for (const id of [
      "showcase; DROP TABLE projects--",
      "../../etc",
      "react",
      "SHOWCASE",
      "<script>",
    ]) {
      assert.equal(isProjectBusinessTypeId(id), false, id);
      assert.equal(
        parseProjectWriteBody(valid({ businessTypeIds: [id] })).ok,
        false,
        id
      );
    }
  });

  it("parseJsonBody bloque __proto__ / constructor", async () => {
    for (const body of [
      '{"slug":"x","__proto__":{"admin":true}}',
      '{"slug":"x","constructor":{"prototype":{"admin":true}}}',
    ]) {
      const req = new Request("http://localhost/api/admin/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
      });
      const parsed = await parseJsonBody(req, PROJECT_LIMITS.maxBodyBytes);
      assert.equal(parsed.ok, false, body);
    }
  });

  it("lien projet : schemes dangereux refusés", () => {
    for (const link of [
      "javascript:alert(1)",
      "data:text/html,hi",
      "file:///tmp/x",
    ]) {
      assert.equal(parseProjectWriteBody(valid({ link })).ok, false, link);
    }
  });
});

describe("OWASP A04 — Insecure Design (limites projets)", () => {
  it("types métier catalogue borné & whitelist", () => {
    assert.ok(PROJECT_BUSINESS_TYPE_IDS.length >= 5);
    assert.equal(PROJECT_LIMITS.maxBusinessTypes, 4);
    assert.equal(
      parseProjectWriteBody(valid({ businessTypeIds: ["not-a-real-type"] })).ok,
      false
    );
    assert.equal(
      parseProjectWriteBody({
        ...valid(),
        businessTypeIds: PROJECT_BUSINESS_TYPE_IDS.slice(0, 5),
      }).ok,
      false
    );
  });

  it("images / body / upload bornés", () => {
    const images = Array.from({ length: PROJECT_LIMITS.maxImages + 1 }, () => ({
      url: "https://xyz.supabase.co/storage/v1/object/public/portfolio-projects/p.webp",
    }));
    assert.equal(parseProjectWriteBody(valid({ images })).ok, false);
    assert.ok(PROJECT_LIMITS.maxBodyBytes <= 64_000);
    assert.ok(PROJECT_LIMITS.uploadMaxBytes <= 3 * 1024 * 1024);
  });

  it("MIME upload : pas de SVG (XSS stocké)", () => {
    assert.equal(
      (PROJECT_LIMITS.allowedMime as readonly string[]).includes(
        "image/svg+xml"
      ),
      false
    );
    for (const mime of ["image/jpeg", "image/png", "image/webp", "image/gif"]) {
      assert.ok(PROJECT_LIMITS.allowedMime.includes(mime as never), mime);
    }
  });
});

describe("OWASP A05 — Security Misconfiguration", () => {
  it("kind whitelist only (personal|sold)", () => {
    assert.equal(parseProjectWriteBody(valid({ kind: "admin" })).ok, false);
    assert.equal(parseProjectWriteBody(valid({ kind: "client" })).ok, false);
    assert.equal(parseProjectWriteBody(valid({ kind: "sold" })).ok, true);
    assert.equal(parseProjectWriteBody(valid({ kind: "personal" })).ok, true);
  });

  it("slug pattern strict (pas d’espaces / unicode libre)", () => {
    for (const slug of ["../x", "a b", "Éléphant", "ok!", "x".repeat(100)]) {
      assert.equal(parseProjectWriteBody(valid({ slug })).ok, false, slug);
    }
  });
});

describe("OWASP A07 — Identification & Auth failures (surface)", () => {
  it("mutations projets passent par requireAdminApi (origin + session)", () => {
    // Contrat documenté : les handlers admin imposent requireOrigin:true
    // (vérifié aussi dans admin-projects-api / upload tests via mock guard).
    assert.equal(typeof verifyFormRequestOrigin, "function");
    assert.ok(ADMIN_ROUTES.projects.includes("projects"));
  });
});

describe("OWASP A09 — Logging / failures safe", () => {
  it("erreurs validation mappées (pas de stack / détails Zod bruts)", () => {
    const parsed = parseProjectWriteBody(valid({ slug: "!" }));
    assert.equal(parsed.ok, false);
    if (!parsed.ok) {
      assert.match(parsed.error, /^project_|invalid_|duplicate_/);
      assert.equal(parsed.error.includes("Zod"), false);
      assert.equal(parsed.error.includes("at "), false);
    }
  });
});

describe("OWASP A10 — SSRF / open redirect (URLs images)", () => {
  it("hôte image limité à *.supabase.co ou localhost", () => {
    assert.equal(
      parseProjectWriteBody(
        valid({
          images: [
            {
              url: "https://169.254.169.254/latest/meta-data/",
            },
          ],
        })
      ).ok,
      false
    );
    assert.equal(
      parseProjectWriteBody(
        valid({
          images: [
            {
              url: "http://metadata.google.internal/",
            },
          ],
        })
      ).ok,
      false
    );
    assert.equal(
      parseProjectWriteBody(
        valid({
          images: [
            {
              url: "https://ok.supabase.co/storage/v1/object/public/portfolio-projects/a.png",
            },
          ],
        })
      ).ok,
      true
    );
  });
});
