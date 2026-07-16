import assert from "node:assert/strict";
import { after, before, describe, it, mock } from "node:test";
import { ADMIN_ERROR_CODES } from "@/lib/admin/error-codes";
import { DEFAULT_ABOUT_STATS } from "@/data/about-stats";

type GuardMode = "ok" | "unauthorized" | "forbidden_origin" | "unavailable" | "mfa";

describe("API admin about-stats — auth, CSRF, validation, persist", () => {
  let guardMode: GuardMode = "ok";
  let serviceConfigured = true;
  let adminResult:
    | {
        ok: true;
        configured: boolean;
        stats: typeof DEFAULT_ABOUT_STATS;
        updatedAt: string | null;
      }
    | { ok: false; reason: "persist_failed" } = {
    ok: true,
    configured: true,
    stats: { ...DEFAULT_ABOUT_STATS },
    updatedAt: "2026-07-16T00:00:00Z",
  };
  let upsertResult:
    | {
        ok: true;
        stats: typeof DEFAULT_ABOUT_STATS;
        updatedAt: string;
      }
    | { ok: false; reason: "not_configured" | "persist_failed" } = {
    ok: true,
    stats: { ...DEFAULT_ABOUT_STATS, years: 3 },
    updatedAt: "2026-07-16T01:00:00Z",
  };
  let lastUpsert: unknown = null;
  let getCalled = false;
  let auditEvents: string[] = [];

  let route: typeof import("@/app/api/admin/about-stats/route");

  before(() => {
    mock.module("@/lib/admin/require-admin-api", {
      namedExports: {
        requireAdminApi: async (
          _req: Request,
          opts?: { requireOrigin?: boolean }
        ) => {
          if (guardMode === "unavailable") {
            return {
              ok: false as const,
              response: Response.json(
                { code: ADMIN_ERROR_CODES.UNAVAILABLE },
                { status: 503 }
              ),
            };
          }
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

    mock.module("@/lib/about/store", {
      namedExports: {
        getAboutStatsForAdmin: async () => {
          getCalled = true;
          return adminResult;
        },
        upsertAboutStats: async (values: unknown) => {
          lastUpsert = values;
          return upsertResult;
        },
        getAboutStats: async () => ({ ...DEFAULT_ABOUT_STATS }),
      },
    });

    mock.module("@/lib/admin/audit-log", {
      namedExports: {
        logAdminAuthEvent: (event: string) => {
          auditEvents.push(event);
        },
      },
    });
  });

  before(async () => {
    route = await import("@/app/api/admin/about-stats/route");
  });

  after(() => {
    mock.reset();
  });

  function resetState() {
    guardMode = "ok";
    serviceConfigured = true;
    adminResult = {
      ok: true,
      configured: true,
      stats: { ...DEFAULT_ABOUT_STATS },
      updatedAt: "2026-07-16T00:00:00Z",
    };
    upsertResult = {
      ok: true,
      stats: { ...DEFAULT_ABOUT_STATS, years: 3 },
      updatedAt: "2026-07-16T01:00:00Z",
    };
    lastUpsert = null;
    getCalled = false;
    auditEvents = [];
  }

  function patchRequest(
    body: unknown,
    headers: Record<string, string> = {}
  ) {
    return new Request("http://localhost/api/admin/about-stats", {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        ...headers,
      },
      body: typeof body === "string" ? body : JSON.stringify(body),
    });
  }

  it("GET refuse sans session admin", async () => {
    resetState();
    guardMode = "unauthorized";
    const res = await route.GET(
      new Request("http://localhost/api/admin/about-stats")
    );
    assert.equal(res.status, 401);
    assert.equal(getCalled, false);
  });

  it("GET refuse sans MFA (AAL2)", async () => {
    resetState();
    guardMode = "mfa";
    const res = await route.GET(
      new Request("http://localhost/api/admin/about-stats")
    );
    assert.equal(res.status, 403);
    const body = (await res.json()) as { code?: string };
    assert.equal(body.code, ADMIN_ERROR_CODES.MFA_REQUIRED);
    assert.equal(getCalled, false);
  });

  it("GET retourne stats + configured", async () => {
    resetState();
    const res = await route.GET(
      new Request("http://localhost/api/admin/about-stats")
    );
    assert.equal(res.status, 200);
    const body = (await res.json()) as {
      ok?: boolean;
      configured?: boolean;
      stats?: typeof DEFAULT_ABOUT_STATS;
      updatedAt?: string | null;
    };
    assert.equal(body.ok, true);
    assert.equal(body.configured, true);
    assert.deepEqual(body.stats, DEFAULT_ABOUT_STATS);
    assert.equal(body.updatedAt, "2026-07-16T00:00:00Z");
    assert.ok(auditEvents.includes("about_stats_listed"));
  });

  it("GET configured:false quand service absent (pas 503)", async () => {
    resetState();
    adminResult = {
      ok: true,
      configured: false,
      stats: { ...DEFAULT_ABOUT_STATS },
      updatedAt: null,
    };
    const res = await route.GET(
      new Request("http://localhost/api/admin/about-stats")
    );
    assert.equal(res.status, 200);
    const body = (await res.json()) as { configured?: boolean };
    assert.equal(body.configured, false);
  });

  it("GET 503 si persist_failed", async () => {
    resetState();
    adminResult = { ok: false, reason: "persist_failed" };
    const res = await route.GET(
      new Request("http://localhost/api/admin/about-stats")
    );
    assert.equal(res.status, 503);
  });

  it("PATCH exige Origin (CSRF)", async () => {
    resetState();
    guardMode = "forbidden_origin";
    const res = await route.PATCH(
      patchRequest({
        years: 3,
        clients: 2,
        projects: 5,
        responseHours: 24,
      })
    );
    assert.equal(res.status, 403);
    assert.equal(lastUpsert, null);
  });

  it("PATCH refuse sans session", async () => {
    resetState();
    guardMode = "unauthorized";
    const res = await route.PATCH(
      patchRequest({
        years: 3,
        clients: 2,
        projects: 5,
        responseHours: 24,
      })
    );
    assert.equal(res.status, 401);
    assert.equal(lastUpsert, null);
  });

  it("PATCH 503 si service role absent", async () => {
    resetState();
    serviceConfigured = false;
    const res = await route.PATCH(
      patchRequest({
        years: 3,
        clients: 2,
        projects: 5,
        responseHours: 24,
      })
    );
    assert.equal(res.status, 503);
    assert.equal(lastUpsert, null);
  });

  it("PATCH 415 si Content-Type invalide", async () => {
    resetState();
    const res = await route.PATCH(
      new Request("http://localhost/api/admin/about-stats", {
        method: "PATCH",
        headers: { "content-type": "text/plain" },
        body: JSON.stringify({
          years: 3,
          clients: 2,
          projects: 5,
          responseHours: 24,
        }),
      })
    );
    assert.equal(res.status, 415);
  });

  it("PATCH 400 si payload hors schéma", async () => {
    resetState();
    const res = await route.PATCH(
      patchRequest({
        years: -5,
        clients: 2,
        projects: 5,
        responseHours: 24,
      })
    );
    assert.equal(res.status, 400);
    assert.equal(lastUpsert, null);
  });

  it("PATCH 400 si corps trop volumineux (A04)", async () => {
    resetState();
    const res = await route.PATCH(
      patchRequest("{}", { "content-length": "99999" })
    );
    assert.equal(res.status, 400);
    assert.equal(lastUpsert, null);
  });

  it("PATCH 400 si JSON invalide", async () => {
    resetState();
    const res = await route.PATCH(
      new Request("http://localhost/api/admin/about-stats", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: "{not-json",
      })
    );
    assert.equal(res.status, 400);
  });

  it("PATCH succès → upsert validé + audit", async () => {
    resetState();
    const payload = {
      years: 3.5,
      clients: 12,
      projects: 20,
      responseHours: 24,
    };
    upsertResult = {
      ok: true,
      stats: payload,
      updatedAt: "2026-07-16T02:00:00Z",
    };
    const res = await route.PATCH(patchRequest(payload));
    assert.equal(res.status, 200);
    assert.deepEqual(lastUpsert, payload);
    const body = (await res.json()) as {
      ok?: boolean;
      stats?: typeof payload;
      updatedAt?: string;
    };
    assert.equal(body.ok, true);
    assert.deepEqual(body.stats, payload);
    assert.equal(body.updatedAt, "2026-07-16T02:00:00Z");
    assert.ok(auditEvents.includes("about_stats_updated"));
  });

  it("PATCH ignore champs mass-assignment avant upsert", async () => {
    resetState();
    const res = await route.PATCH(
      patchRequest({
        years: 2,
        clients: 1,
        projects: 4,
        responseHours: 48,
        id: "evil",
        role: "admin",
      })
    );
    assert.equal(res.status, 200);
    assert.deepEqual(lastUpsert, {
      years: 2,
      clients: 1,
      projects: 4,
      responseHours: 48,
    });
  });

  it("PATCH 503 si upsert échoue", async () => {
    resetState();
    upsertResult = { ok: false, reason: "persist_failed" };
    const res = await route.PATCH(
      patchRequest({
        years: 2,
        clients: 1,
        projects: 4,
        responseHours: 48,
      })
    );
    assert.equal(res.status, 503);
    assert.ok(auditEvents.includes("about_stats_update_failed"));
  });

  it("méthodes non autorisées → 405", async () => {
    resetState();
    for (const method of ["POST", "PUT", "DELETE"] as const) {
      const res = await route[method]();
      assert.equal(res.status, 405, method);
    }
  });
});
