import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import {
  parseAdminMessagesListQuery,
  isValidContactMessageStatus,
} from "@/lib/contact/admin-messages-query";
import {
  countContactSubmissionsInWindow,
  deleteContactMessage,
  saveContactMessage,
  updateContactMessageStatus,
} from "@/lib/contact/messages";
import { CONTACT_LIMITS, parseContactPayload } from "@/lib/contact-schema";
import { hashForAudit } from "@/lib/security/fingerprint";
import { FORM_SECURITY } from "@/lib/security/constants";

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

describe("inbox contact — sécurité OWASP", () => {
  beforeEach(() => {
    setEnv("SUPABASE_SERVICE_ROLE_KEY", undefined);
    setEnv("NEXT_PUBLIC_SUPABASE_URL", undefined);
    setEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", undefined);
  });

  afterEach(restoreEnv);

  it("saveContactMessage refuse sans service_role", async () => {
    const r = await saveContactMessage({
      name: "Jean",
      email: "j@example.com",
      message: "Message valide assez long pour test.",
      fingerprint: "fp-1",
      ip: "127.0.0.1",
    });
    assert.equal(r.ok, false);
  });

  it("update/delete refusent les IDs non-UUID", async () => {
    for (const badId of [
      "",
      "123",
      "not-uuid",
      "'; DROP TABLE contact_messages;--",
      "00000000-0000-0000-0000-000000000000",
    ]) {
      assert.equal(await updateContactMessageStatus(badId, { status: "read" }), false, badId);
      assert.equal(await deleteContactMessage(badId), false, badId);
    }
  });

  it("update/delete acceptent un UUID v4 valide (sans client → false)", async () => {
    const id = "08d86636-9162-4aca-9fb8-b2f77ad90539";
    assert.equal(await updateContactMessageStatus(id, { status: "read" }), false);
    assert.equal(await deleteContactMessage(id), false);
  });

  it("countContactSubmissionsInWindow retourne null sans Supabase", async () => {
    const stats = await countContactSubmissionsInWindow({
      since: new Date(Date.now() - FORM_SECURITY.CONTACT_EMAIL_DAILY_WINDOW_MS).toISOString(),
      email: "t@example.com",
    });
    assert.equal(stats, null);
  });

  it("hash IP cohérent pour rate limit BDD (12 hex, pas de fuite)", () => {
    const ip = "203.0.113.55";
    const h = hashForAudit(ip);
    assert.equal(h, hashForAudit(ip));
    assert.equal(h.includes(ip), false);
    assert.match(h, /^[a-f0-9]{12}$/);
  });
});

describe("admin messages query — injection / bornes", () => {
  it("limit=0 ou négatif → fallback 50", () => {
    assert.equal(
      parseAdminMessagesListQuery(new URL("http://localhost/api/admin/messages?limit=0")).limit,
      50
    );
    assert.equal(
      parseAdminMessagesListQuery(new URL("http://localhost/api/admin/messages?limit=-5")).limit,
      50
    );
  });

  it("status SQL injection → all", () => {
    const q = parseAdminMessagesListQuery(
      new URL("http://localhost/api/admin/messages?status=unread' OR '1'='1")
    );
    assert.equal(q.status, "all");
  });

  it("isValidContactMessageStatus rejette les statuts OWASP", () => {
    const invalid = ["all", "deleted", "unread\n", "READ", "", null, 1, {}];
    for (const v of invalid) {
      assert.equal(isValidContactMessageStatus(v), false, String(v));
    }
  });
});

describe("contact payload — aligné persistance BDD", () => {
  it("données valides respectent les CHECK SQL (longueurs)", () => {
    const r = parseContactPayload({
      name: "Jo",
      email: "a@b.co",
      message: "x".repeat(CONTACT_LIMITS.messageMin),
      _honeypot: "",
    });
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.ok(r.data.name.length >= 2);
      assert.ok(r.data.message.length >= 10);
      assert.ok(r.data.message.length <= CONTACT_LIMITS.messageMax);
    }
  });

  it("email normalisé avant insert BDD", () => {
    const r = parseContactPayload({
      name: "Jean",
      email: "  MixedCase@Example.COM  ",
      message: "Message valide pour normalisation email.",
      _honeypot: "",
    });
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.data.email, "mixedcase@example.com");
  });
});
