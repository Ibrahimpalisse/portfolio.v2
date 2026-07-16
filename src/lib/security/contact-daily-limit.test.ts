import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import { FORM_SECURITY } from "@/lib/security/constants";
import { hashForAudit } from "@/lib/security/fingerprint";
import {
  checkContactEmailDailyLimit,
  checkContactIpDailyLimit,
  clearContactDailyLimitsForTests,
  evaluateDailyLimitFromCount,
  setContactSubmissionCounterForTests,
} from "@/lib/security/contact-daily-limit";

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

function enableFakeSupabase() {
  setEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
  setEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
  setEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");
}

describe("evaluateDailyLimitFromCount — logique pure (miroir BDD)", () => {
  const windowMs = FORM_SECURITY.CONTACT_EMAIL_DAILY_WINDOW_MS;
  const now = Date.UTC(2026, 6, 15, 12, 0, 0);

  it("autorise count = 0 et count = max - 1", () => {
    assert.equal(evaluateDailyLimitFromCount(0, 3, null, now, windowMs).allowed, true);
    assert.equal(evaluateDailyLimitFromCount(2, 3, null, now, windowMs).allowed, true);
  });

  it("bloque dès count >= max", () => {
    assert.equal(evaluateDailyLimitFromCount(3, 3, null, now, windowMs).allowed, false);
    assert.equal(evaluateDailyLimitFromCount(99, 3, null, now, windowMs).allowed, false);
  });

  it("Retry-After = fenêtre complète si pas de oldest", () => {
    const r = evaluateDailyLimitFromCount(3, 3, null, now, windowMs);
    assert.equal(r.retryAfterSec, Math.ceil(windowMs / 1000));
  });

  it("Retry-After basé sur le message le plus ancien dans la fenêtre", () => {
    const oldest = now - 6 * 60 * 60 * 1000;
    const r = evaluateDailyLimitFromCount(3, 3, oldest, now, windowMs);
    assert.equal(r.allowed, false);
    assert.equal(r.retryAfterSec, Math.ceil((oldest + windowMs - now) / 1000));
  });

  it("Retry-After minimum 1 seconde", () => {
    const oldest = now - windowMs + 500;
    const r = evaluateDailyLimitFromCount(10, 10, oldest, now, windowMs);
    assert.equal(r.retryAfterSec, 1);
  });

  it("supporte les plafonds IP (10/jour)", () => {
    const ipMax = FORM_SECURITY.CONTACT_IP_DAILY_MAX;
    assert.equal(evaluateDailyLimitFromCount(ipMax - 1, ipMax, null, now, windowMs).allowed, true);
    assert.equal(evaluateDailyLimitFromCount(ipMax, ipMax, null, now, windowMs).allowed, false);
  });
});

describe("contact daily limits — voie BDD (override test)", () => {
  beforeEach(() => {
    enableFakeSupabase();
    clearContactDailyLimitsForTests();
  });

  afterEach(restoreEnv);

  it("utilise source=database quand Supabase configuré", async () => {
    setContactSubmissionCounterForTests(async () => ({
      count: 0,
      oldestCreatedAt: null,
    }));
    const r = await checkContactEmailDailyLimit("db@example.com");
    assert.equal(r.allowed, true);
    assert.equal(r.source, "database");
  });

  it("bloque via BDD si count >= max email", async () => {
    const now = Date.now();
    const oldest = new Date(now - 2 * 60 * 60 * 1000).toISOString();
    setContactSubmissionCounterForTests(async () => ({
      count: FORM_SECURITY.CONTACT_EMAIL_DAILY_MAX,
      oldestCreatedAt: oldest,
    }));
    const r = await checkContactEmailDailyLimit("spam@example.com", now);
    assert.equal(r.allowed, false);
    assert.equal(r.source, "database");
    assert.ok(r.retryAfterSec && r.retryAfterSec > 0);
  });

  it("bloque via BDD si count >= max IP", async () => {
    setContactSubmissionCounterForTests(async () => ({
      count: FORM_SECURITY.CONTACT_IP_DAILY_MAX,
      oldestCreatedAt: new Date().toISOString(),
    }));
    const r = await checkContactIpDailyLimit("198.51.100.10");
    assert.equal(r.allowed, false);
    assert.equal(r.source, "database");
  });

  it("passe email et ip au compteur BDD", async () => {
    let captured: { email?: string; ip?: string; since?: string } = {};
    setContactSubmissionCounterForTests(async (opts) => {
      captured = opts;
      return { count: 0, oldestCreatedAt: null };
    });
    await checkContactEmailDailyLimit("  User@Test.COM  ");
    assert.equal(captured.email, "user@test.com");

    await checkContactIpDailyLimit("203.0.113.1");
    assert.equal(captured.ip, "203.0.113.1");
    assert.ok(captured.since);
  });

  it("retombe sur mémoire si le compteur BDD retourne null", async () => {
    setContactSubmissionCounterForTests(async () => null);
    const r = await checkContactIpDailyLimit("203.0.113.99");
    assert.equal(r.allowed, true);
    assert.equal(r.source, "memory");
  });

  it("ne mélange pas email et IP dans le compteur", async () => {
    const calls: string[] = [];
    setContactSubmissionCounterForTests(async (opts) => {
      calls.push(opts.email ? `email:${opts.email}` : `ip:${opts.ip}`);
      return { count: 0, oldestCreatedAt: null };
    });
    await checkContactEmailDailyLimit("a@b.com");
    await checkContactIpDailyLimit("1.2.3.4");
    assert.deepEqual(calls, ["email:a@b.com", "ip:1.2.3.4"]);
  });
});

describe("contact daily limits — fallback mémoire (sans Supabase)", () => {
  beforeEach(() => {
    setEnv("SUPABASE_SERVICE_ROLE_KEY", undefined);
    setEnv("NEXT_PUBLIC_SUPABASE_URL", undefined);
    setEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", undefined);
    clearContactDailyLimitsForTests();
  });

  afterEach(restoreEnv);

  it("autorise jusqu'à CONTACT_IP_DAILY_MAX par IP", async () => {
    const ip = "203.0.113.50";
    for (let i = 0; i < FORM_SECURITY.CONTACT_IP_DAILY_MAX; i += 1) {
      const r = await checkContactIpDailyLimit(ip);
      assert.equal(r.allowed, true, `attempt ${i + 1}`);
      assert.equal(r.source, "memory");
    }
    const blocked = await checkContactIpDailyLimit(ip);
    assert.equal(blocked.allowed, false);
    assert.ok(blocked.retryAfterSec && blocked.retryAfterSec > 0);
  });

  it("autorise jusqu'à CONTACT_EMAIL_DAILY_MAX par email", async () => {
    const email = "client@example.com";
    for (let i = 0; i < FORM_SECURITY.CONTACT_EMAIL_DAILY_MAX; i += 1) {
      const r = await checkContactEmailDailyLimit(email);
      assert.equal(r.allowed, true, `attempt ${i + 1}`);
    }
    const blocked = await checkContactEmailDailyLimit(email);
    assert.equal(blocked.allowed, false);
  });

  it("normalise l'email (casse / espaces)", async () => {
    for (let i = 0; i < FORM_SECURITY.CONTACT_EMAIL_DAILY_MAX; i += 1) {
      await checkContactEmailDailyLimit("  Client@Example.COM  ");
    }
    assert.equal((await checkContactEmailDailyLimit("client@example.com")).allowed, false);
  });

  it("IP et email sont indépendants", async () => {
    await checkContactIpDailyLimit("1.2.3.4");
    await checkContactEmailDailyLimit("a@b.com");
    assert.equal((await checkContactIpDailyLimit("5.6.7.8")).allowed, true);
    assert.equal((await checkContactEmailDailyLimit("c@d.com")).allowed, true);
  });

  it("email absent → pas de blocage journalier email", async () => {
    assert.equal((await checkContactEmailDailyLimit(undefined)).allowed, true);
    assert.equal((await checkContactEmailDailyLimit("")).allowed, true);
  });

  it("clé mémoire IP = hash audit (pas l'IP en clair)", async () => {
    const ip = "203.0.113.77";
    await checkContactIpDailyLimit(ip);
    const expectedKey = `contact-ip:${hashForAudit(ip)}`;
    assert.notEqual(expectedKey, `contact-ip:${ip}`);
  });
});

describe("FORM_SECURITY — constantes plafond contact", () => {
  it("fenêtres journalières = 24 h", () => {
    const day = 24 * 60 * 60 * 1000;
    assert.equal(FORM_SECURITY.CONTACT_IP_DAILY_WINDOW_MS, day);
    assert.equal(FORM_SECURITY.CONTACT_EMAIL_DAILY_WINDOW_MS, day);
  });

  it("plafonds email < IP (anti-spam ciblé)", () => {
    assert.ok(FORM_SECURITY.CONTACT_EMAIL_DAILY_MAX < FORM_SECURITY.CONTACT_IP_DAILY_MAX);
    assert.equal(FORM_SECURITY.CONTACT_EMAIL_DAILY_MAX, 3);
    assert.equal(FORM_SECURITY.CONTACT_IP_DAILY_MAX, 10);
  });
});
