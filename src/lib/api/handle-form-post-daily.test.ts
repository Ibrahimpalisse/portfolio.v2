import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import { handleFormPost } from "@/lib/api/handle-form-post";
import { parseContactPayload } from "@/lib/contact-schema";
import {
  clearContactDailyLimitsForTests,
  setContactSubmissionCounterForTests,
} from "@/lib/security/contact-daily-limit";
import { FORM_SECURITY } from "@/lib/security/constants";
import { hashForAudit } from "@/lib/security/fingerprint";
import { ValidationErrors } from "@/lib/validation-errors";

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

function formRequest(
  body: unknown,
  options?: { origin?: string; ip?: string }
): Request {
  const origin = options?.origin ?? "http://localhost:3000";
  return new Request("http://localhost:3000/api/contact", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin,
      ...(options?.ip ? { "x-forwarded-for": options.ip } : {}),
    },
    body: JSON.stringify(body),
  });
}

function validContactBody(email?: string, messageSuffix?: string) {
  return {
    name: "Jean Dupont",
    email: email ?? `user-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
    message: `Bonjour, devis projet ${messageSuffix ?? Date.now()}. Message assez long.`,
    _honeypot: "",
  };
}

const contactOpts = {
  formKind: "contact" as const,
  parsePayload: parseContactPayload,
  sendEmail: async () => ({ ok: true, id: "x" } as const),
  getRateLimitEmail: (d: { email: string }) => d.email,
};

describe("handleFormPost — plafonds journaliers contact (BDD + mémoire)", () => {
  beforeEach(() => {
    setEnv("FORM_REQUIRE_TURNSTILE", "false");
    setEnv("TURNSTILE_SECRET_KEY", undefined);
    setEnv("NODE_ENV", "test");
    clearContactDailyLimitsForTests();
  });

  afterEach(restoreEnv);

  describe("fallback mémoire", () => {
    beforeEach(() => {
      setEnv("SUPABASE_SERVICE_ROLE_KEY", undefined);
      setEnv("NEXT_PUBLIC_SUPABASE_URL", undefined);
      setEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", undefined);
    });

    it("429 dailyRateLimited après CONTACT_IP_DAILY_MAX/jour (mémoire)", async () => {
      const ip = `203.0.113.${Math.floor(Math.random() * 200) + 1}`;
      for (let i = 0; i < FORM_SECURITY.CONTACT_IP_DAILY_MAX; i += 1) {
        const res = await handleFormPost(
          formRequest(validContactBody(undefined, `ip-${i}`), { ip }),
          contactOpts
        );
        assert.equal(res.status, 200, `attempt ${i + 1}`);
      }

      const blocked = await handleFormPost(
        formRequest(validContactBody(undefined, "ip-blocked"), { ip }),
        contactOpts
      );
      assert.equal(blocked.status, 429);
      const body = (await blocked.json()) as { error?: string };
      assert.equal(body.error, ValidationErrors.dailyRateLimited);
    });

    it("429 dailyRateLimited après CONTACT_EMAIL_DAILY_MAX/jour (mémoire)", async () => {
      const email = `daily-mem-${Date.now()}@example.com`;
      for (let i = 0; i < FORM_SECURITY.CONTACT_EMAIL_DAILY_MAX; i += 1) {
        const res = await handleFormPost(
          formRequest(validContactBody(email, `mem-${i}`)),
          contactOpts
        );
        assert.equal(res.status, 200, `attempt ${i + 1}`);
      }

      const blocked = await handleFormPost(
        formRequest(validContactBody(email, "mem-blocked")),
        contactOpts
      );
      assert.equal(blocked.status, 429);
      const body = (await blocked.json()) as { error?: string };
      assert.equal(body.error, ValidationErrors.dailyRateLimited);
    });
  });

  describe("voie BDD simulée", () => {
    beforeEach(() => {
      setEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
      setEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon");
      setEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service");
    });

    it("429 si count BDD >= max email avant persistance", async () => {
      setContactSubmissionCounterForTests(async () => ({
        count: FORM_SECURITY.CONTACT_EMAIL_DAILY_MAX,
        oldestCreatedAt: new Date().toISOString(),
      }));

      const res = await handleFormPost(
        formRequest(validContactBody("blocked-db@example.com", "db-block")),
        contactOpts
      );
      assert.equal(res.status, 429);
      const body = (await res.json()) as { error?: string };
      assert.equal(body.error, ValidationErrors.dailyRateLimited);
    });

    it("200 si count BDD < max puis envoi OK", async () => {
      setContactSubmissionCounterForTests(async () => ({
        count: 0,
        oldestCreatedAt: null,
      }));

      const res = await handleFormPost(
        formRequest(validContactBody("ok-db@example.com", "db-ok")),
        contactOpts
      );
      assert.equal(res.status, 200);
    });

    it("429 IP via BDD même avec email unique", async () => {
      setContactSubmissionCounterForTests(async (opts) => {
        if (opts.ip) {
          return {
            count: FORM_SECURITY.CONTACT_IP_DAILY_MAX,
            oldestCreatedAt: new Date().toISOString(),
          };
        }
        return { count: 0, oldestCreatedAt: null };
      });

      const ip = "198.51.100.42";
      const res = await handleFormPost(
        formRequest(validContactBody(`unique-${Date.now()}@example.com`, "db-ip"), {
          ip,
        }),
        contactOpts
      );
      assert.equal(res.status, 429);
    });
  });
});

describe("handleFormPost — cohérence hash IP inbox / rate limit", () => {
  it("hashForAudit ne contient pas l'IP en clair", () => {
    const ip = "203.0.113.88";
    const h = hashForAudit(ip);
    assert.equal(h.includes("."), false);
    assert.equal(h.length, 12);
  });
});
