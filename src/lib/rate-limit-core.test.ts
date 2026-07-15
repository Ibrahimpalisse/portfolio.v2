import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  checkRateLimitInStore,
  getClientIp,
  pruneRateLimitStore,
  RATE_LIMIT_MAX_REQUESTS,
  RATE_LIMIT_WINDOW_MS,
} from "@/lib/rate-limit-core";

describe("OWASP A04 — rate-limit-core", () => {
  it("getClientIp lit x-forwarded-for (première IP)", () => {
    const request = new Request("http://localhost", {
      headers: { "x-forwarded-for": " 1.2.3.4, 5.6.7.8" },
    });
    assert.equal(getClientIp(request), "1.2.3.4");
  });

  it("getClientIp retombe sur x-real-ip puis unknown", () => {
    const realIp = new Request("http://localhost", {
      headers: { "x-real-ip": "9.9.9.9" },
    });
    assert.equal(getClientIp(realIp), "9.9.9.9");

    const unknown = new Request("http://localhost");
    assert.equal(getClientIp(unknown), "unknown");
  });

  it("checkRateLimitInStore autorise puis bloque", () => {
    const store = new Map<string, { count: number; resetAt: number }>();
    const key = `ip-${Date.now()}`;
    const now = Date.now();

    for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS; i += 1) {
      const result = checkRateLimitInStore(store, key, now, RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX_REQUESTS);
      assert.equal(result.allowed, true);
    }

    const blocked = checkRateLimitInStore(store, key, now, RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX_REQUESTS);
    assert.equal(blocked.allowed, false);
    assert.ok(blocked.retryAfterSec && blocked.retryAfterSec > 0);
  });

  it("pruneRateLimitStore nettoie les entrées expirées", () => {
    const store = new Map<string, { count: number; resetAt: number }>();
    store.set("old", { count: 5, resetAt: 1000 });
    store.set("fresh", { count: 1, resetAt: Date.now() + 60_000 });
    pruneRateLimitStore(store, 2000);
    assert.equal(store.has("old"), false);
    assert.equal(store.has("fresh"), true);
  });
});
