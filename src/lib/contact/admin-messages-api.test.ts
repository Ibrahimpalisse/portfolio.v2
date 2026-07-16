import assert from "node:assert/strict";
import { after, before, describe, it, mock } from "node:test";
import { ADMIN_ERROR_CODES } from "@/lib/admin/error-codes";

const VALID_UUID = "08d86636-9162-4aca-9fb8-b2f77ad90539";

type GuardMode = "ok" | "unauthorized" | "forbidden_origin" | "unavailable";

describe("API admin messages — auth, CSRF, validation", () => {
  let guardMode: GuardMode = "ok";
  let serviceConfigured = true;
  let updateOk = true;
  let deleteOk = true;
  let lastUpdateArgs: unknown[] = [];
  let lastDeleteId = "";
  let listed = false;

  let listRoute: typeof import("@/app/api/admin/messages/route");
  let idRoute: typeof import("@/app/api/admin/messages/[id]/route");

  before(() => {
    mock.module("@/lib/admin/require-admin-api", {
      namedExports: {
        requireAdminApi: async (_req: Request) => {
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

    mock.module("@/lib/contact/messages", {
      namedExports: {
        listContactMessages: async () => {
          listed = true;
          return [
            {
              id: VALID_UUID,
              created_at: "2026-07-15T10:00:00Z",
              updated_at: "2026-07-15T10:00:00Z",
              name: "Sara",
              email: "sara@example.com",
              message: "Bonjour",
              status: "unread",
              fingerprint: null,
              ip_hash: null,
              archive_note: null,
              conversation_url: null,
            },
          ];
        },
        countUnreadContactMessages: async () => 3,
        updateContactMessageStatus: async (...args: unknown[]) => {
          lastUpdateArgs = args;
          return updateOk;
        },
        deleteContactMessage: async (id: string) => {
          lastDeleteId = id;
          return deleteOk;
        },
        saveContactMessage: async () => ({ ok: false }),
        countContactSubmissionsInWindow: async () => null,
      },
    });

    mock.module("@/lib/admin/audit-log", {
      namedExports: {
        logAdminAuthEvent: () => undefined,
      },
    });
  });

  before(async () => {
    listRoute = await import("@/app/api/admin/messages/route");
    idRoute = await import("@/app/api/admin/messages/[id]/route");
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
  }

  it("GET liste refuse sans session admin", async () => {
    resetState();
    guardMode = "unauthorized";
    const res = await listRoute.GET(
      new Request("http://localhost/api/admin/messages")
    );
    assert.equal(res.status, 401);
    assert.equal(listed, false);
  });

  it("GET liste retourne configured:false sans service role", async () => {
    resetState();
    serviceConfigured = false;
    const res = await listRoute.GET(
      new Request("http://localhost/api/admin/messages")
    );
    assert.equal(res.status, 200);
    const body = (await res.json()) as {
      configured?: boolean;
      messages?: unknown[];
      unreadCount?: number;
    };
    assert.equal(body.configured, false);
    assert.deepEqual(body.messages, []);
    assert.equal(body.unreadCount, 0);
    assert.equal(listed, false);
  });

  it("GET liste retourne messages + unreadCount", async () => {
    resetState();
    const res = await listRoute.GET(
      new Request("http://localhost/api/admin/messages?status=unread&limit=10")
    );
    assert.equal(res.status, 200);
    const body = (await res.json()) as {
      ok?: boolean;
      configured?: boolean;
      unreadCount?: number;
      messages?: { email?: string }[];
    };
    assert.equal(body.ok, true);
    assert.equal(body.configured, true);
    assert.equal(body.unreadCount, 3);
    assert.equal(body.messages?.[0]?.email, "sara@example.com");
    assert.equal(listed, true);
  });

  it("POST liste → 405", async () => {
    resetState();
    const res = listRoute.POST();
    assert.equal(res.status, 405);
  });

  it("PATCH refuse sans Origin (CSRF)", async () => {
    resetState();
    guardMode = "forbidden_origin";
    const res = await idRoute.PATCH(
      new Request(`http://localhost/api/admin/messages/${VALID_UUID}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "read" }),
      }),
      { params: Promise.resolve({ id: VALID_UUID }) }
    );
    assert.equal(res.status, 403);
  });

  it("PATCH refuse content-type non JSON", async () => {
    resetState();
    const res = await idRoute.PATCH(
      new Request(`http://localhost/api/admin/messages/${VALID_UUID}`, {
        method: "PATCH",
        headers: { "content-type": "text/plain" },
        body: "status=read",
      }),
      { params: Promise.resolve({ id: VALID_UUID }) }
    );
    assert.equal(res.status, 415);
  });

  it("PATCH refuse status invalide / injection", async () => {
    resetState();
    for (const status of ["deleted", "all", "unread;drop", ""]) {
      const res = await idRoute.PATCH(
        new Request(`http://localhost/api/admin/messages/${VALID_UUID}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ status }),
        }),
        { params: Promise.resolve({ id: VALID_UUID }) }
      );
      assert.equal(res.status, 400, status);
    }
  });

  it("PATCH refuse URL archive dangereuse", async () => {
    resetState();
    const res = await idRoute.PATCH(
      new Request(`http://localhost/api/admin/messages/${VALID_UUID}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          status: "archived",
          conversationUrl: "javascript:alert(1)",
        }),
      }),
      { params: Promise.resolve({ id: VALID_UUID }) }
    );
    assert.equal(res.status, 400);
    assert.equal(lastUpdateArgs.length, 0);
  });

  it("PATCH archive avec meta OK", async () => {
    resetState();
    const res = await idRoute.PATCH(
      new Request(`http://localhost/api/admin/messages/${VALID_UUID}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          status: "archived",
          archiveNote: "Devis envoyé",
          conversationUrl: "https://mail.google.com/mail/#inbox/abc",
        }),
      }),
      { params: Promise.resolve({ id: VALID_UUID }) }
    );
    assert.equal(res.status, 200);
    assert.equal(lastUpdateArgs[0], VALID_UUID);
    assert.deepEqual(lastUpdateArgs[1], {
      status: "archived",
      archiveNote: "Devis envoyé",
      conversationUrl: "https://mail.google.com/mail/#inbox/abc",
    });
  });

  it("PATCH read sans meta archive", async () => {
    resetState();
    const res = await idRoute.PATCH(
      new Request(`http://localhost/api/admin/messages/${VALID_UUID}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          status: "read",
          archiveNote: "should-be-ignored",
        }),
      }),
      { params: Promise.resolve({ id: VALID_UUID }) }
    );
    assert.equal(res.status, 200);
    assert.deepEqual(lastUpdateArgs[1], {
      status: "read",
      archiveNote: undefined,
      conversationUrl: undefined,
    });
  });

  it("PATCH → 503 si inbox non configurée", async () => {
    resetState();
    serviceConfigured = false;
    const res = await idRoute.PATCH(
      new Request(`http://localhost/api/admin/messages/${VALID_UUID}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "read" }),
      }),
      { params: Promise.resolve({ id: VALID_UUID }) }
    );
    assert.equal(res.status, 503);
  });

  it("PATCH → 502 si update échoue", async () => {
    resetState();
    updateOk = false;
    const res = await idRoute.PATCH(
      new Request(`http://localhost/api/admin/messages/${VALID_UUID}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "unread" }),
      }),
      { params: Promise.resolve({ id: VALID_UUID }) }
    );
    assert.equal(res.status, 502);
  });

  it("DELETE OK", async () => {
    resetState();
    const res = await idRoute.DELETE(
      new Request(`http://localhost/api/admin/messages/${VALID_UUID}`, {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: VALID_UUID }) }
    );
    assert.equal(res.status, 200);
    assert.equal(lastDeleteId, VALID_UUID);
  });

  it("DELETE refuse sans Origin (CSRF)", async () => {
    resetState();
    guardMode = "forbidden_origin";
    const res = await idRoute.DELETE(
      new Request(`http://localhost/api/admin/messages/${VALID_UUID}`, {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: VALID_UUID }) }
    );
    assert.equal(res.status, 403);
    assert.equal(lastDeleteId, "");
  });

  it("DELETE → 503 si inbox non configurée", async () => {
    resetState();
    serviceConfigured = false;
    const res = await idRoute.DELETE(
      new Request(`http://localhost/api/admin/messages/${VALID_UUID}`, {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: VALID_UUID }) }
    );
    assert.equal(res.status, 503);
    assert.equal(lastDeleteId, "");
  });

  it("DELETE → 502 si échec", async () => {
    resetState();
    deleteOk = false;
    const res = await idRoute.DELETE(
      new Request(`http://localhost/api/admin/messages/${VALID_UUID}`, {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: VALID_UUID }) }
    );
    assert.equal(res.status, 502);
  });

  it("DELETE refuse sans auth", async () => {
    resetState();
    guardMode = "unauthorized";
    const res = await idRoute.DELETE(
      new Request(`http://localhost/api/admin/messages/${VALID_UUID}`, {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: VALID_UUID }) }
    );
    assert.equal(res.status, 401);
    assert.equal(lastDeleteId, "");
  });

  it("GET/POST sur [id] → 405", async () => {
    resetState();
    assert.equal(idRoute.GET().status, 405);
    assert.equal(idRoute.POST().status, 405);
  });
});
