import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it, mock } from "node:test";
import { DEFAULT_ABOUT_STATS } from "@/data/about-stats";

type MockResult = {
  data?: unknown;
  error?: { code?: string; message?: string } | null;
};

function createAboutClient(
  resolver: (op: {
    table: string;
    method: "select" | "upsert";
    payload?: unknown;
    filters: Array<{ type: string; args: unknown[] }>;
  }) => MockResult
) {
  let table = "";
  let method: "select" | "upsert" = "select";
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
  api.upsert = (row: unknown, opts?: unknown) => {
    method = "upsert";
    payload = { row, opts };
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
  api.maybeSingle = async () => finish();
  api.single = async () => finish();

  return api;
}

describe("about/store — lecture publique, admin, upsert", () => {
  let configured = true;
  let resultQueue: MockResult[] = [];
  let lastOps: Array<{
    table: string;
    method: string;
    payload?: unknown;
    filters: Array<{ type: string; args: unknown[] }>;
  }> = [];
  let store: typeof import("@/lib/about/store");

  before(() => {
    mock.module("@/lib/supabase/service", {
      namedExports: {
        isSupabaseServiceConfigured: () => configured,
        createSupabaseServiceClient: () => {
          if (!configured) return null;
          return createAboutClient((op) => {
            lastOps.push({ ...op, filters: [...op.filters] });
            return resultQueue.shift() ?? { data: null, error: null };
          });
        },
      },
    });
  });

  before(async () => {
    store = await import("@/lib/about/store");
  });

  after(() => {
    mock.reset();
  });

  beforeEach(() => {
    configured = true;
    resultQueue = [];
    lastOps = [];
  });

  it("getAboutStats → défauts si non configuré", async () => {
    configured = false;
    const stats = await store.getAboutStats();
    assert.deepEqual(stats, DEFAULT_ABOUT_STATS);
    assert.equal(lastOps.length, 0);
  });

  it("getAboutStats → défauts si erreur BDD", async () => {
    resultQueue.push({ data: null, error: { message: "permission denied" } });
    const stats = await store.getAboutStats();
    assert.deepEqual(stats, DEFAULT_ABOUT_STATS);
  });

  it("getAboutStats → défauts si ligne absente", async () => {
    resultQueue.push({ data: null, error: null });
    const stats = await store.getAboutStats();
    assert.deepEqual(stats, DEFAULT_ABOUT_STATS);
  });

  it("getAboutStats mappe la ligne (years numeric string)", async () => {
    resultQueue.push({
      data: {
        years: "3.5",
        clients: 10,
        projects: 7,
        response_hours: 24,
      },
      error: null,
    });
    const stats = await store.getAboutStats();
    assert.deepEqual(stats, {
      years: 3.5,
      clients: 10,
      projects: 7,
      responseHours: 24,
    });
    assert.equal(lastOps[0]?.table, "about_stats");
    assert.equal(lastOps[0]?.method, "select");
    assert.deepEqual(lastOps[0]?.filters.find((f) => f.type === "eq")?.args, [
      "id",
      "default",
    ]);
  });

  it("getAboutStatsForAdmin configured:false sans service role", async () => {
    configured = false;
    const result = await store.getAboutStatsForAdmin();
    assert.deepEqual(result, {
      ok: true,
      configured: false,
      stats: DEFAULT_ABOUT_STATS,
      updatedAt: null,
    });
  });

  it("getAboutStatsForAdmin → persist_failed sur erreur select", async () => {
    resultQueue.push({ data: null, error: { message: "relation missing" } });
    const result = await store.getAboutStatsForAdmin();
    assert.deepEqual(result, { ok: false, reason: "persist_failed" });
  });

  it("getAboutStatsForAdmin seed si table vide puis ok", async () => {
    resultQueue.push({ data: null, error: null }); // maybeSingle empty
    resultQueue.push({
      data: {
        years: 2.5,
        clients: 1,
        projects: 4,
        response_hours: 48,
        updated_at: "2026-07-16T00:00:00Z",
      },
      error: null,
    }); // upsert seed
    const result = await store.getAboutStatsForAdmin();
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.configured, true);
      assert.deepEqual(result.stats, DEFAULT_ABOUT_STATS);
      assert.equal(result.updatedAt, "2026-07-16T00:00:00Z");
    }
    assert.equal(lastOps.some((o) => o.method === "upsert"), true);
    const upsert = lastOps.find((o) => o.method === "upsert");
    const payload = upsert?.payload as { row: Record<string, unknown> };
    assert.equal(payload.row.id, "default");
    assert.equal(payload.row.response_hours, 48);
  });

  it("getAboutStatsForAdmin lit la ligne existante", async () => {
    resultQueue.push({
      data: {
        years: 5,
        clients: 2,
        projects: 9,
        response_hours: 12,
        updated_at: "2026-07-15T12:00:00Z",
      },
      error: null,
    });
    const result = await store.getAboutStatsForAdmin();
    assert.deepEqual(result, {
      ok: true,
      configured: true,
      stats: {
        years: 5,
        clients: 2,
        projects: 9,
        responseHours: 12,
      },
      updatedAt: "2026-07-15T12:00:00Z",
    });
  });

  it("upsertAboutStats refuse si non configuré", async () => {
    configured = false;
    const result = await store.upsertAboutStats({
      years: 1,
      clients: 1,
      projects: 1,
      responseHours: 1,
    });
    assert.deepEqual(result, { ok: false, reason: "not_configured" });
  });

  it("upsertAboutStats écrit snake_case et retourne camelCase", async () => {
    resultQueue.push({
      data: {
        years: 4,
        clients: 8,
        projects: 15,
        response_hours: 36,
        updated_at: "2026-07-16T01:00:00Z",
      },
      error: null,
    });
    const result = await store.upsertAboutStats({
      years: 4,
      clients: 8,
      projects: 15,
      responseHours: 36,
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.deepEqual(result.stats, {
        years: 4,
        clients: 8,
        projects: 15,
        responseHours: 36,
      });
      assert.equal(result.updatedAt, "2026-07-16T01:00:00Z");
    }
    const upsert = lastOps[0];
    assert.equal(upsert?.table, "about_stats");
    assert.equal(upsert?.method, "upsert");
    const payload = upsert?.payload as {
      row: Record<string, unknown>;
      opts: { onConflict: string };
    };
    assert.equal(payload.opts.onConflict, "id");
    assert.equal(payload.row.id, "default");
    assert.equal(payload.row.response_hours, 36);
    assert.equal(
      Object.prototype.hasOwnProperty.call(payload.row, "responseHours"),
      false
    );
  });

  it("upsertAboutStats → persist_failed sur erreur", async () => {
    resultQueue.push({ data: null, error: { message: "check constraint" } });
    const result = await store.upsertAboutStats({
      years: 1,
      clients: 1,
      projects: 1,
      responseHours: 1,
    });
    assert.deepEqual(result, { ok: false, reason: "persist_failed" });
  });
});
