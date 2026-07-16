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

describe("parseAdminMessagesListQuery — validation OWASP", () => {
  it("défaut status=all et limit=50", () => {
    const q = parseAdminMessagesListQuery(new URL("http://localhost/api/admin/messages"));
    assert.equal(q.status, "all");
    assert.equal(q.limit, 50);
  });

  it("accepte les statuts valides", () => {
    for (const status of ["unread", "read", "archived", "all"]) {
      const q = parseAdminMessagesListQuery(
        new URL(`http://localhost/api/admin/messages?status=${status}`)
      );
      assert.equal(q.status, status);
    }
  });

  it("rejette un status inconnu → all", () => {
    const q = parseAdminMessagesListQuery(
      new URL("http://localhost/api/admin/messages?status=deleted")
    );
    assert.equal(q.status, "all");
  });

  it("rejette injection dans status", () => {
    const q = parseAdminMessagesListQuery(
      new URL("http://localhost/api/admin/messages?status=unread';DROP TABLE--")
    );
    assert.equal(q.status, "all");
  });

  it("parse limit numérique", () => {
    const q = parseAdminMessagesListQuery(
      new URL("http://localhost/api/admin/messages?limit=25")
    );
    assert.equal(q.limit, 25);
  });

  it("limit non numérique → 50", () => {
    const q = parseAdminMessagesListQuery(
      new URL("http://localhost/api/admin/messages?limit=abc")
    );
    assert.equal(q.limit, 50);
  });
});

describe("isValidContactMessageStatus", () => {
  it("accepte unread, read, archived", () => {
    assert.equal(isValidContactMessageStatus("unread"), true);
    assert.equal(isValidContactMessageStatus("read"), true);
    assert.equal(isValidContactMessageStatus("archived"), true);
  });

  it("rejette all, vide, injection", () => {
    assert.equal(isValidContactMessageStatus("all"), false);
    assert.equal(isValidContactMessageStatus(""), false);
    assert.equal(isValidContactMessageStatus(undefined), false);
    assert.equal(isValidContactMessageStatus("unread;delete"), false);
  });
});

describe("contact messages — persistance serveur (sans Supabase live)", () => {
  beforeEach(() => {
    setEnv("SUPABASE_SERVICE_ROLE_KEY", undefined);
    setEnv("NEXT_PUBLIC_SUPABASE_URL", undefined);
  });

  afterEach(restoreEnv);

  it("saveContactMessage échoue si service non configuré", async () => {
    const result = await saveContactMessage({
      name: "Test",
      email: "t@example.com",
      message: "Message de test assez long.",
      fingerprint: "fp-test",
      ip: "127.0.0.1",
    });
    assert.equal(result.ok, false);
  });

  it("updateContactMessageStatus rejette un UUID invalide", async () => {
    assert.equal(await updateContactMessageStatus("not-a-uuid", { status: "read" }), false);
    assert.equal(
      await updateContactMessageStatus("'; DROP TABLE--", { status: "read" }),
      false
    );
    assert.equal(await updateContactMessageStatus("", { status: "read" }), false);
  });

  it("deleteContactMessage rejette un UUID invalide", async () => {
    assert.equal(await deleteContactMessage("123"), false);
    assert.equal(await deleteContactMessage("00000000-0000-0000-0000-000000000000"), false);
  });

  it("countContactSubmissionsInWindow retourne null sans Supabase", async () => {
    const stats = await countContactSubmissionsInWindow({
      since: new Date(Date.now() - 86400000).toISOString(),
      email: "t@example.com",
    });
    assert.equal(stats, null);
  });
});
