import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isValidContactMessageStatus,
  parseAdminMessagesListQuery,
} from "@/lib/contact/admin-messages-query";

describe("parseAdminMessagesListQuery — cas limites", () => {
  it("limit très grand n'est pas clampé ici (clamp côté listContactMessages)", () => {
    const q = parseAdminMessagesListQuery(
      new URL("http://localhost/api/admin/messages?limit=9999")
    );
    assert.equal(q.limit, 9999);
  });

  it("limit avec décimales → Number() puis valide si >= 1", () => {
    const q = parseAdminMessagesListQuery(
      new URL("http://localhost/api/admin/messages?limit=12.7")
    );
    assert.equal(q.limit, 12.7);
  });

  it("limit Infinity / NaN → 50", () => {
    assert.equal(
      parseAdminMessagesListQuery(
        new URL("http://localhost/api/admin/messages?limit=Infinity")
      ).limit,
      50
    );
    assert.equal(
      parseAdminMessagesListQuery(
        new URL("http://localhost/api/admin/messages?limit=NaN")
      ).limit,
      50
    );
  });

  it("status sensible à la casse → fallback all", () => {
    assert.equal(
      parseAdminMessagesListQuery(
        new URL("http://localhost/api/admin/messages?status=Unread")
      ).status,
      "all"
    );
  });

  it("status vide → all", () => {
    assert.equal(
      parseAdminMessagesListQuery(
        new URL("http://localhost/api/admin/messages?status=")
      ).status,
      "all"
    );
  });

  it("paramètres multiples : premier status gagnant (URLSearchParams)", () => {
    const q = parseAdminMessagesListQuery(
      new URL("http://localhost/api/admin/messages?status=read&status=archived")
    );
    assert.equal(q.status, "read");
  });
});

describe("isValidContactMessageStatus — surface PATCH", () => {
  it("n'accepte que exactement unread|read|archived", () => {
    assert.equal(isValidContactMessageStatus("unread"), true);
    assert.equal(isValidContactMessageStatus("read"), true);
    assert.equal(isValidContactMessageStatus("archived"), true);
  });

  it("rejette variantes et types non string", () => {
    for (const v of [
      "UNREAD",
      " unread",
      "unread ",
      "all",
      "archived\0",
      undefined,
      null,
      0,
      true,
      ["unread"],
      { status: "unread" },
    ]) {
      assert.equal(isValidContactMessageStatus(v), false, String(v));
    }
  });
});
