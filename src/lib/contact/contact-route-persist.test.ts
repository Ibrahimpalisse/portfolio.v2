import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it, mock } from "node:test";
import { parseContactPayload } from "@/lib/contact-schema";
import { clearContactDailyLimitsForTests } from "@/lib/security/contact-daily-limit";

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
  options?: { ip?: string; origin?: string }
): Request {
  return new Request("http://localhost:3000/api/contact", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: options?.origin ?? "http://localhost:3000",
      "user-agent": "vitest-contact-agent",
      ...(options?.ip ? { "x-forwarded-for": options.ip } : {}),
    },
    body: JSON.stringify(body),
  });
}

function validBody(email: string) {
  return {
    name: "Jean Dupont",
    email,
    message: "Bonjour, je souhaite un devis pour mon projet web.",
    _honeypot: "",
  };
}

describe("POST /api/contact — afterValidated → saveContactMessage", () => {
  let serviceConfigured = true;
  let saveResult: { ok: true; id: string; duplicate?: boolean } | { ok: false } =
    { ok: true, id: "msg-1" };
  let lastSaveInput: unknown = null;
  let contactRoute: typeof import("@/app/api/contact/route");

  before(() => {
    mock.module("@/lib/supabase/service", {
      namedExports: {
        isSupabaseServiceConfigured: () => serviceConfigured,
        createSupabaseServiceClient: () => null,
      },
    });

    mock.module("@/lib/contact/messages", {
      namedExports: {
        saveContactMessage: async (input: unknown) => {
          lastSaveInput = input;
          return saveResult;
        },
        listContactMessages: async () => [],
        countUnreadContactMessages: async () => 0,
        updateContactMessageStatus: async () => false,
        deleteContactMessage: async () => false,
        countContactSubmissionsInWindow: async () => null,
      },
    });

    mock.module("@/lib/email/send-contact-email", {
      namedExports: {
        sendContactEmail: async () => ({ ok: false, reason: "not_configured" }),
      },
    });
  });

  before(async () => {
    contactRoute = await import("@/app/api/contact/route");
  });

  after(() => {
    mock.reset();
    restoreEnv();
  });

  beforeEach(() => {
    setEnv("FORM_REQUIRE_TURNSTILE", "false");
    setEnv("TURNSTILE_SECRET_KEY", undefined);
    setEnv("NODE_ENV", "test");
    clearContactDailyLimitsForTests();
    serviceConfigured = true;
    saveResult = { ok: true, id: "msg-1" };
    lastSaveInput = null;
  });

  it("persiste via saveContactMessage et retourne stored si Resend down", async () => {
    const email = `persist-${Date.now()}@example.com`;
    const res = await contactRoute.POST(formRequest(validBody(email)));
    assert.equal(res.status, 200);
    const body = (await res.json()) as { ok?: boolean; stored?: boolean };
    assert.equal(body.ok, true);
    assert.equal(body.stored, true);
    const saved = lastSaveInput as {
      email: string;
      fingerprint: string;
      ip: string;
      userAgent: string | null;
    };
    assert.equal(saved.email, email);
    assert.ok(saved.fingerprint.length > 0);
    assert.equal(saved.userAgent, "vitest-contact-agent");
  });

  it("n'appelle pas save si service non configuré → 503", async () => {
    serviceConfigured = false;
    const res = await contactRoute.POST(
      formRequest(validBody(`noconf-${Date.now()}@example.com`))
    );
    assert.equal(res.status, 503);
    assert.equal(lastSaveInput, null);
  });

  it("si save échoue et Resend non configuré → 503", async () => {
    saveResult = { ok: false };
    const res = await contactRoute.POST(
      formRequest(validBody(`fail-${Date.now()}@example.com`))
    );
    assert.equal(res.status, 503);
  });

  it("GET contact → 405", () => {
    assert.equal(contactRoute.GET().status, 405);
  });

  it("payload invalide n'atteint pas save", async () => {
    const res = await contactRoute.POST(
      formRequest({ name: "A", email: "bad", message: "x", _honeypot: "" })
    );
    assert.equal(res.status, 400);
    assert.equal(lastSaveInput, null);
  });

  it("parseContactPayload reste aligné avec ce que save reçoit", () => {
    const parsed = parseContactPayload(validBody("  Mix@Example.COM "));
    assert.equal(parsed.ok, true);
    if (parsed.ok) assert.equal(parsed.data.email, "mix@example.com");
  });

  it("honeypot → 200 sans appeler save", async () => {
    const res = await contactRoute.POST(
      formRequest({
        ...validBody(`hp-${Date.now()}@example.com`),
        _honeypot: "bot-filled",
      })
    );
    assert.equal(res.status, 200);
    assert.equal(lastSaveInput, null);
  });

  it("429 dailyRateLimited après CONTACT_EMAIL_DAILY_MAX", async () => {
    const { FORM_SECURITY } = await import("@/lib/security/constants");
    const { ValidationErrors } = await import("@/lib/validation-errors");
    const email = `daily-${Date.now()}@example.com`;
    for (let i = 0; i < FORM_SECURITY.CONTACT_EMAIL_DAILY_MAX; i += 1) {
      const res = await contactRoute.POST(
        formRequest(
          {
            ...validBody(email),
            message: `Message numéro ${i} — assez long pour validation.`,
          },
          { ip: `203.0.113.${10 + i}` }
        )
      );
      assert.equal(res.status, 200, `allowed ${i + 1}`);
    }
    const blocked = await contactRoute.POST(
      formRequest(
        {
          ...validBody(email),
          message: "Message bloqué — assez long pour validation contact.",
        },
        { ip: "203.0.113.99" }
      )
    );
    assert.equal(blocked.status, 429);
    const body = (await blocked.json()) as { error?: string };
    assert.equal(body.error, ValidationErrors.dailyRateLimited);
    assert.ok(blocked.headers.get("Retry-After"));
  });

  it("429 dailyRateLimited après CONTACT_IP_DAILY_MAX", async () => {
    const { FORM_SECURITY } = await import("@/lib/security/constants");
    const { ValidationErrors } = await import("@/lib/validation-errors");
    const sharedIp = "198.51.100.55";
    for (let i = 0; i < FORM_SECURITY.CONTACT_IP_DAILY_MAX; i += 1) {
      const res = await contactRoute.POST(
        formRequest(
          {
            ...validBody(`ip-${Date.now()}-${i}@example.com`),
            message: `Avis IP ${i} — message assez long pour validation.`,
          },
          { ip: sharedIp }
        )
      );
      assert.equal(res.status, 200, `allowed ${i + 1}`);
    }
    const blocked = await contactRoute.POST(
      formRequest(validBody(`ip-block-${Date.now()}@example.com`), {
        ip: sharedIp,
      })
    );
    assert.equal(blocked.status, 429);
    const body = (await blocked.json()) as { error?: string };
    assert.equal(body.error, ValidationErrors.dailyRateLimited);
  });

  it("origine étrangère → 403 sans save", async () => {
    const res = await contactRoute.POST(
      formRequest(validBody(`origin-${Date.now()}@example.com`), {
        origin: "https://evil.example",
      })
    );
    assert.equal(res.status, 403);
    assert.equal(lastSaveInput, null);
  });
});
