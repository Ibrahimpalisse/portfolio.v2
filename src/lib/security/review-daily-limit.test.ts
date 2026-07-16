import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import { FORM_SECURITY } from "@/lib/security/constants";
import {
  checkReviewIpDailyLimit,
  clearReviewDailyLimitsForTests,
  setReviewSubmissionCounterForTests,
} from "@/lib/security/review-daily-limit";

const envBackup = new Map<string, string | undefined>();

function setEnv(key: string, value: string | undefined) {
  if (!envBackup.has(key)) envBackup.set(key, process.env[key]);
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

function restoreEnv() {
  for (const [key, value] of envBackup.entries()) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  envBackup.clear();
}

describe("checkReviewIpDailyLimit", () => {
  beforeEach(() => {
    clearReviewDailyLimitsForTests();
    setEnv("SUPABASE_SERVICE_ROLE_KEY", undefined);
    setEnv("NEXT_PUBLIC_SUPABASE_URL", undefined);
  });

  afterEach(restoreEnv);

  it("autorise jusqu'à REVIEW_IP_DAILY_MAX / jour (mémoire)", async () => {
    const ip = "203.0.113.77";
    for (let i = 0; i < FORM_SECURITY.REVIEW_IP_DAILY_MAX; i += 1) {
      const r = await checkReviewIpDailyLimit(ip);
      assert.equal(r.allowed, true, `attempt ${i + 1}`);
    }
    const blocked = await checkReviewIpDailyLimit(ip);
    assert.equal(blocked.allowed, false);
    assert.ok(blocked.retryAfterSec && blocked.retryAfterSec > 0);
  });

  it("bloque via BDD si count >= max", async () => {
    setEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    setEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon");
    setEnv("SUPABASE_SERVICE_ROLE_KEY", "service");
    setReviewSubmissionCounterForTests(async () => ({
      count: FORM_SECURITY.REVIEW_IP_DAILY_MAX,
      oldestCreatedAt: new Date().toISOString(),
    }));
    const r = await checkReviewIpDailyLimit("198.51.100.1");
    assert.equal(r.allowed, false);
    assert.equal(r.source, "database");
  });

  it("plafond avis IP = 2 (pas 1 à vie)", () => {
    assert.equal(FORM_SECURITY.REVIEW_IP_DAILY_MAX, 2);
    assert.equal(
      FORM_SECURITY.REVIEW_IP_DAILY_WINDOW_MS,
      24 * 60 * 60 * 1000
    );
  });

  it("autorise via BDD si count < max", async () => {
    setEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    setEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon");
    setEnv("SUPABASE_SERVICE_ROLE_KEY", "service");
    setReviewSubmissionCounterForTests(async () => ({
      count: FORM_SECURITY.REVIEW_IP_DAILY_MAX - 1,
      oldestCreatedAt: new Date().toISOString(),
    }));
    const r = await checkReviewIpDailyLimit("198.51.100.2");
    assert.equal(r.allowed, true);
    assert.equal(r.source, "database");
  });

  it("fallback mémoire si compteur BDD retourne null", async () => {
    setEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    setEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon");
    setEnv("SUPABASE_SERVICE_ROLE_KEY", "service");
    setReviewSubmissionCounterForTests(async () => null);
    const ip = "198.51.100.3";
    for (let i = 0; i < FORM_SECURITY.REVIEW_IP_DAILY_MAX; i += 1) {
      assert.equal((await checkReviewIpDailyLimit(ip)).allowed, true);
    }
    const blocked = await checkReviewIpDailyLimit(ip);
    assert.equal(blocked.allowed, false);
    assert.equal(blocked.source, "memory");
  });

  it("IP unknown utilise le store mémoire", async () => {
    for (let i = 0; i < FORM_SECURITY.REVIEW_IP_DAILY_MAX; i += 1) {
      assert.equal((await checkReviewIpDailyLimit("unknown")).allowed, true);
    }
    assert.equal((await checkReviewIpDailyLimit("unknown")).allowed, false);
  });

  it("IPs différentes ne partagent pas le quota", async () => {
    for (let i = 0; i < FORM_SECURITY.REVIEW_IP_DAILY_MAX; i += 1) {
      assert.equal(
        (await checkReviewIpDailyLimit("203.0.113.1")).allowed,
        true
      );
    }
    assert.equal((await checkReviewIpDailyLimit("203.0.113.1")).allowed, false);
    assert.equal((await checkReviewIpDailyLimit("203.0.113.2")).allowed, true);
  });
});
