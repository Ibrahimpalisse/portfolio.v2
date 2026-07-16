import assert from "node:assert/strict";
import { after, before, describe, it, mock } from "node:test";
import { ADMIN_ERROR_CODES } from "@/lib/admin/error-codes";
import { DEFAULT_SITE_SETTINGS } from "@/data/site-social";

type GuardMode = "ok" | "unauthorized" | "forbidden_origin" | "mfa";

describe("API admin social-links (settings)", () => {
  let guardMode: GuardMode = "ok";
  let serviceConfigured = true;
  let adminResult:
    | {
        ok: true;
        configured: boolean;
        settings: typeof DEFAULT_SITE_SETTINGS;
        updatedAt: string | null;
      }
    | { ok: false; reason: "persist_failed" } = {
    ok: true,
    configured: true,
    settings: { ...DEFAULT_SITE_SETTINGS },
    updatedAt: "2026-07-16T00:00:00Z",
  };
  let upsertResult:
    | {
        ok: true;
        settings: typeof DEFAULT_SITE_SETTINGS;
        updatedAt: string;
      }
    | { ok: false; reason: "not_configured" | "persist_failed" } = {
    ok: true,
    settings: {
      ...DEFAULT_SITE_SETTINGS,
      contactEmail: "hello@zishi.dev",
      discord: "https://discord.gg/ok",
    },
    updatedAt: "2026-07-16T01:00:00Z",
  };
  let lastUpsert: unknown = null;
  let auditEvents: string[] = [];

  let route: typeof import("@/app/api/admin/social-links/route");

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

    mock.module("@/lib/social/store", {
      namedExports: {
        getSiteSettingsForAdmin: async () => {
          return adminResult;
        },
        getSiteSocialForAdmin: async () => adminResult,
        upsertSiteSocialLinks: async (values: unknown) => {
          lastUpsert = values;
          return upsertResult;
        },
        getSiteSettings: async () => DEFAULT_SITE_SETTINGS,
        getSiteSocialLinks: async () => ({
          discord: "",
          whatsapp: "",
          instagram: "",
          tiktok: "",
        }),
        getPublicContactEmail: async () => DEFAULT_SITE_SETTINGS.contactEmail,
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
      namedExports: { getClientIp: () => "127.0.0.1" },
    });
  });

  before(async () => {
    route = await import("@/app/api/admin/social-links/route");
  });

  after(() => mock.reset());

  function reset() {
    guardMode = "ok";
    serviceConfigured = true;
    lastUpsert = null;
    auditEvents = [];
    adminResult = {
      ok: true,
      configured: true,
      settings: { ...DEFAULT_SITE_SETTINGS },
      updatedAt: "2026-07-16T00:00:00Z",
    };
    upsertResult = {
      ok: true,
      settings: {
        ...DEFAULT_SITE_SETTINGS,
        contactEmail: "hello@zishi.dev",
        discord: "https://discord.gg/ok",
      },
      updatedAt: "2026-07-16T01:00:00Z",
    };
  }

  const writeBody = {
    contactEmail: "hello@zishi.dev",
    discord: "https://discord.gg/ok",
    whatsapp: "",
    instagram: "",
    tiktok: "",
  };

  it("GET refuse sans session", async () => {
    reset();
    guardMode = "unauthorized";
    const res = await route.GET(
      new Request("http://localhost/api/admin/social-links")
    );
    assert.equal(res.status, 401);
  });

  it("GET liste settings", async () => {
    reset();
    const res = await route.GET(
      new Request("http://localhost/api/admin/social-links")
    );
    assert.equal(res.status, 200);
    const body = (await res.json()) as { settings?: { contactEmail?: string } };
    assert.equal(body.settings?.contactEmail, DEFAULT_SITE_SETTINGS.contactEmail);
    assert.ok(auditEvents.includes("social_links_listed"));
  });

  it("PATCH exige Origin (CSRF)", async () => {
    reset();
    guardMode = "forbidden_origin";
    const res = await route.PATCH(
      new Request("http://localhost/api/admin/social-links", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(writeBody),
      })
    );
    assert.equal(res.status, 403);
    assert.equal(lastUpsert, null);
  });

  it("PATCH refuse MFA manquante", async () => {
    reset();
    guardMode = "mfa";
    const res = await route.PATCH(
      new Request("http://localhost/api/admin/social-links", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(writeBody),
      })
    );
    assert.equal(res.status, 403);
  });

  it("PATCH 400 email / url invalides", async () => {
    reset();
    const badEmail = await route.PATCH(
      new Request("http://localhost/api/admin/social-links", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...writeBody, contactEmail: "nope" }),
      })
    );
    assert.equal(badEmail.status, 400);

    const badUrl = await route.PATCH(
      new Request("http://localhost/api/admin/social-links", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...writeBody,
          discord: "https://evil.test/x",
        }),
      })
    );
    assert.equal(badUrl.status, 400);
    assert.equal(lastUpsert, null);
  });

  it("PATCH met à jour settings", async () => {
    reset();
    const res = await route.PATCH(
      new Request("http://localhost/api/admin/social-links", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(writeBody),
      })
    );
    assert.equal(res.status, 200);
    assert.deepEqual(lastUpsert, writeBody);
    assert.ok(auditEvents.includes("social_links_updated"));
  });

  it("PATCH 503 sans service role", async () => {
    reset();
    serviceConfigured = false;
    const res = await route.PATCH(
      new Request("http://localhost/api/admin/social-links", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(writeBody),
      })
    );
    assert.equal(res.status, 503);
  });

  it("POST method not allowed", async () => {
    reset();
    assert.equal((await route.POST()).status, 405);
  });
});
