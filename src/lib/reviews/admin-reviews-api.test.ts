import assert from "node:assert/strict";
import { after, before, describe, it, mock } from "node:test";
import { ADMIN_ERROR_CODES } from "@/lib/admin/error-codes";

const VALID_UUID = "08d86636-9162-4aca-9fb8-b2f77ad90539";

type GuardMode = "ok" | "unauthorized" | "forbidden_origin" | "unavailable";

describe("API admin reviews — auth, CSRF, validation, modération", () => {
  let guardMode: GuardMode = "ok";
  let serviceConfigured = true;
  let updateOk = true;
  let deleteOk = true;
  let lastUpdateArgs: unknown[] = [];
  let lastDeleteId = "";
  let listed = false;
  let lastListOptions: unknown = null;

  let listRoute: typeof import("@/app/api/admin/reviews/route");
  let idRoute: typeof import("@/app/api/admin/reviews/[id]/route");

  before(() => {
    mock.module("@/lib/admin/require-admin-api", {
      namedExports: {
        requireAdminApi: async (_req: Request, opts?: { requireOrigin?: boolean }) => {
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

    mock.module("@/lib/reviews/store", {
      namedExports: {
        listReviews: async (options?: unknown) => {
          listed = true;
          lastListOptions = options;
          return [
            {
              id: VALID_UUID,
              created_at: "2026-07-15T10:00:00Z",
              updated_at: "2026-07-15T10:00:00Z",
              published_at: null,
              name: "Sara",
              email: "sara@example.com",
              role: "CEO",
              message: "Top",
              rating: 5,
              status: "pending",
              fingerprint: null,
              ip_hash: null,
            },
          ];
        },
        countReviewsByStatus: async () => 2,
        updateReviewStatus: async (...args: unknown[]) => {
          lastUpdateArgs = args;
          return updateOk;
        },
        deleteReview: async (id: string) => {
          lastDeleteId = id;
          return deleteOk;
        },
        saveReview: async () => ({ ok: false }),
        getPublishedReviews: async () => [],
        findActiveReviewByEmail: async () => null,
        countReviewsInWindow: async () => null,
        reviewRowToItem: () => ({
          id: "x",
          name: "",
          role: "",
          text: "",
          rating: 5,
        }),
      },
    });

    mock.module("@/lib/admin/audit-log", {
      namedExports: {
        logAdminAuthEvent: () => undefined,
      },
    });
  });

  before(async () => {
    listRoute = await import("@/app/api/admin/reviews/route");
    idRoute = await import("@/app/api/admin/reviews/[id]/route");
  });

  after(() => {
    mock.reset();
  });

  function resetState() {
    guardMode = "ok";
    serviceConfigured = true;
    updateOk = true;
    deleteOk = true;
    lastUpdateArgs = [];
    lastDeleteId = "";
    listed = false;
    lastListOptions = null;
  }

  it("GET liste refuse sans session admin", async () => {
    resetState();
    guardMode = "unauthorized";
    const res = await listRoute.GET(
      new Request("http://localhost/api/admin/reviews")
    );
    assert.equal(res.status, 401);
    assert.equal(listed, false);
  });

  it("GET liste configured:false sans service role", async () => {
    resetState();
    serviceConfigured = false;
    const res = await listRoute.GET(
      new Request("http://localhost/api/admin/reviews")
    );
    assert.equal(res.status, 200);
    const body = (await res.json()) as {
      configured?: boolean;
      reviews?: unknown[];
      pendingCount?: number;
    };
    assert.equal(body.configured, false);
    assert.deepEqual(body.reviews, []);
    assert.equal(body.pendingCount, 0);
    assert.equal(listed, false);
  });

  it("GET liste retourne reviews + pendingCount", async () => {
    resetState();
    const res = await listRoute.GET(
      new Request(
        "http://localhost/api/admin/reviews?status=published&limit=20"
      )
    );
    assert.equal(res.status, 200);
    const body = (await res.json()) as {
      ok?: boolean;
      configured?: boolean;
      reviews?: { id: string }[];
      pendingCount?: number;
    };
    assert.equal(body.ok, true);
    assert.equal(body.configured, true);
    assert.equal(body.reviews?.[0]?.id, VALID_UUID);
    assert.equal(body.pendingCount, 2);
    assert.deepEqual(lastListOptions, { status: "published", limit: 20 });
  });

  it("POST liste → 405", () => {
    resetState();
    assert.equal(listRoute.POST().status, 405);
  });

  it("PATCH refuse sans origin (CSRF)", async () => {
    resetState();
    guardMode = "forbidden_origin";
    const res = await idRoute.PATCH(
      new Request(`http://localhost/api/admin/reviews/${VALID_UUID}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "published" }),
      }),
      { params: Promise.resolve({ id: VALID_UUID }) }
    );
    assert.equal(res.status, 403);
    assert.equal(lastUpdateArgs.length, 0);
  });

  it("PATCH refuse content-type non JSON", async () => {
    resetState();
    const res = await idRoute.PATCH(
      new Request(`http://localhost/api/admin/reviews/${VALID_UUID}`, {
        method: "PATCH",
        headers: { "content-type": "text/plain" },
        body: "x",
      }),
      { params: Promise.resolve({ id: VALID_UUID }) }
    );
    assert.equal(res.status, 415);
  });

  it("PATCH refuse status invalide / injection", async () => {
    resetState();
    for (const status of ["all", "unread", "published;drop", "", null]) {
      const res = await idRoute.PATCH(
        new Request(`http://localhost/api/admin/reviews/${VALID_UUID}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ status }),
        }),
        { params: Promise.resolve({ id: VALID_UUID }) }
      );
      assert.equal(res.status, 400, `status=${String(status)}`);
    }
    assert.equal(lastUpdateArgs.length, 0);
  });

  it("PATCH publie / rejette / remet pending", async () => {
    resetState();
    for (const status of ["published", "rejected", "pending"] as const) {
      lastUpdateArgs = [];
      const res = await idRoute.PATCH(
        new Request(`http://localhost/api/admin/reviews/${VALID_UUID}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ status }),
        }),
        { params: Promise.resolve({ id: VALID_UUID }) }
      );
      assert.equal(res.status, 200);
      assert.deepEqual(lastUpdateArgs, [VALID_UUID, status]);
      const body = (await res.json()) as { ok?: boolean; status?: string };
      assert.equal(body.ok, true);
      assert.equal(body.status, status);
    }
  });

  it("PATCH 502 si update échoue", async () => {
    resetState();
    updateOk = false;
    const res = await idRoute.PATCH(
      new Request(`http://localhost/api/admin/reviews/${VALID_UUID}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "published" }),
      }),
      { params: Promise.resolve({ id: VALID_UUID }) }
    );
    assert.equal(res.status, 502);
  });

  it("PATCH 503 sans service role", async () => {
    resetState();
    serviceConfigured = false;
    const res = await idRoute.PATCH(
      new Request(`http://localhost/api/admin/reviews/${VALID_UUID}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "published" }),
      }),
      { params: Promise.resolve({ id: VALID_UUID }) }
    );
    assert.equal(res.status, 503);
  });

  it("DELETE refuse sans session", async () => {
    resetState();
    guardMode = "unauthorized";
    const res = await idRoute.DELETE(
      new Request(`http://localhost/api/admin/reviews/${VALID_UUID}`, {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: VALID_UUID }) }
    );
    assert.equal(res.status, 401);
    assert.equal(lastDeleteId, "");
  });

  it("DELETE OK", async () => {
    resetState();
    const res = await idRoute.DELETE(
      new Request(`http://localhost/api/admin/reviews/${VALID_UUID}`, {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: VALID_UUID }) }
    );
    assert.equal(res.status, 200);
    assert.equal(lastDeleteId, VALID_UUID);
  });

  it("DELETE 502 si échec", async () => {
    resetState();
    deleteOk = false;
    const res = await idRoute.DELETE(
      new Request(`http://localhost/api/admin/reviews/${VALID_UUID}`, {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: VALID_UUID }) }
    );
    assert.equal(res.status, 502);
  });

  it("GET/POST sur [id] → 405", () => {
    assert.equal(idRoute.GET().status, 405);
    assert.equal(idRoute.POST().status, 405);
  });
});
