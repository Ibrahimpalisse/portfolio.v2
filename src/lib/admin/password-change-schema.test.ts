import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseAdminPasswordChangeBody } from "@/lib/admin/password-change-schema";

describe("parseAdminPasswordChangeBody — OWASP password change", () => {
  const strong = "Str0ng!Passw0rd";

  it("accepte un changement valide", () => {
    const result = parseAdminPasswordChangeBody({
      currentPassword: "oldpassword1",
      newPassword: strong,
      confirmPassword: strong,
      _honeypot: "",
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.data.newPassword, strong);
      assert.equal(result.data.currentPassword, "oldpassword1");
    }
  });

  it("rejette honeypot", () => {
    const result = parseAdminPasswordChangeBody({
      currentPassword: "oldpassword1",
      newPassword: strong,
      confirmPassword: strong,
      _honeypot: "bot",
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error, "honeypot");
  });

  it("rejette tableau / non-objet", () => {
    assert.equal(parseAdminPasswordChangeBody([]).ok, false);
    assert.equal(parseAdminPasswordChangeBody(null).ok, false);
  });

  it("rejette confirmation différente", () => {
    const result = parseAdminPasswordChangeBody({
      currentPassword: "oldpassword1",
      newPassword: strong,
      confirmPassword: "Str0ng!Passw0rdX",
    });
    assert.equal(result.ok, false);
  });

  it("rejette nouveau = actuel", () => {
    const result = parseAdminPasswordChangeBody({
      currentPassword: strong,
      newPassword: strong,
      confirmPassword: strong,
    });
    assert.equal(result.ok, false);
  });

  it("rejette mot de passe faible", () => {
    const weaks = [
      "short1!",
      "nouppercase1!",
      "NOLOWERCASE1!",
      "NoDigits!!!!",
      "NoSpecial1234",
    ];
    for (const newPassword of weaks) {
      const result = parseAdminPasswordChangeBody({
        currentPassword: "oldpassword1",
        newPassword,
        confirmPassword: newPassword,
      });
      assert.equal(result.ok, false, newPassword);
    }
  });
});
