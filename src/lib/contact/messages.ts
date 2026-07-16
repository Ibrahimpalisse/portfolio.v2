import { hashForAudit } from "@/lib/security/fingerprint";
import { normalizeEmail } from "@/lib/form-validation";
import {
  createSupabaseServiceClient,
  isSupabaseServiceConfigured,
} from "@/lib/supabase/service";

export type ContactSubmissionWindowStats = {
  count: number;
  oldestCreatedAt: string | null;
};

/**
 * Compte les messages contact sur une fenêtre glissante (rate limit BDD).
 * Retourne null si Supabase indisponible.
 */
export async function countContactSubmissionsInWindow(options: {
  since: string;
  email?: string;
  ip?: string;
}): Promise<ContactSubmissionWindowStats | null> {
  if (!isSupabaseServiceConfigured()) return null;

  const supabase = createSupabaseServiceClient();
  if (!supabase) return null;

  let countQuery = supabase
    .from("contact_messages")
    .select("id", { count: "exact", head: true })
    .gte("created_at", options.since);

  if (options.email) {
    countQuery = countQuery.eq("email", normalizeEmail(options.email));
  }
  if (options.ip) {
    countQuery = countQuery.eq("ip_hash", hashForAudit(options.ip));
  }

  const { count, error: countError } = await countQuery;
  if (countError) {
    console.error("[contact] daily count failed", countError.code ?? "unknown");
    return null;
  }

  let oldestQuery = supabase
    .from("contact_messages")
    .select("created_at")
    .gte("created_at", options.since)
    .order("created_at", { ascending: true })
    .limit(1);

  if (options.email) {
    oldestQuery = oldestQuery.eq("email", normalizeEmail(options.email));
  }
  if (options.ip) {
    oldestQuery = oldestQuery.eq("ip_hash", hashForAudit(options.ip));
  }

  const { data: oldestRows, error: oldestError } = await oldestQuery;
  if (oldestError) {
    console.error("[contact] daily oldest failed", oldestError.code ?? "unknown");
    return null;
  }

  return {
    count: count ?? 0,
    oldestCreatedAt: oldestRows?.[0]?.created_at ?? null,
  };
}

export type ContactMessageStatus = "unread" | "read" | "archived";

export type ContactMessageRow = {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  email: string;
  message: string;
  status: ContactMessageStatus;
  fingerprint: string | null;
  ip_hash: string | null;
  archive_note: string | null;
  conversation_url: string | null;
};

export type SaveContactMessageInput = {
  name: string;
  email: string;
  message: string;
  fingerprint: string;
  ip: string;
  userAgent?: string | null;
};

/**
 * Persistance serveur (service_role). Idempotent via fingerprint unique.
 * Ne jamais appeler depuis le client.
 */
export async function saveContactMessage(
  input: SaveContactMessageInput
): Promise<{ ok: true; id: string; duplicate?: boolean } | { ok: false }> {
  if (!isSupabaseServiceConfigured()) {
    return { ok: false };
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) return { ok: false };

  const row = {
    name: input.name,
    email: input.email,
    message: input.message,
    fingerprint: input.fingerprint,
    ip_hash: hashForAudit(input.ip),
    user_agent_hash: input.userAgent
      ? hashForAudit(input.userAgent.slice(0, 256))
      : null,
    status: "unread" as const,
  };

  const { data, error } = await supabase
    .from("contact_messages")
    .insert(row)
    .select("id")
    .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      return { ok: true, id: "duplicate", duplicate: true };
    }
    console.error("[contact] persist failed", error.code ?? "unknown");
    return { ok: false };
  }

  if (!data?.id) return { ok: false };
  return { ok: true, id: data.id };
}

export async function listContactMessages(options?: {
  status?: ContactMessageStatus | "all";
  limit?: number;
}): Promise<ContactMessageRow[]> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return [];

  const limit = Math.min(Math.max(options?.limit ?? 50, 1), 100);
  let query = supabase
    .from("contact_messages")
    .select(
      "id, created_at, updated_at, name, email, message, status, fingerprint, ip_hash, archive_note, conversation_url"
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (options?.status && options.status !== "all") {
    query = query.eq("status", options.status);
  }

  const { data, error } = await query;
  if (error || !data) {
    console.error("[contact] list failed", error?.code ?? "unknown");
    return [];
  }

  return data as ContactMessageRow[];
}

export async function countUnreadContactMessages(): Promise<number> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return 0;

  const { count, error } = await supabase
    .from("contact_messages")
    .select("id", { count: "exact", head: true })
    .eq("status", "unread");

  if (error) return 0;
  return count ?? 0;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type UpdateContactMessageInput = {
  status: ContactMessageStatus;
  archiveNote?: string | null;
  conversationUrl?: string | null;
};

export async function updateContactMessageStatus(
  id: string,
  input: UpdateContactMessageInput
): Promise<boolean> {
  const supabase = createSupabaseServiceClient();
  if (!supabase || !UUID_RE.test(id)) return false;

  const patch: Record<string, string | null> = {
    status: input.status,
  };

  if (input.status === "archived") {
    patch.archive_note = input.archiveNote ?? null;
    patch.conversation_url = input.conversationUrl ?? null;
  } else {
    // Quitter l'archive → nettoyer les métadonnées liées
    patch.archive_note = null;
    patch.conversation_url = null;
  }

  const { error } = await supabase
    .from("contact_messages")
    .update(patch)
    .eq("id", id);

  return !error;
}

export async function deleteContactMessage(id: string): Promise<boolean> {
  const supabase = createSupabaseServiceClient();
  if (!supabase || !UUID_RE.test(id)) return false;

  const { error } = await supabase.from("contact_messages").delete().eq("id", id);
  return !error;
}
