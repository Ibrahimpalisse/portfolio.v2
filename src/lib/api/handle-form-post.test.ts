import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import { handleFormPost } from "@/lib/api/handle-form-post";
import { parseContactPayload } from "@/lib/contact-schema";
import { clearContactDailyLimitsForTests } from "@/lib/security/contact-daily-limit";
import { FORM_SECURITY } from "@/lib/security/constants";
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

function validContactBody(email?: string) {
  return {
    name: "Jean Dupont",
    email: email ?? `user-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
    message: "Bonjour, je souhaite un devis pour mon projet web.",
    _honeypot: "",
  };
}

describe("handleFormPost — flux contact / inbox / Resend", () => {
  beforeEach(() => {
    setEnv("FORM_REQUIRE_TURNSTILE", "false");
    setEnv("TURNSTILE_SECRET_KEY", undefined);
    setEnv("NODE_ENV", "test");
    setEnv("SUPABASE_SERVICE_ROLE_KEY", undefined);
    setEnv("NEXT_PUBLIC_SUPABASE_URL", undefined);
    setEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", undefined);
    clearContactDailyLimitsForTests();
  });

  afterEach(restoreEnv);

  it("rejette une origine non autorisée (403)", async () => {
    const res = await handleFormPost(formRequest(validContactBody(), { origin: "https://evil.com" }), {
      formKind: "contact",
      parsePayload: parseContactPayload,
      sendEmail: async () => ({ ok: true, id: "x" }),
    });
    assert.equal(res.status, 403);
  });

  it("rejette un content-type invalide (415)", async () => {
    const res = await handleFormPost(
      new Request("http://localhost:3000/api/contact", {
        method: "POST",
        headers: { origin: "http://localhost:3000", "content-type": "text/plain" },
        body: "x",
      }),
      {
        formKind: "contact",
        parsePayload: parseContactPayload,
        sendEmail: async () => ({ ok: true, id: "x" }),
      }
    );
    assert.equal(res.status, 415);
  });

  it("accepte silencieusement le honeypot (200)", async () => {
    const res = await handleFormPost(
      formRequest({
        ...validContactBody(),
        _honeypot: "bot",
      }),
      {
        formKind: "contact",
        parsePayload: parseContactPayload,
        sendEmail: async () => ({ ok: true, id: "x" }),
      }
    );
    assert.equal(res.status, 200);
    const body = (await res.json()) as { ok?: boolean };
    assert.equal(body.ok, true);
  });

  it("rejette une validation échouée (400)", async () => {
    const res = await handleFormPost(
      formRequest({ name: "A", email: "bad", message: "court", _honeypot: "" }),
      {
        formKind: "contact",
        parsePayload: parseContactPayload,
        sendEmail: async () => ({ ok: true, id: "x" }),
      }
    );
    assert.equal(res.status, 400);
  });

  it("retourne 200 si email envoyé avec succès", async () => {
    const res = await handleFormPost(formRequest(validContactBody()), {
      formKind: "contact",
      parsePayload: parseContactPayload,
      sendEmail: async () => ({ ok: true, id: "email-id" }),
      getRateLimitEmail: (d) => d.email,
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as { ok?: boolean; stored?: boolean };
    assert.equal(body.ok, true);
    assert.equal(body.stored, undefined);
  });

  it("retourne 502 si Resend échoue et pas de persistance", async () => {
    const res = await handleFormPost(formRequest(validContactBody()), {
      formKind: "contact",
      parsePayload: parseContactPayload,
      sendEmail: async () => ({ ok: false, reason: "send_failed" }),
      getRateLimitEmail: (d) => d.email,
    });
    assert.equal(res.status, 502);
    const body = (await res.json()) as { error?: string };
    assert.equal(body.error, ValidationErrors.sendFailed);
  });

  it("retourne 200 stored si inbox OK mais Resend down", async () => {
    const res = await handleFormPost(formRequest(validContactBody()), {
      formKind: "contact",
      parsePayload: parseContactPayload,
      sendEmail: async () => ({ ok: false, reason: "send_failed" }),
      getRateLimitEmail: (d) => d.email,
      afterValidated: async () => true,
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as { ok?: boolean; stored?: boolean };
    assert.equal(body.ok, true);
    assert.equal(body.stored, true);
  });

  it("retourne 503 si Resend non configuré et pas de persistance", async () => {
    const res = await handleFormPost(formRequest(validContactBody()), {
      formKind: "contact",
      parsePayload: parseContactPayload,
      sendEmail: async () => ({ ok: false, reason: "not_configured" }),
      getRateLimitEmail: (d) => d.email,
    });
    assert.equal(res.status, 503);
    const body = (await res.json()) as { error?: string };
    assert.equal(body.error, ValidationErrors.serviceUnavailable);
  });

  it("retourne 200 stored si inbox OK même si Resend non configuré", async () => {
    const res = await handleFormPost(formRequest(validContactBody()), {
      formKind: "contact",
      parsePayload: parseContactPayload,
      sendEmail: async () => ({ ok: false, reason: "not_configured" }),
      getRateLimitEmail: (d) => d.email,
      afterValidated: async () => true,
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as { stored?: boolean };
    assert.equal(body.stored, true);
  });

  it("ignore une erreur de persistance et continue l'envoi email", async () => {
    const res = await handleFormPost(formRequest(validContactBody()), {
      formKind: "contact",
      parsePayload: parseContactPayload,
      sendEmail: async () => ({ ok: true, id: "sent" }),
      getRateLimitEmail: (d) => d.email,
      afterValidated: async () => {
        throw new Error("db down");
      },
    });
    assert.equal(res.status, 200);
  });

  it("retourne 502 si persistance échoue ET email échoue", async () => {
    const res = await handleFormPost(formRequest(validContactBody()), {
      formKind: "contact",
      parsePayload: parseContactPayload,
      sendEmail: async () => ({ ok: false, reason: "send_failed" }),
      getRateLimitEmail: (d) => d.email,
      afterValidated: async () => false,
    });
    assert.equal(res.status, 502);
  });

  it("déduplique les soumissions identiques (200 sans double envoi)", async () => {
    const email = `dedup-${Date.now()}@example.com`;
    const body = validContactBody(email);
    let sendCount = 0;

    const opts = {
      formKind: "contact" as const,
      parsePayload: parseContactPayload,
      sendEmail: async () => {
        sendCount += 1;
        return { ok: true, id: "x" } as const;
      },
      getRateLimitEmail: (d: { email: string }) => d.email,
    };

    const req1 = formRequest(body);
    const req2 = formRequest(body);

    const res1 = await handleFormPost(req1, opts);
    const res2 = await handleFormPost(req2, opts);

    assert.equal(res1.status, 200);
    assert.equal(res2.status, 200);
    assert.equal(sendCount, 1);
  });

  it("passe idempotencyKey à sendEmail", async () => {
    let capturedKey = "";
    await handleFormPost(formRequest(validContactBody()), {
      formKind: "contact",
      parsePayload: parseContactPayload,
      sendEmail: async (_data, ctx) => {
        capturedKey = ctx.idempotencyKey;
        return { ok: true, id: "x" };
      },
      getRateLimitEmail: (d) => d.email,
    });
    assert.ok(capturedKey.length > 0);
  });

  it("retourne 429 dailyRateLimited après CONTACT_EMAIL_DAILY_MAX/jour", async () => {
    const email = `daily-${Date.now()}@example.com`;
    const opts = {
      formKind: "contact" as const,
      parsePayload: parseContactPayload,
      sendEmail: async () => ({ ok: true, id: "x" } as const),
      getRateLimitEmail: (d: { email: string }) => d.email,
    };

    for (let i = 0; i < FORM_SECURITY.CONTACT_EMAIL_DAILY_MAX; i += 1) {
      const res = await handleFormPost(
        formRequest({
          ...validContactBody(email),
          message: `Message unique ${i} — assez long pour passer la validation.`,
        }),
        opts
      );
      assert.equal(res.status, 200, `attempt ${i + 1}`);
    }

    const blocked = await handleFormPost(
      formRequest({
        ...validContactBody(email),
        message: "Quatrième message du jour — assez long pour validation.",
      }),
      opts
    );
    assert.equal(blocked.status, 429);
    const body = (await blocked.json()) as { error?: string };
    assert.equal(body.error, ValidationErrors.dailyRateLimited);
    assert.ok(blocked.headers.get("Retry-After"));
  });

  it("n'applique pas le plafond CONTACT email au formulaire avis", async () => {
    const { clearReviewDailyLimitsForTests } = await import(
      "@/lib/security/review-daily-limit"
    );
    clearReviewDailyLimitsForTests();

    const parsePayload = (b: unknown) => {
      const p = parseContactPayload(b);
      if (!p.ok) return p;
      return { ok: true as const, data: { ...p.data, rating: 5 } };
    };

    const opts = {
      formKind: "review" as const,
      parsePayload,
      sendEmail: async () => ({ ok: true, id: "x" } as const),
      getRateLimitEmail: (d: { email: string }) => d.email,
    };

    // IP différente à chaque essai → seul le plafond email contact serait bloquant
    for (let i = 0; i < FORM_SECURITY.CONTACT_EMAIL_DAILY_MAX + 2; i += 1) {
      const res = await handleFormPost(
        formRequest(
          {
            name: "Jean Dupont",
            email: `review-daily-${Date.now()}-${i}@example.com`,
            message: `Avis numéro ${i} — message assez long pour validation.`,
            rating: 5,
            _honeypot: "",
          },
          { ip: `203.0.113.${10 + i}` }
        ),
        opts
      );
      assert.equal(res.status, 200, `review attempt ${i + 1}`);
    }
  });

  it("applique le plafond avis par IP (REVIEW_IP_DAILY_MAX)", async () => {
    const { clearReviewDailyLimitsForTests } = await import(
      "@/lib/security/review-daily-limit"
    );
    clearReviewDailyLimitsForTests();

    const opts = {
      formKind: "review" as const,
      parsePayload: (b: unknown) => {
        const p = parseContactPayload(b);
        if (!p.ok) return p;
        return { ok: true as const, data: { ...p.data, rating: 5 } };
      },
      sendEmail: async () => ({ ok: true, id: "x" } as const),
      getRateLimitEmail: (d: { email: string }) => d.email,
    };

    const sharedIp = "198.51.100.88";
    for (let i = 0; i < FORM_SECURITY.REVIEW_IP_DAILY_MAX; i += 1) {
      const res = await handleFormPost(
        formRequest(
          {
            name: "Jean Dupont",
            email: `review-ip-${Date.now()}-${i}@example.com`,
            message: `Avis IP ${i} — message assez long pour validation.`,
            _honeypot: "",
          },
          { ip: sharedIp }
        ),
        opts
      );
      assert.equal(res.status, 200, `allowed ${i + 1}`);
    }

    const blocked = await handleFormPost(
      formRequest(
        {
          name: "Jean Dupont",
          email: `review-ip-block-${Date.now()}@example.com`,
          message: "Avis bloqué — message assez long pour validation.",
          _honeypot: "",
        },
        { ip: sharedIp }
      ),
      opts
    );
    assert.equal(blocked.status, 429);
    const body = (await blocked.json()) as { error?: string };
    assert.equal(body.error, ValidationErrors.reviewIpRateLimited);
  });
});
