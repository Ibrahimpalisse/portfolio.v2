import { sanitizeText } from "@/lib/form-validation";
import { isSafeHttpUrl } from "@/lib/review-schema";

export const ARCHIVE_META_LIMITS = {
  noteMax: 2000,
  urlMax: 2048,
} as const;

export type ArchiveMeta = {
  archiveNote: string | null;
  conversationUrl: string | null;
};

/**
 * Valide note + lien conversation pour l'archivage.
 * Les deux champs sont optionnels ; s'ils sont fournis, ils sont sanitizés.
 */
export function parseArchiveMeta(body: unknown):
  | { ok: true; data: ArchiveMeta }
  | { ok: false; error: "invalid_note" | "invalid_url" } {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: true, data: { archiveNote: null, conversationUrl: null } };
  }

  const raw = body as Record<string, unknown>;

  let archiveNote: string | null = null;
  if (typeof raw.archiveNote === "string" && raw.archiveNote.trim()) {
    const note = sanitizeText(raw.archiveNote, ARCHIVE_META_LIMITS.noteMax);
    if (!note) return { ok: false, error: "invalid_note" };
    archiveNote = note;
  }

  let conversationUrl: string | null = null;
  if (typeof raw.conversationUrl === "string" && raw.conversationUrl.trim()) {
    const url = sanitizeText(raw.conversationUrl.trim(), ARCHIVE_META_LIMITS.urlMax);
    if (!isSafeHttpUrl(url)) return { ok: false, error: "invalid_url" };
    conversationUrl = url;
  }

  return { ok: true, data: { archiveNote, conversationUrl } };
}
