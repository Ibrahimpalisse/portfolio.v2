import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it, mock } from "node:test";
import { hashForAudit } from "@/lib/security/fingerprint";

type MockResult = {
  data?: unknown;
  error?: { code?: string; message?: string } | null;
  count?: number | null;
};

function createChainableClient(
  resolver: (op: {
    table: string;
    method: "insert" | "select" | "update" | "delete";
    payload?: unknown;
    filters: Array<{ type: string; args: unknown[] }>;
  }) => MockResult
) {
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
  api.in = (...args: unknown[]) => {
    filters.push({ type: "in", args });
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

describe("reviews/store — persistance & unicité (Supabase mocké)", () => {
  let configured = true;
  let resultQueue: MockResult[] = [];
  let lastOps: Array<{
    table: string;
    method: string;
    payload?: unknown;
    filters: Array<{ type: string; args: unknown[] }>;
  }> = [];
  let store: typeof import("@/lib/reviews/store");

  before(() => {
    mock.module("@/lib/supabase/service", {
      namedExports: {
        isSupabaseServiceConfigured: () => configured,
        createSupabaseServiceClient: () => {
          if (!configured) return null;
          return createChainableClient((op) => {
            lastOps.push({ ...op, filters: [...op.filters] });
            return resultQueue.shift() ?? { data: null, error: null, count: 0 };
          });
        },
      },
    });
  });

  before(async () => {
    store = await import("@/lib/reviews/store");
  });

  after(() => {
    mock.reset();
  });

  beforeEach(() => {
    configured = true;
    resultQueue = [];
    lastOps = [];
  });

  const saveInput = {
    name: "Jean",
    email: "Jean@Example.COM",
    role: "CEO",
    message: "Super prestation, merci beaucoup.",
    rating: 5,
    fingerprint: "fp-review-1",
    ip: "203.0.113.50",
    userAgent: "Mozilla/5.0 ReviewTest",
  };

  it("reviewRowToItem mappe role vide", () => {
    assert.deepEqual(
      store.reviewRowToItem({
        id: "1",
        name: "A",
        role: "  ",
        message: "txt",
        rating: 4,
      }),
      { id: "1", name: "A", role: "", text: "txt", rating: 4 }
    );
  });

  it("getPublishedReviews → démos si non configuré", async () => {
    configured = false;
    const { reviews: demos } = await import("@/data/reviews");
    const items = await store.getPublishedReviews();
    assert.deepEqual(items, demos);
    assert.equal(lastOps.length, 0);
  });

  it("saveReview refuse si service non configuré", async () => {
    configured = false;
    const r = await store.saveReview(saveInput);
    assert.deepEqual(r, { ok: false, reason: "not_configured" });
  });

  it("saveReview bloqué si email déjà pending|published", async () => {
    resultQueue = [
      {
        data: { id: VALID_UUID, status: "pending", name: "Jean" },
        error: null,
      },
    ];
    const r = await store.saveReview(saveInput);
    assert.deepEqual(r, { ok: false, reason: "duplicate_email" });
    assert.equal(lastOps.length, 1);
    assert.equal(lastOps[0]?.method, "select");
    const emailEq = lastOps[0]?.filters.find((f) => f.type === "eq");
    assert.deepEqual(emailEq?.args, ["email", "jean@example.com"]);
  });

  it("saveReview insert pending + hashes (email normalisé)", async () => {
    resultQueue = [
      { data: null, error: null },
      { data: { id: VALID_UUID }, error: null },
    ];
    const r = await store.saveReview(saveInput);
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.id, VALID_UUID);

    const insertOp = lastOps.find((o) => o.method === "insert");
    assert.ok(insertOp);
    const row = insertOp!.payload as Record<string, unknown>;
    assert.equal(row.status, "pending");
    assert.equal(row.email, "jean@example.com");
    assert.equal(row.ip_hash, hashForAudit("203.0.113.50"));
    assert.equal(
      row.user_agent_hash,
      hashForAudit("Mozilla/5.0 ReviewTest".slice(0, 256))
    );
    assert.equal(String(row.ip_hash).includes("203.0.113"), false);
  });

  it("saveReview 23505 email → duplicate_email", async () => {
    resultQueue = [
      { data: null, error: null },
      {
        data: null,
        error: {
          code: "23505",
          message: 'duplicate key value violates unique constraint "reviews_active_email_uidx"',
        },
      },
    ];
    const r = await store.saveReview(saveInput);
    assert.deepEqual(r, { ok: false, reason: "duplicate_email" });
  });

  it("saveReview 23505 fingerprint → ok duplicate soft", async () => {
    resultQueue = [
      { data: null, error: null },
      {
        data: null,
        error: { code: "23505", message: "duplicate key on fingerprint" },
      },
    ];
    const r = await store.saveReview(saveInput);
    assert.deepEqual(r, { ok: true, id: "duplicate", duplicate: true });
  });

  it("saveReview erreur SQL autre → persist_failed", async () => {
    resultQueue = [
      { data: null, error: null },
      { data: null, error: { code: "42P01" } },
    ];
    const r = await store.saveReview(saveInput);
    assert.deepEqual(r, { ok: false, reason: "persist_failed" });
  });

  it("listReviews borne limit 1–100 et filtre status", async () => {
    resultQueue = [{ data: [], error: null }];
    await store.listReviews({ limit: 999, status: "published" });
    const limit = lastOps[0]?.filters.find((f) => f.type === "limit");
    assert.deepEqual(limit?.args, [100]);
    const statusEq = lastOps[0]?.filters.find(
      (f) => f.type === "eq" && f.args[0] === "status"
    );
    assert.deepEqual(statusEq?.args, ["status", "published"]);

    lastOps = [];
    resultQueue = [{ data: [], error: null }];
    await store.listReviews({ limit: 0, status: "all" });
    assert.deepEqual(
      lastOps[0]?.filters.find((f) => f.type === "limit")?.args,
      [1]
    );
    assert.equal(
      lastOps[0]?.filters.some((f) => f.type === "eq" && f.args[0] === "status"),
      false
    );
  });

  it("updateReviewStatus refuse UUID invalide", async () => {
    assert.equal(await store.updateReviewStatus("not-uuid", "published"), false);
    assert.equal(lastOps.length, 0);
  });

  it("updateReviewStatus published pose published_at", async () => {
    resultQueue = [{ data: null, error: null }];
    const ok = await store.updateReviewStatus(VALID_UUID, "published");
    assert.equal(ok, true);
    const patch = lastOps[0]?.payload as Record<string, unknown>;
    assert.equal(patch.status, "published");
    assert.ok(typeof patch.published_at === "string");
  });

  it("updateReviewStatus rejected/pending clear published_at", async () => {
    for (const status of ["rejected", "pending"] as const) {
      lastOps = [];
      resultQueue = [{ data: null, error: null }];
      assert.equal(await store.updateReviewStatus(VALID_UUID, status), true);
      const patch = lastOps[0]?.payload as Record<string, unknown>;
      assert.equal(patch.status, status);
      assert.equal(patch.published_at, null);
    }
  });

  it("deleteReview refuse UUID invalide", async () => {
    assert.equal(await store.deleteReview("';';"), false);
    assert.equal(lastOps.length, 0);
  });

  it("deleteReview OK sur UUID valide", async () => {
    resultQueue = [{ data: null, error: null }];
    assert.equal(await store.deleteReview(VALID_UUID), true);
    assert.equal(lastOps[0]?.method, "delete");
  });

  it("countReviewsInWindow filtre ip_hash", async () => {
    resultQueue = [
      { data: null, error: null, count: 2 },
      { data: [{ created_at: "2026-07-15T10:00:00Z" }], error: null },
    ];
    const stats = await store.countReviewsInWindow({
      since: "2026-07-14T00:00:00Z",
      ip: "198.51.100.9",
    });
    assert.deepEqual(stats, {
      count: 2,
      oldestCreatedAt: "2026-07-15T10:00:00Z",
    });
    const ipFilter = lastOps[0]?.filters.find(
      (f) => f.type === "eq" && f.args[0] === "ip_hash"
    );
    assert.deepEqual(ipFilter?.args, [
      "ip_hash",
      hashForAudit("198.51.100.9"),
    ]);
  });

  it("countReviewsInWindow erreur count → null", async () => {
    resultQueue = [{ data: null, error: { code: "XX" }, count: null }];
    const stats = await store.countReviewsInWindow({
      since: "2026-07-14T00:00:00Z",
      ip: "1.1.1.1",
    });
    assert.equal(stats, null);
  });

  it("countReviewsByStatus retourne count", async () => {
    resultQueue = [{ data: null, error: null, count: 4 }];
    assert.equal(await store.countReviewsByStatus("pending"), 4);
  });
});
