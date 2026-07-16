import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it, mock } from "node:test";

type MockResult = {
  data?: unknown;
  error?: { code?: string; message?: string } | null;
};

function createProjectsClient(
  resolver: (op: {
    table: string;
    method: "select" | "insert" | "update" | "delete";
    payload?: unknown;
    filters: Array<{ type: string; args: unknown[] }>;
  }) => MockResult
) {
  let table = "";
  let method: "select" | "insert" | "update" | "delete" = "select";
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
  api.order = (...args: unknown[]) => {
    filters.push({ type: "order", args });
    return chain();
  };
  api.limit = (...args: unknown[]) => {
    filters.push({ type: "limit", args });
    return chain();
  };
  api.single = async () => finish();
  api.maybeSingle = async () => finish();
  api.then = (
    resolve: (v: MockResult) => unknown,
    reject?: (e: unknown) => unknown
  ) => Promise.resolve(finish()).then(resolve, reject);

  return api;
}

const sampleRow = {
  id: "08d86636-9162-4aca-9fb8-b2f77ad90539",
  created_at: "2026-07-16T00:00:00Z",
  updated_at: "2026-07-16T00:00:00Z",
  slug: "nova",
  title: { fr: "Nova FR", en: "Nova EN", ar: "Nova AR" },
  description: {
    fr: "Desc FR assez longue ici.",
    en: "Desc EN long enough here.",
    ar: "وصف عربي كافٍ هنا فعلا.",
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

describe("projects/store", () => {
  let configured = true;
  let resultQueue: MockResult[] = [];
  let lastOps: Array<{ method: string; payload?: unknown }> = [];
  let store: typeof import("@/lib/projects/store");

  before(() => {
    mock.module("@/lib/supabase/service", {
      namedExports: {
        isSupabaseServiceConfigured: () => configured,
        createSupabaseServiceClient: () => {
          if (!configured) return null;
          return createProjectsClient((op) => {
            lastOps.push({ method: op.method, payload: op.payload });
            return resultQueue.shift() ?? { data: null, error: null };
          });
        },
      },
    });
  });

  before(async () => {
    store = await import("@/lib/projects/store");
  });

  after(() => mock.reset());

  beforeEach(() => {
    configured = true;
    resultQueue = [];
    lastOps = [];
  });

  it("listPublished → null si non configuré", async () => {
    configured = false;
    assert.equal(await store.listPublishedProjectRows(), null);
  });

  it("getPublishedProjects mappe la locale", async () => {
    resultQueue.push({ data: [sampleRow], error: null });
    const items = await store.getPublishedProjects("fr", {
      personal: "Perso",
      sold: "Vendu",
    });
    assert.equal(items.length, 1);
    assert.equal(items[0]?.title, "Nova FR");
    assert.equal(items[0]?.categoryKey, "personal");
    assert.equal(items[0]?.businessTypeIds?.[0], "dashboard");
  });

  it("createProject écrit business_type_ids snake_case", async () => {
    resultQueue.push({ data: sampleRow, error: null });
    const result = await store.createProject({
      slug: "nova",
      title: sampleRow.title,
      description: sampleRow.description,
      kind: "personal",
      businessTypeIds: ["dashboard"],
      images: sampleRow.images,
      link: null,
      sortOrder: 0,
      published: true,
    });
    assert.equal(result.ok, true);
    assert.equal(lastOps[0]?.method, "insert");
    const payload = lastOps[0]?.payload as Record<string, unknown>;
    assert.deepEqual(payload.business_type_ids, ["dashboard"]);
    assert.equal("businessTypeIds" in payload, false);
  });

  it("createProject duplicate_slug", async () => {
    resultQueue.push({
      data: null,
      error: { code: "23505", message: "duplicate" },
    });
    const result = await store.createProject({
      slug: "nova",
      title: sampleRow.title,
      description: sampleRow.description,
      kind: "sold",
      businessTypeIds: [],
      images: sampleRow.images,
      link: null,
      sortOrder: 0,
      published: false,
    });
    assert.deepEqual(result, { ok: false, reason: "duplicate_slug" });
  });

  it("deleteProject refuse UUID invalide", async () => {
    assert.equal(await store.deleteProject("not-uuid"), false);
  });

  it("updateProject invalid_id", async () => {
    const result = await store.updateProject("bad", { published: true });
    assert.deepEqual(result, { ok: false, reason: "invalid_id" });
  });
});
