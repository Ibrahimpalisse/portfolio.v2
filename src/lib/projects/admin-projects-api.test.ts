import assert from "node:assert/strict";
import { after, before, describe, it, mock } from "node:test";
import { ADMIN_ERROR_CODES } from "@/lib/admin/error-codes";

const VALID_UUID = "08d86636-9162-4aca-9fb8-b2f77ad90539";

type GuardMode = "ok" | "unauthorized" | "forbidden_origin" | "mfa";

const sampleProject = {
  id: VALID_UUID,
  created_at: "2026-07-16T00:00:00Z",
  updated_at: "2026-07-16T00:00:00Z",
  slug: "nova",
  title: { fr: "Nova FR", en: "Nova EN", ar: "Nova AR" },
  description: {
    fr: "Desc FR assez longue ici oui.",
    en: "Desc EN long enough here yes.",
    ar: "وصف عربي كافٍ هنا للتحقق.",
  },
  kind: "personal",
  business_type_ids: ["dashboard"],
  images: [
    {
      url: "https://abc.supabase.co/storage/v1/object/public/portfolio-projects/a.jpg",
    },
  ],
  link: null,
  sort_order: 0,
  published: true,
};

describe("API admin projects", () => {
  let guardMode: GuardMode = "ok";
  let serviceConfigured = true;
  let listResult:
    | { ok: true; configured: boolean; projects: typeof sampleProject[] }
    | { ok: false; reason: "persist_failed" } = {
    ok: true,
    configured: true,
    projects: [sampleProject],
  };
  let createResult:
    | { ok: true; project: typeof sampleProject }
    | { ok: false; reason: string } = {
    ok: true,
    project: sampleProject,
  };
  let updateResult:
    | { ok: true; project: typeof sampleProject }
    | { ok: false; reason: string } = {
    ok: true,
    project: sampleProject,
  };
  let deleteOk = true;
  let lastCreate: unknown = null;
  let listed = false;

  let listRoute: typeof import("@/app/api/admin/projects/route");
  let idRoute: typeof import("@/app/api/admin/projects/[id]/route");

  before(() => {
    mock.module("@/lib/admin/require-admin-api", {
      namedExports: {
        requireAdminApi: async (
          _req: Request,
          opts?: { requireOrigin?: boolean }
        ) => {
          if (guardMode === "unauthorized") {
            return {
              ok: false as const,
              response: Response.json(
                { code: ADMIN_ERROR_CODES.SESSION_EXPIRED },
                { status: 401 }
              ),
            };
          }
          if (guardMode === "mfa") {
            return {
              ok: false as const,
              response: Response.json(
                { code: ADMIN_ERROR_CODES.MFA_REQUIRED },
                { status: 403 }
              ),
            };
          }
          if (guardMode === "forbidden_origin") {
            assert.equal(opts?.requireOrigin, true);
            return {
              ok: false as const,
              response: Response.json(
                { code: ADMIN_ERROR_CODES.UNAUTHORIZED_ORIGIN },
                { status: 403 }
              ),
            };
          }
          return {
            ok: true as const,
            user: { id: "u1", email: "admin@example.com" },
            supabase: {},
          };
        },
      },
    });

    mock.module("@/lib/supabase/service", {
      namedExports: {
        isSupabaseServiceConfigured: () => serviceConfigured,
        createSupabaseServiceClient: () => null,
      },
    });

    mock.module("@/lib/projects/store", {
      namedExports: {
        listProjectsForAdmin: async () => {
          listed = true;
          return listResult;
        },
        createProject: async (values: unknown) => {
          lastCreate = values;
          return createResult;
        },
        updateProject: async () => updateResult,
        deleteProject: async () => deleteOk,
        getPublishedProjects: async () => [],
        listPublishedProjectRows: async () => [],
        countDemoProjects: () => 4,
        projectRowToLocalized: () => ({}),
      },
    });

    mock.module("@/lib/admin/audit-log", {
      namedExports: { logAdminAuthEvent: () => undefined },
    });
  });

  before(async () => {
    listRoute = await import("@/app/api/admin/projects/route");
    idRoute = await import("@/app/api/admin/projects/[id]/route");
  });

  after(() => mock.reset());

  function reset() {
    guardMode = "ok";
    serviceConfigured = true;
    listResult = {
      ok: true,
      configured: true,
      projects: [sampleProject],
    };
    createResult = { ok: true, project: sampleProject };
    updateResult = { ok: true, project: sampleProject };
    deleteOk = true;
    lastCreate = null;
    listed = false;
  }

  const writeBody = {
    slug: "nova",
    title: sampleProject.title,
    description: sampleProject.description,
    kind: "personal",
    businessTypeIds: ["dashboard"],
    images: sampleProject.images,
    link: null,
    sortOrder: 0,
    published: true,
  };

  it("GET refuse sans session", async () => {
    reset();
    guardMode = "unauthorized";
    const res = await listRoute.GET(
      new Request("http://localhost/api/admin/projects")
    );
    assert.equal(res.status, 401);
    assert.equal(listed, false);
  });

  it("GET liste ok", async () => {
    reset();
    const res = await listRoute.GET(
      new Request("http://localhost/api/admin/projects")
    );
    assert.equal(res.status, 200);
    const body = (await res.json()) as { projects?: unknown[] };
    assert.equal(body.projects?.length, 1);
  });

  it("POST exige Origin", async () => {
    reset();
    guardMode = "forbidden_origin";
    const res = await listRoute.POST(
      new Request("http://localhost/api/admin/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(writeBody),
      })
    );
    assert.equal(res.status, 403);
    assert.equal(lastCreate, null);
  });

  it("POST 400 payload invalide", async () => {
    reset();
    const res = await listRoute.POST(
      new Request("http://localhost/api/admin/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug: "x" }),
      })
    );
    assert.equal(res.status, 400);
  });

  it("POST crée un projet", async () => {
    reset();
    const res = await listRoute.POST(
      new Request("http://localhost/api/admin/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(writeBody),
      })
    );
    assert.equal(res.status, 201);
    assert.ok(lastCreate);
  });

  it("PATCH id exige Origin", async () => {
    reset();
    guardMode = "forbidden_origin";
    const res = await idRoute.PATCH(
      new Request(`http://localhost/api/admin/projects/${VALID_UUID}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ published: false }),
      }),
      { params: Promise.resolve({ id: VALID_UUID }) }
    );
    assert.equal(res.status, 403);
  });

  it("DELETE projet", async () => {
    reset();
    const res = await idRoute.DELETE(
      new Request(`http://localhost/api/admin/projects/${VALID_UUID}`, {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: VALID_UUID }) }
    );
    assert.equal(res.status, 200);
  });

  it("POST 503 sans service role", async () => {
    reset();
    serviceConfigured = false;
    const res = await listRoute.POST(
      new Request("http://localhost/api/admin/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(writeBody),
      })
    );
    assert.equal(res.status, 503);
  });

  it("POST refuse MFA manquante", async () => {
    reset();
    guardMode = "mfa";
    const res = await listRoute.POST(
      new Request("http://localhost/api/admin/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(writeBody),
      })
    );
    assert.equal(res.status, 403);
    assert.equal(lastCreate, null);
  });

  it("POST 400 trop de types métier", async () => {
    reset();
    const res = await listRoute.POST(
      new Request("http://localhost/api/admin/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...writeBody,
          businessTypeIds: [
            "showcase",
            "ecommerce",
            "booking",
            "landing",
            "dashboard",
          ],
        }),
      })
    );
    assert.equal(res.status, 400);
    const body = (await res.json()) as { error?: string };
    assert.equal(body.error, "project_too_many_business_types");
    assert.equal(lastCreate, null);
  });

  it("PATCH 400 type métier invalide", async () => {
    reset();
    const res = await idRoute.PATCH(
      new Request(`http://localhost/api/admin/projects/${VALID_UUID}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ businessTypeIds: ["hacked"] }),
      }),
      { params: Promise.resolve({ id: VALID_UUID }) }
    );
    assert.equal(res.status, 400);
  });
});
