import assert from "node:assert/strict";
import { after, before, describe, it, mock } from "node:test";
import { ADMIN_ERROR_CODES } from "@/lib/admin/error-codes";

type GuardMode = "ok" | "unauthorized" | "forbidden_origin" | "mfa";

describe("API admin projects upload", () => {
  let guardMode: GuardMode = "ok";
  let serviceConfigured = true;
  let uploadResult:
    | { ok: true; url: string; path: string }
    | {
        ok: false;
        reason:
          | "not_configured"
          | "invalid_type"
          | "too_large"
          | "upload_failed";
      } = {
    ok: true,
    url: "https://abc.supabase.co/storage/v1/object/public/portfolio-projects/projects/u.webp",
    path: "projects/u.webp",
  };
  let lastFile: File | null = null;
  let auditEvents: string[] = [];

  let uploadRoute: typeof import("@/app/api/admin/projects/upload/route");

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

    mock.module("@/lib/projects/storage", {
      namedExports: {
        uploadProjectImage: async (file: File) => {
          lastFile = file;
          return uploadResult;
        },
        deleteProjectImageByUrl: async () => false,
      },
    });

    mock.module("@/lib/admin/audit-log", {
      namedExports: {
        logAdminAuthEvent: (event: string) => {
          auditEvents.push(event);
        },
      },
    });

    mock.module("@/lib/rate-limit-core", {
      namedExports: {
        getClientIp: () => "127.0.0.1",
      },
    });
  });

  before(async () => {
    uploadRoute = await import("@/app/api/admin/projects/upload/route");
  });

  after(() => mock.reset());

  function reset() {
    guardMode = "ok";
    serviceConfigured = true;
    uploadResult = {
      ok: true,
      url: "https://abc.supabase.co/storage/v1/object/public/portfolio-projects/projects/u.webp",
      path: "projects/u.webp",
    };
    lastFile = null;
    auditEvents = [];
  }

  function multipart(file: File | null) {
    const fd = new FormData();
    if (file) fd.set("file", file);
    // Laisser le runtime fixer Content-Type + boundary.
    return new Request("http://localhost/api/admin/projects/upload", {
      method: "POST",
      body: fd,
    });
  }

  it("POST refuse sans session", async () => {
    reset();
    guardMode = "unauthorized";
    const res = await uploadRoute.POST(
      multipart(new File([new Uint8Array([1])], "a.png", { type: "image/png" }))
    );
    assert.equal(res.status, 401);
    assert.equal(lastFile, null);
  });

  it("POST exige Origin (CSRF)", async () => {
    reset();
    guardMode = "forbidden_origin";
    const res = await uploadRoute.POST(
      multipart(new File([new Uint8Array([1])], "a.png", { type: "image/png" }))
    );
    assert.equal(res.status, 403);
  });

  it("POST refuse MFA manquante", async () => {
    reset();
    guardMode = "mfa";
    const res = await uploadRoute.POST(
      multipart(new File([new Uint8Array([1])], "a.png", { type: "image/png" }))
    );
    assert.equal(res.status, 403);
  });

  it("POST 415 si pas multipart", async () => {
    reset();
    const res = await uploadRoute.POST(
      new Request("http://localhost/api/admin/projects/upload", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      })
    );
    assert.equal(res.status, 415);
  });

  it("POST 400 sans champ file", async () => {
    reset();
    const res = await uploadRoute.POST(multipart(null));
    assert.equal(res.status, 400);
  });

  it("POST 400 invalid_type", async () => {
    reset();
    uploadResult = { ok: false, reason: "invalid_type" };
    const res = await uploadRoute.POST(
      multipart(
        new File([new Uint8Array([1])], "x.svg", { type: "image/svg+xml" })
      )
    );
    assert.equal(res.status, 400);
    const body = (await res.json()) as { error?: string };
    assert.equal(body.error, "invalid_type");
  });

  it("POST 201 upload OK + audit", async () => {
    reset();
    const res = await uploadRoute.POST(
      multipart(
        new File([new Uint8Array([1, 2, 3])], "ok.webp", {
          type: "image/webp",
        })
      )
    );
    assert.equal(res.status, 201);
    const body = (await res.json()) as { ok?: boolean; path?: string };
    assert.equal(body.ok, true);
    assert.equal(body.path, "projects/u.webp");
    assert.ok(lastFile);
    assert.ok(auditEvents.includes("project_uploaded"));
  });

  it("POST 503 sans service role", async () => {
    reset();
    serviceConfigured = false;
    const res = await uploadRoute.POST(
      multipart(new File([new Uint8Array([1])], "a.png", { type: "image/png" }))
    );
    assert.equal(res.status, 503);
    assert.equal(lastFile, null);
  });

  it("GET method not allowed", async () => {
    reset();
    const res = await uploadRoute.GET();
    assert.equal(res.status, 405);
  });
});
