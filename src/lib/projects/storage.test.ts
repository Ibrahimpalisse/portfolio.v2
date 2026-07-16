import assert from "node:assert/strict";
import { after, before, describe, it, mock } from "node:test";
import { PROJECT_LIMITS } from "@/lib/projects/schema";

describe("projects storage (upload + delete)", () => {
  let configured = true;
  let uploadError: { message: string } | null = null;
  let lastUpload: {
    path?: string;
    contentType?: string;
    upsert?: boolean;
  } | null = null;
  let removed: string[] | null = null;

  let uploadProjectImage: typeof import("@/lib/projects/storage").uploadProjectImage;
  let deleteProjectImageByUrl: typeof import("@/lib/projects/storage").deleteProjectImageByUrl;

  before(() => {
    mock.module("@/lib/supabase/service", {
      namedExports: {
        isSupabaseServiceConfigured: () => configured,
        createSupabaseServiceClient: () => {
          if (!configured) return null;
          return {
            storage: {
              from: () => ({
                upload: async (
                  path: string,
                  _buf: Buffer,
                  opts: { contentType: string; upsert: boolean }
                ) => {
                  lastUpload = {
                    path,
                    contentType: opts.contentType,
                    upsert: opts.upsert,
                  };
                  return { error: uploadError };
                },
                getPublicUrl: (path: string) => ({
                  data: {
                    publicUrl: `https://abc.supabase.co/storage/v1/object/public/portfolio-projects/${path}`,
                  },
                }),
                remove: async (paths: string[]) => {
                  removed = paths;
                  return { error: null };
                },
              }),
            },
          };
        },
      },
    });
  });

  before(async () => {
    const mod = await import("@/lib/projects/storage");
    uploadProjectImage = mod.uploadProjectImage;
    deleteProjectImageByUrl = mod.deleteProjectImageByUrl;
  });

  after(() => mock.reset());

  function reset() {
    configured = true;
    uploadError = null;
    lastUpload = null;
    removed = null;
  }

  it("refuse si service non configuré", async () => {
    reset();
    configured = false;
    const file = new File([new Uint8Array([1, 2, 3])], "x.png", {
      type: "image/png",
    });
    const res = await uploadProjectImage(file);
    assert.equal(res.ok, false);
    if (!res.ok) assert.equal(res.reason, "not_configured");
  });

  it("refuse MIME non whitelisté (OWASP A04 — pas de SVG)", async () => {
    reset();
    const file = new File([new Uint8Array([1])], "x.svg", {
      type: "image/svg+xml",
    });
    const res = await uploadProjectImage(file);
    assert.equal(res.ok, false);
    if (!res.ok) assert.equal(res.reason, "invalid_type");
  });

  it("refuse fichier trop gros", async () => {
    reset();
    const big = new Uint8Array(PROJECT_LIMITS.uploadMaxBytes + 1);
    const file = new File([big], "big.png", { type: "image/png" });
    const res = await uploadProjectImage(file);
    assert.equal(res.ok, false);
    if (!res.ok) assert.equal(res.reason, "too_large");
  });

  it("refuse fichier vide", async () => {
    reset();
    const file = new File([], "empty.png", { type: "image/png" });
    const res = await uploadProjectImage(file);
    assert.equal(res.ok, false);
    if (!res.ok) assert.equal(res.reason, "too_large");
  });

  it("upload OK : path UUID sous projects/ sans upsert", async () => {
    reset();
    const file = new File([new Uint8Array([9, 9])], "ok.webp", {
      type: "image/webp",
    });
    const res = await uploadProjectImage(file);
    assert.equal(res.ok, true);
    if (res.ok) {
      assert.match(res.path, /^projects\/[0-9a-f-]{36}\.webp$/);
      assert.match(res.url, /portfolio-projects\/projects\//);
    }
    assert.equal(lastUpload?.upsert, false);
    assert.equal(lastUpload?.contentType, "image/webp");
  });

  it("propagate upload_failed", async () => {
    reset();
    uploadError = { message: "denied" };
    const file = new File([new Uint8Array([1])], "x.jpg", {
      type: "image/jpeg",
    });
    const res = await uploadProjectImage(file);
    assert.equal(res.ok, false);
    if (!res.ok) assert.equal(res.reason, "upload_failed");
  });

  it("delete : rejette URL hors bucket / path traversal", async () => {
    reset();
    assert.equal(
      await deleteProjectImageByUrl("https://evil.test/x.png"),
      false
    );
    assert.equal(
      await deleteProjectImageByUrl(
        "https://abc.supabase.co/storage/v1/object/public/portfolio-projects/../secret"
      ),
      false
    );
    assert.equal(removed, null);
  });

  it("delete : path public valide", async () => {
    reset();
    const ok = await deleteProjectImageByUrl(
      "https://abc.supabase.co/storage/v1/object/public/portfolio-projects/projects/uid.png"
    );
    assert.equal(ok, true);
    assert.deepEqual(removed, ["projects/uid.png"]);
  });
});
