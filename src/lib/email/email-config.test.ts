import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import { getEmailConfig, isEmailConfigured } from "@/lib/email/config";

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

describe("getEmailConfig — Resend uniquement", () => {
  beforeEach(() => {
    setEnv("RESEND_API_KEY", undefined);
    setEnv("RESEND_FROM_EMAIL", undefined);
    setEnv("RESEND_NOTIFY_EMAIL", undefined);
    setEnv("CONTACT_FROM_EMAIL", undefined);
  });

  afterEach(restoreEnv);

  it("échoue sans RESEND_API_KEY", () => {
    setEnv("RESEND_FROM_EMAIL", "Portfolio <onboarding@resend.dev>");
    setEnv("RESEND_NOTIFY_EMAIL", "notify@example.com");
    const r = getEmailConfig();
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.reason, "missing_api_key");
  });

  it("échoue sans RESEND_FROM_EMAIL", () => {
    setEnv("RESEND_API_KEY", "re_test_key");
    setEnv("RESEND_NOTIFY_EMAIL", "notify@example.com");
    const r = getEmailConfig();
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.reason, "missing_from");
  });

  it("n'utilise plus CONTACT_FROM_EMAIL en fallback", () => {
    setEnv("RESEND_API_KEY", "re_test_key");
    setEnv("CONTACT_FROM_EMAIL", "onboarding@resend.dev");
    setEnv("RESEND_NOTIFY_EMAIL", "notify@example.com");
    const r = getEmailConfig();
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.reason, "missing_from");
  });

  it("accepte une config Resend valide", () => {
    setEnv("RESEND_API_KEY", "re_test_key");
    setEnv("RESEND_FROM_EMAIL", "Portfolio <onboarding@resend.dev>");
    setEnv("RESEND_NOTIFY_EMAIL", "notify@example.com");
    const r = getEmailConfig();
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.config.apiKey, "re_test_key");
      assert.equal(r.config.notifyTo, "notify@example.com");
    }
    assert.equal(isEmailConfigured(), true);
  });

  it("rejette un from avec injection CR/LF", () => {
    setEnv("RESEND_API_KEY", "re_test_key");
    setEnv("RESEND_FROM_EMAIL", "Evil\r\n<bad@test.com>");
    setEnv("RESEND_NOTIFY_EMAIL", "notify@example.com");
    const r = getEmailConfig();
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.reason, "invalid_from");
  });

  it("rejette un notifyTo invalide", () => {
    setEnv("RESEND_API_KEY", "re_test_key");
    setEnv("RESEND_FROM_EMAIL", "Portfolio <onboarding@resend.dev>");
    setEnv("RESEND_NOTIFY_EMAIL", "not-an-email");
    const r = getEmailConfig();
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.reason, "invalid_notify_to");
  });
});
