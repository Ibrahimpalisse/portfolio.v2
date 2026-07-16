"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  Archive,
  Check,
  ExternalLink,
  Inbox,
  Mail,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { readAdminApiError } from "@/lib/admin/api-error";
import type {
  ContactMessageRow,
  ContactMessageStatus,
} from "@/lib/contact/messages";
import { cn } from "@/lib/utils";

type Filter = "all" | ContactMessageStatus;

type ListResponse = {
  ok?: boolean;
  configured?: boolean;
  messages?: ContactMessageRow[];
  unreadCount?: number;
  error?: string;
  code?: string;
};

const INITIAL_FILTER: Filter = "unread";

type AdminContactInboxProps = {
  initialMessages?: ContactMessageRow[];
  initialUnreadCount?: number;
  initialConfigured?: boolean;
};

export function AdminContactInbox({
  initialMessages,
  initialUnreadCount = 0,
  initialConfigured = true,
}: AdminContactInboxProps = {}) {
  const t = useTranslations("admin.inbox");
  const tErrors = useTranslations("admin.errors");

  const [filter, setFilter] = useState<Filter>(INITIAL_FILTER);
  const [messages, setMessages] = useState<ContactMessageRow[]>(
    initialMessages ?? []
  );
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [configured, setConfigured] = useState(initialConfigured);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedSnapshot, setSelectedSnapshot] =
    useState<ContactMessageRow | null>(null);
  const [archiveMode, setArchiveMode] = useState(false);
  const [archiveNote, setArchiveNote] = useState("");
  const [conversationUrl, setConversationUrl] = useState("");
  const [loading, setLoading] = useState(initialMessages === undefined);
  const [pending, startTransition] = useTransition();
  const statusOpRef = useRef(0);

  const open = selectedId !== null;
  const selected =
    messages.find((m) => m.id === selectedId) ?? selectedSnapshot;

  const load = useCallback(
    async (status: Filter, opToken?: number, silent = false) => {
      if (!silent) setLoading(true);
      setError("");
      try {
        const res = await fetch(
          `/api/admin/messages?status=${encodeURIComponent(status)}&limit=50`,
          { credentials: "same-origin", cache: "no-store" }
        );
        if (opToken !== undefined && opToken !== statusOpRef.current) return;
        const body = (await res.json().catch(() => null)) as ListResponse | null;
        if (!res.ok) {
          setError(
            readAdminApiError(res, body, tErrors("generic"), (key) =>
              tErrors(key)
            )
          );
          return;
        }
        setConfigured(body?.configured !== false);
        setMessages(body?.messages ?? []);
        setUnreadCount(body?.unreadCount ?? 0);
      } catch {
        if (opToken === undefined || opToken === statusOpRef.current) {
          setError(tErrors("generic"));
        }
      } finally {
        if (opToken === undefined || opToken === statusOpRef.current) {
          setLoading(false);
        }
      }
    },
    [tErrors]
  );

  // Données déjà fournies par le SSR : pas de fetch au montage.
  useEffect(() => {
    if (initialMessages !== undefined) return;
    void load(INITIAL_FILTER);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only
  }, []);

  function closeModal() {
    setSelectedId(null);
    setSelectedSnapshot(null);
    setArchiveMode(false);
    setArchiveNote("");
    setConversationUrl("");
  }

  function changeFilter(next: Filter) {
    setFilter(next);
    closeModal();
    void load(next);
  }

  function applyLocalStatus(
    id: string,
    status: ContactMessageStatus,
    meta?: { archiveNote?: string | null; conversationUrl?: string | null }
  ) {
    setSelectedSnapshot((prev) =>
      prev?.id === id
        ? {
            ...prev,
            status,
            archive_note:
              status === "archived" ? (meta?.archiveNote ?? null) : null,
            conversation_url:
              status === "archived" ? (meta?.conversationUrl ?? null) : null,
          }
        : prev
    );
    setMessages((prev) => {
      const current = prev.find((m) => m.id === id);
      if (current) {
        setUnreadCount((count) => {
          if (current.status === "unread" && status !== "unread") {
            return Math.max(0, count - 1);
          }
          if (current.status !== "unread" && status === "unread") {
            return count + 1;
          }
          return count;
        });
      }

      const next = prev.map((m) =>
        m.id === id
          ? {
              ...m,
              status,
              archive_note:
                status === "archived" ? (meta?.archiveNote ?? null) : null,
              conversation_url:
                status === "archived" ? (meta?.conversationUrl ?? null) : null,
            }
          : m
      );
      if (filter !== "all" && filter !== status) {
        return next.filter((m) => m.id !== id);
      }
      return next;
    });
  }

  async function patchStatus(
    id: string,
    status: ContactMessageStatus,
    meta?: { archiveNote?: string | null; conversationUrl?: string | null }
  ) {
    setError("");
    const opToken = ++statusOpRef.current;
    applyLocalStatus(id, status, meta);

    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/messages/${id}`, {
          method: "PATCH",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status,
            ...(status === "archived"
              ? {
                  archiveNote: meta?.archiveNote ?? null,
                  conversationUrl: meta?.conversationUrl ?? null,
                }
              : {}),
          }),
        });
        if (opToken !== statusOpRef.current) return;

        const body = (await res.json().catch(() => null)) as ListResponse | null;
        if (!res.ok) {
          setError(
            readAdminApiError(res, body, tErrors("generic"), (key) =>
              tErrors(key)
            )
          );
          await load(filter, opToken, true);
          return;
        }
        setArchiveMode(false);
        setArchiveNote("");
        setConversationUrl("");
        await load(filter, opToken, true);
      } catch {
        if (opToken === statusOpRef.current) {
          setError(tErrors("generic"));
          await load(filter, opToken, true);
        }
      }
    });
  }

  function openMessage(msg: ContactMessageRow) {
    setArchiveMode(false);
    setArchiveNote(msg.archive_note ?? "");
    setConversationUrl(msg.conversation_url ?? "");
    setSelectedId(msg.id);
    setSelectedSnapshot(msg);
    if (msg.status === "unread") {
      const openToken = statusOpRef.current;
      window.setTimeout(() => {
        if (statusOpRef.current !== openToken) return;
        void patchStatus(msg.id, "read");
      }, 400);
    }
  }

  function startArchive() {
    setArchiveMode(true);
    setArchiveNote(selected?.archive_note ?? "");
    setConversationUrl(selected?.conversation_url ?? "");
  }

  function confirmArchive() {
    if (!selected) return;
    void patchStatus(selected.id, "archived", {
      archiveNote: archiveNote.trim() || null,
      conversationUrl: conversationUrl.trim() || null,
    });
  }

  async function remove(id: string) {
    setError("");
    statusOpRef.current += 1;
    const opToken = statusOpRef.current;
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/messages/${id}`, {
          method: "DELETE",
          credentials: "same-origin",
        });
        if (opToken !== statusOpRef.current) return;
        const body = (await res.json().catch(() => null)) as ListResponse | null;
        if (!res.ok) {
          setError(
            readAdminApiError(res, body, tErrors("generic"), (key) =>
              tErrors(key)
            )
          );
          return;
        }
        if (selectedId === id) closeModal();
        await load(filter, opToken, true);
      } catch {
        if (opToken === statusOpRef.current) {
          setError(tErrors("generic"));
        }
      }
    });
  }

  const filters: { id: Filter; label: string }[] = [
    { id: "unread", label: t("filterUnread", { count: unreadCount }) },
    { id: "all", label: t("filterAll") },
    { id: "read", label: t("filterRead") },
    { id: "archived", label: t("filterArchived") },
  ];

  if (!configured) {
    return (
      <section className="rounded-2xl border border-dashed border-border bg-muted/30 p-6 sm:p-8">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Inbox className="h-5 w-5 text-primary" aria-hidden />
          {t("title")}
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-foreground/65">
          {t("notConfigured")}
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-6 sm:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Inbox className="h-5 w-5 text-primary" aria-hidden />
          {t("title")}
          {unreadCount > 0 && (
            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
              {unreadCount}
            </span>
          )}
        </h2>
        <Select
          value={filter}
          onValueChange={(value) => changeFilter(value as Filter)}
        >
          <SelectTrigger
            className="h-9 w-full max-w-[16rem] sm:w-56"
            aria-label={t("filters")}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {filters.map((f) => (
              <SelectItem key={f.id} value={f.id}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <p className="mt-2 text-sm text-foreground/55">{t("subtitle")}</p>
      <p className="mt-1 text-xs text-foreground/45">{t("selectHint")}</p>

      {error && (
        <div className="mt-4">
          <FormError message={error} />
        </div>
      )}

      <ul
        className="mt-6 max-h-[32rem] space-y-2 overflow-y-auto pe-1"
        aria-busy={loading}
        aria-label={loading ? t("loading") : undefined}
      >
        {loading ? (
          Array.from({ length: 5 }, (_, i) => (
            <li
              key={`skeleton-${i}`}
              className="rounded-xl border border-border bg-background/50 px-4 py-3"
              aria-hidden
            >
              <div className="flex items-start justify-between gap-2">
                <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                <div className="h-3 w-20 shrink-0 animate-pulse rounded bg-muted/80" />
              </div>
              <div className="mt-2 h-3 w-44 animate-pulse rounded bg-muted/70" />
              <div className="mt-2 h-3 w-full max-w-[18rem] animate-pulse rounded bg-muted/60" />
            </li>
          ))
        ) : messages.length === 0 ? (
          <li className="py-8 text-sm text-foreground/50">{t("empty")}</li>
        ) : (
          messages.map((msg) => (
            <li key={msg.id}>
              <button
                type="button"
                onClick={() => openMessage(msg)}
                className={cn(
                  "w-full rounded-xl border border-border bg-background/50 px-4 py-3 text-start transition-colors hover:border-primary/25",
                  msg.status === "unread" && "border-s-2 border-s-primary"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate text-sm font-medium">{msg.name}</p>
                  <time className="shrink-0 text-[11px] text-foreground/40">
                    {new Date(msg.created_at).toLocaleString()}
                  </time>
                </div>
                <p className="mt-0.5 truncate text-xs text-foreground/50">
                  {msg.email}
                </p>
                <p className="mt-1 truncate text-xs text-foreground/65">
                  {msg.message.replace(/\s+/g, " ").trim()}
                </p>
              </button>
            </li>
          ))
        )}
      </ul>

      <Dialog
        open={open && Boolean(selected)}
        onOpenChange={(next) => {
          if (!next) closeModal();
        }}
      >
        {selected ? (
          <DialogContent
            className="max-w-xl gap-0 p-0 sm:p-0"
            closeLabel={t("close")}
          >
            <div className="flex max-h-[min(92dvh,44rem)] flex-col">
              <DialogHeader className="shrink-0 border-b border-border px-5 py-4 sm:px-6">
                <DialogTitle>{selected.name}</DialogTitle>
                <DialogDescription asChild>
                  <div className="space-y-1 text-start">
                    <p className="inline-flex items-center gap-1.5 text-sm text-foreground/70">
                      <Mail
                        className="h-3.5 w-3.5 shrink-0 text-primary"
                        aria-hidden
                      />
                      {selected.email}
                    </p>
                    <p className="text-xs text-foreground/45">
                      {new Date(selected.created_at).toLocaleString()} ·{" "}
                      {selected.status}
                    </p>
                  </div>
                </DialogDescription>
              </DialogHeader>

              <div className="scrollbar-overlay min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4 sm:px-6">
                <div className="whitespace-pre-wrap break-words rounded-xl border border-border/60 bg-muted/20 p-3 text-sm leading-relaxed text-foreground/85">
                  {selected.message}
                </div>

                {selected.status === "archived" &&
                  (selected.archive_note || selected.conversation_url) &&
                  !archiveMode && (
                    <div className="space-y-2 rounded-xl border border-border bg-muted/30 p-3 text-sm">
                      <p className="text-xs font-medium uppercase tracking-widest text-foreground/45">
                        {t("archiveMetaTitle")}
                      </p>
                      {selected.archive_note && (
                        <p className="whitespace-pre-wrap text-foreground/75">
                          {selected.archive_note}
                        </p>
                      )}
                      {selected.conversation_url && (
                        <a
                          href={selected.conversation_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-primary underline-offset-4 hover:underline"
                        >
                          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                          {t("openConversation")}
                        </a>
                      )}
                    </div>
                  )}

                {archiveMode ? (
                  <div className="space-y-3 border-t border-border pt-4">
                    <p className="text-sm font-medium">{t("archiveFormTitle")}</p>
                    <p className="text-xs text-foreground/55">
                      {t("archiveFormHint")}
                    </p>
                    <div>
                      <label
                        htmlFor="archive-note"
                        className="mb-1 block text-xs font-medium text-foreground/60"
                      >
                        {t("archiveNoteLabel")}
                      </label>
                      <textarea
                        id="archive-note"
                        value={archiveNote}
                        onChange={(e) => setArchiveNote(e.target.value)}
                        rows={3}
                        maxLength={2000}
                        placeholder={t("archiveNotePlaceholder")}
                        className="w-full resize-y rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-step-accent/50"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="conversation-url"
                        className="mb-1 block text-xs font-medium text-foreground/60"
                      >
                        {t("conversationUrlLabel")}
                      </label>
                      <input
                        id="conversation-url"
                        type="url"
                        value={conversationUrl}
                        onChange={(e) => setConversationUrl(e.target.value)}
                        maxLength={2048}
                        placeholder={t("conversationUrlPlaceholder")}
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-step-accent/50"
                      />
                    </div>
                  </div>
                ) : null}
              </div>

              <DialogFooter className="shrink-0 flex-row flex-wrap justify-start gap-2 border-t border-border px-5 py-4 sm:justify-start sm:px-6">
                {archiveMode ? (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      disabled={pending}
                      onClick={confirmArchive}
                    >
                      <Archive className="h-4 w-4" />
                      {t("confirmArchive")}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() => setArchiveMode(false)}
                    >
                      {t("cancelArchive")}
                    </Button>
                  </>
                ) : (
                  <>
                    {selected.status !== "read" && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        onClick={() => void patchStatus(selected.id, "read")}
                      >
                        <Check className="h-4 w-4" />
                        {t("markRead")}
                      </Button>
                    )}
                    {selected.status !== "unread" && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        onClick={() => void patchStatus(selected.id, "unread")}
                      >
                        {t("markUnread")}
                      </Button>
                    )}
                    {selected.status !== "archived" ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        onClick={startArchive}
                      >
                        <Archive className="h-4 w-4" />
                        {t("archive")}
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        onClick={startArchive}
                      >
                        <Archive className="h-4 w-4" />
                        {t("editArchiveMeta")}
                      </Button>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={pending}
                          className="border-red-600/30 text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                          {t("delete")}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            {t("confirmDeleteTitle")}
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            {t("confirmDelete")}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>
                            {t("confirmDeleteCancel")}
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => void remove(selected.id)}
                          >
                            {t("confirmDeleteAction")}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}
              </DialogFooter>
            </div>
          </DialogContent>
        ) : null}
      </Dialog>
    </section>
  );
}
