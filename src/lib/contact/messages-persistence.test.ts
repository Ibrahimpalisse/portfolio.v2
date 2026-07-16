import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it, mock } from "node:test";
import { hashForAudit } from "@/lib/security/fingerprint";

type MockResult = {
  data?: unknown;
  error?: { code?: string } | null;
  count?: number | null;
};

/**
 * Client Supabase minimal chaînable pour les chemins de `messages.ts`.
 */
function createChainableClient(resolver: (op: {
  table: string;
  method: "insert" | "select" | "update" | "delete";
  payload?: unknown;
  filters: Array<{ type: string; args: unknown[] }>;
}) => MockResult) {
  let table = "";
  let method: "insert" | "select" | "update" | "delete" = "select";
  let payload: unknown;
  const filters: Array<{ type: string; args: unknown[] }> = [];

  const finish = () => resolver({ table, method, payload, filters });

  const api: Record<string, unknown> = {};
  const chain = () => api;

  api.from = (t: string) => {
    table = t;
    filters.length = 0;
    payload = undefined;
    method = "select";
    return chain();
  };
  api.insert = (row: unknown) => {
    method = "insert";
    payload = row;
    return chain();
  };
  api.update = (row: unknown) => {
    method = "update";
    payload = row;
    return chain();
  };
  api.delete = () => {
    method = "delete";
    return chain();
  };
  api.select = (...args: unknown[]) => {
    filters.push({ type: "select", args });
    return chain();
  };
  api.eq = (...args: unknown[]) => {
    filters.push({ type: "eq", args });
    return chain();
  };
  api.gte = (...args: unknown[]) => {
    filters.push({ type: "gte", args });
    return chain();
  };
  api.order = (...args: unknown[]) => {
    filters.push({ type: "order", args });
    return chain();
  };
  api.limit = (...args: unknown[]) => {
    filters.push({ type: "limit", args });
    return chain();
  };
  api.maybeSingle = async () => finish();
  api.then = (
    resolve: (v: MockResult) => unknown,
    reject?: (e: unknown) => unknown
  ) => Promise.resolve(finish()).then(resolve, reject);

  return api;
}

const VALID_UUID = "08d86636-9162-4aca-9fb8-b2f77ad90539";

describe("messages.ts — persistance (Supabase mocké)", () => {
  let lastOp: {
    table: string;
    method: string;
    payload?: unknown;
    filters: Array<{ type: string; args: unknown[] }>;
  } | null = null;
  let nextResult: MockResult = { data: null, error: null, count: 0 };
  let secondResult: MockResult | null = null;
  let callIndex = 0;
  let dbCalls = 0;
  let messages: typeof import("@/lib/contact/messages");

  before(() => {
    mock.module("@/lib/supabase/service", {
      namedExports: {
        isSupabaseServiceConfigured: () => true,
        createSupabaseServiceClient: () =>
          createChainableClient((op) => {
            lastOp = op;
            dbCalls += 1;
            callIndex += 1;
            if (callIndex === 2 && secondResult) return secondResult;
            return nextResult;
          }),
      },
    });
  });

  before(async () => {
    messages = await import("@/lib/contact/messages");
  });

  after(() => {
    mock.reset();
  });

  beforeEach(() => {
    lastOp = null;
    nextResult = { data: null, error: null, count: 0 };
    secondResult = null;
    callIndex = 0;
    dbCalls = 0;
  });

  it("saveContactMessage insert hash IP + status unread", async () => {
    nextResult = { data: { id: VALID_UUID }, error: null };
    const r = await messages.saveContactMessage({
      name: "Jean",
      email: "jean@example.com",
      message: "Message assez long pour le test.",
      fingerprint: "fp-abc",
      ip: "203.0.113.10",
      userAgent: "Mozilla/5.0",
    });

    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.id, VALID_UUID);
    assert.equal(lastOp?.table, "contact_messages");
    assert.equal(lastOp?.method, "insert");
    const row = lastOp?.payload as Record<string, unknown>;
    assert.equal(row.status, "unread");
    assert.equal(row.ip_hash, hashForAudit("203.0.113.10"));
    assert.equal(row.user_agent_hash, hashForAudit("Mozilla/5.0".slice(0, 256)));
    assert.equal(String(row.ip_hash).includes("203.0.113"), false);
  });

  it("saveContactMessage traite unique violation 23505 comme duplicate OK", async () => {
    nextResult = { data: null, error: { code: "23505" } };
    const r = await messages.saveContactMessage({
      name: "Jean",
      email: "j@example.com",
      message: "Message assez long pour le test.",
      fingerprint: "fp-dup",
      ip: "127.0.0.1",
    });
    assert.deepEqual(r, { ok: true, id: "duplicate", duplicate: true });
  });

  it("saveContactMessage échoue sur erreur SQL autre", async () => {
    nextResult = { data: null, error: { code: "42P01" } };
    const r = await messages.saveContactMessage({
      name: "Jean",
      email: "j@example.com",
      message: "Message assez long pour le test.",
      fingerprint: "fp-err",
      ip: "127.0.0.1",
    });
    assert.equal(r.ok, false);
  });

  it("listContactMessages borne la limit entre 1 et 100", async () => {
    nextResult = { data: [], error: null };

    await messages.listContactMessages({ limit: 999 });
    assert.deepEqual(
      lastOp?.filters.find((f) => f.type === "limit")?.args,
      [100]
    );

    lastOp = null;
    await messages.listContactMessages({ limit: 0 });
    assert.deepEqual(
      lastOp?.filters.find((f) => f.type === "limit")?.args,
      [1]
    );
  });

  it("listContactMessages filtre par status sauf all", async () => {
    nextResult = {
      data: [
        {
          id: VALID_UUID,
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
          name: "A",
          email: "a@b.co",
          message: "x",
          status: "unread",
          fingerprint: null,
          ip_hash: null,
          archive_note: null,
          conversation_url: null,
        },
      ],
      error: null,
    };

    const rows = await messages.listContactMessages({
      status: "unread",
      limit: 10,
    });
    assert.equal(rows.length, 1);
    assert.ok(
      lastOp?.filters.some((f) => f.type === "eq" && f.args[0] === "status")
    );

    lastOp = null;
    await messages.listContactMessages({ status: "all" });
    assert.equal(
      lastOp?.filters.some((f) => f.type === "eq" && f.args[0] === "status"),
      false
    );
  });

  it("countUnreadContactMessages lit count exact", async () => {
    nextResult = { count: 7, error: null, data: null };
    assert.equal(await messages.countUnreadContactMessages(), 7);
  });

  it("updateContactMessageStatus archive écrit note + url", async () => {
    nextResult = { error: null };
    const ok = await messages.updateContactMessageStatus(VALID_UUID, {
      status: "archived",
      archiveNote: "Suivi Gmail",
      conversationUrl: "https://mail.google.com/x",
    });
    assert.equal(ok, true);
    assert.equal(lastOp?.method, "update");
    assert.deepEqual(lastOp?.payload, {
      status: "archived",
      archive_note: "Suivi Gmail",
      conversation_url: "https://mail.google.com/x",
    });
  });

  it("updateContactMessageStatus read/unread efface les meta archive", async () => {
    nextResult = { error: null };
    await messages.updateContactMessageStatus(VALID_UUID, { status: "read" });
    assert.deepEqual(lastOp?.payload, {
      status: "read",
      archive_note: null,
      conversation_url: null,
    });
  });

  it("update/delete refusent UUID invalide sans op DB", async () => {
    assert.equal(
      await messages.updateContactMessageStatus("not-uuid", { status: "read" }),
      false
    );
    assert.equal(await messages.deleteContactMessage("'; DROP--"), false);
    assert.equal(dbCalls, 0);
    assert.equal(lastOp, null);
  });

  it("deleteContactMessage OK sur UUID v4", async () => {
    nextResult = { error: null };
    assert.equal(await messages.deleteContactMessage(VALID_UUID), true);
    assert.equal(lastOp?.method, "delete");
  });

  it("countContactSubmissionsInWindow filtre email + ip_hash", async () => {
    nextResult = { count: 2, error: null, data: null };
    secondResult = {
      data: [{ created_at: "2026-07-15T08:00:00.000Z" }],
      error: null,
    };
    const stats = await messages.countContactSubmissionsInWindow({
      since: "2026-07-14T12:00:00.000Z",
      email: "  Mixed@Example.COM ",
      ip: "198.51.100.9",
    });
    assert.deepEqual(stats, {
      count: 2,
      oldestCreatedAt: "2026-07-15T08:00:00.000Z",
    });
    assert.equal(dbCalls, 2);
  });
});
