import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ARCHIVE_META_LIMITS,
  parseArchiveMeta,
} from "@/lib/contact/archive-meta";

describe("parseArchiveMeta — archivage sécurisé", () => {
  it("accepte corps vide → nulls", () => {
    const r = parseArchiveMeta({});
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.data.archiveNote, null);
      assert.equal(r.data.conversationUrl, null);
    }
  });

  it("accepte null / array / non-objet → nulls (pas de crash)", () => {
    for (const body of [null, undefined, [], "x", 1, true]) {
      const r = parseArchiveMeta(body);
      assert.equal(r.ok, true, String(body));
      if (r.ok) {
        assert.equal(r.data.archiveNote, null);
        assert.equal(r.data.conversationUrl, null);
      }
    }
  });

  it("ignore note / url non-string", () => {
    const r = parseArchiveMeta({
      archiveNote: 42,
      conversationUrl: { href: "https://evil.com" },
    });
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.data.archiveNote, null);
      assert.equal(r.data.conversationUrl, null);
    }
  });

  it("traite whitespace-only comme null", () => {
    const r = parseArchiveMeta({
      archiveNote: "   \t  ",
      conversationUrl: "  ",
    });
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.data.archiveNote, null);
      assert.equal(r.data.conversationUrl, null);
    }
  });

  it("sanitise la note (trim + contrôle)", () => {
    const r = parseArchiveMeta({
      archiveNote: "  Relancé le devis\x00  ",
    });
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.data.archiveNote, "Relancé le devis");
  });

  it("tronque la note à noteMax", () => {
    const r = parseArchiveMeta({
      archiveNote: "N".repeat(ARCHIVE_META_LIMITS.noteMax + 50),
    });
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.data.archiveNote?.length, ARCHIVE_META_LIMITS.noteMax);
    }
  });

  it("accepte un lien https Gmail", () => {
    const r = parseArchiveMeta({
      conversationUrl: "https://mail.google.com/mail/u/0/#inbox/FMfcgz",
    });
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.match(r.data.conversationUrl ?? "", /^https:\/\//);
    }
  });

  it("accepte http (localhost / outil interne)", () => {
    const r = parseArchiveMeta({
      conversationUrl: "http://localhost:3000/admin/messages",
    });
    assert.equal(r.ok, true);
  });

  it("rejette javascript: et file:", () => {
    assert.equal(
      parseArchiveMeta({ conversationUrl: "javascript:alert(1)" }).ok,
      false
    );
    assert.equal(
      parseArchiveMeta({ conversationUrl: "file:///etc/passwd" }).ok,
      false
    );
  });

  it("rejette data:, vbscript:, blob:", () => {
    for (const url of [
      "data:text/html,<script>alert(1)</script>",
      "vbscript:msgbox(1)",
      "blob:https://example.com/uuid",
    ]) {
      const r = parseArchiveMeta({ conversationUrl: url });
      assert.equal(r.ok, false, url);
      if (!r.ok) assert.equal(r.error, "invalid_url");
    }
  });

  it("rejette URL sans protocole / relative", () => {
    assert.equal(parseArchiveMeta({ conversationUrl: "mail.google.com" }).ok, false);
    assert.equal(parseArchiveMeta({ conversationUrl: "/inbox/1" }).ok, false);
    assert.equal(parseArchiveMeta({ conversationUrl: "//evil.com" }).ok, false);
  });

  it("tronque l'URL avant validation length", () => {
    const r = parseArchiveMeta({
      conversationUrl: `https://example.com/${"a".repeat(ARCHIVE_META_LIMITS.urlMax)}`,
    });
    // Après sanitizeText + isSafeHttpUrl : URL tronquée peut rester valide https
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.ok((r.data.conversationUrl?.length ?? 0) <= ARCHIVE_META_LIMITS.urlMax);
    }
  });

  it("accepte note + lien ensemble", () => {
    const r = parseArchiveMeta({
      archiveNote: "Client OK pour le devis",
      conversationUrl: "https://outlook.live.com/mail/0/inbox/id/AQMk",
    });
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.data.archiveNote, "Client OK pour le devis");
      assert.match(r.data.conversationUrl ?? "", /^https:\/\//);
    }
  });

  it("ignore les champs extra (pas de pollution)", () => {
    const r = parseArchiveMeta({
      archiveNote: "Note",
      conversationUrl: "https://example.com/t",
      status: "archived",
      extra: "ignored",
    });
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.deepEqual(Object.keys(r.data).sort(), [
        "archiveNote",
        "conversationUrl",
      ]);
    }
  });
});
