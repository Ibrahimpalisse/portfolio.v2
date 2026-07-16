"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  Check,
  EyeOff,
  Loader2,
  Mail,
  MessageSquareQuote,
  Star,
  Trash2,
  XCircle,
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
import type { ReviewRow, ReviewStatus } from "@/lib/reviews/store";
import { cn } from "@/lib/utils";

type Filter = "all" | ReviewStatus;

type ListResponse = {
  ok?: boolean;
  configured?: boolean;
  reviews?: ReviewRow[];
  pendingCount?: number;
  error?: string;
  code?: string;
};

const INITIAL_FILTER: Filter = "pending";

type AdminReviewsPanelProps = {
  initialReviews?: ReviewRow[];
  initialPendingCount?: number;
  initialConfigured?: boolean;
};

export function AdminReviewsPanel({
  initialReviews,
  initialPendingCount = 0,
  initialConfigured = true,
}: AdminReviewsPanelProps = {}) {
  const t = useTranslations("admin.reviews");
  const tErrors = useTranslations("admin.errors");

  const [filter, setFilter] = useState<Filter>(INITIAL_FILTER);
  const [reviews, setReviews] = useState<ReviewRow[]>(initialReviews ?? []);
  const [pendingCount, setPendingCount] = useState(initialPendingCount);
  const [configured, setConfigured] = useState(initialConfigured);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedSnapshot, setSelectedSnapshot] = useState<ReviewRow | null>(
    null
  );
  const [loading, setLoading] = useState(initialReviews === undefined);
  const [pending, startTransition] = useTransition();
  const statusOpRef = useRef(0);

  const open = selectedId !== null;
  const selected =
    reviews.find((r) => r.id === selectedId) ?? selectedSnapshot;

  const load = useCallback(
    async (status: Filter, opToken?: number, silent = false) => {
      if (!silent) setLoading(true);
      setError("");
      try {
        const res = await fetch(
          `/api/admin/reviews?status=${encodeURIComponent(status)}&limit=50`,
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
        setReviews(body?.reviews ?? []);
        setPendingCount(body?.pendingCount ?? 0);
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
    if (initialReviews !== undefined) return;
    void load(INITIAL_FILTER);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only
  }, []);

  function closeModal() {
    setSelectedId(null);
    setSelectedSnapshot(null);
  }

  function changeFilter(next: Filter) {
    setFilter(next);
    closeModal();
    void load(next);
  }

  function applyLocalStatus(id: string, status: ReviewStatus) {
    setSelectedSnapshot((prev) =>
      prev?.id === id ? { ...prev, status } : prev
    );
    setReviews((prev) => {
      const next = prev.map((r) => (r.id === id ? { ...r, status } : r));
      if (filter !== "all" && filter !== status) {
        return next.filter((r) => r.id !== id);
      }
      return next;
    });
    setPendingCount((count) => {
      const current =
        selectedSnapshot?.id === id
          ? selectedSnapshot
          : reviews.find((r) => r.id === id);
      if (!current) return count;
      if (current.status === "pending" && status !== "pending") {
        return Math.max(0, count - 1);
      }
      if (current.status !== "pending" && status === "pending") {
        return count + 1;
      }
      return count;
    });
  }

  async function patchStatus(id: string, status: ReviewStatus) {
    setError("");
    const opToken = ++statusOpRef.current;
    applyLocalStatus(id, status);

    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/reviews/${id}`, {
          method: "PATCH",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
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
        await load(filter, opToken, true);
      } catch {
        if (opToken === statusOpRef.current) {
          setError(tErrors("generic"));
          await load(filter, opToken, true);
        }
      }
    });
  }

  async function remove(id: string) {
    setError("");
    statusOpRef.current += 1;
    const opToken = statusOpRef.current;
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/reviews/${id}`, {
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
    { id: "pending", label: t("filterPending", { count: pendingCount }) },
    { id: "all", label: t("filterAll") },
    { id: "published", label: t("filterPublished") },
    { id: "rejected", label: t("filterRejected") },
  ];

  if (!configured) {
    return (
      <section className="rounded-2xl border border-dashed border-border bg-muted/30 p-6 sm:p-8">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <MessageSquareQuote className="h-5 w-5 text-primary" aria-hidden />
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
          <MessageSquareQuote className="h-5 w-5 text-primary" aria-hidden />
          {t("title")}
          {pendingCount > 0 && (
            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
              {pendingCount}
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
      <p className="mt-2 text-xs leading-relaxed text-foreground/50">
        {t("moderationHint")}
      </p>

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
          Array.from({ length: 4 }, (_, i) => (
            <li
              key={`sk-${i}`}
              className="rounded-xl border border-border bg-background/50 px-4 py-3"
              aria-hidden
            >
              <div className="flex items-start justify-between gap-2">
                <div className="h-4 w-28 animate-pulse rounded bg-muted" />
                <div className="h-3 w-12 animate-pulse rounded bg-muted/80" />
              </div>
              <div className="mt-2 h-3 w-40 animate-pulse rounded bg-muted/70" />
              <div className="mt-2 h-3 w-full max-w-[16rem] animate-pulse rounded bg-muted/60" />
            </li>
          ))
        ) : reviews.length === 0 ? (
          <li className="py-8 text-sm text-foreground/50">{t("empty")}</li>
        ) : (
          reviews.map((review) => (
            <li key={review.id}>
              <button
                type="button"
                onClick={() => {
                  setSelectedId(review.id);
                  setSelectedSnapshot(review);
                }}
                className={cn(
                  "w-full rounded-xl border border-border bg-background/50 px-4 py-3 text-start transition-colors hover:border-primary/25",
                  review.status === "pending" && "border-s-2 border-s-primary"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate text-sm font-medium">{review.name}</p>
                  <span className="inline-flex shrink-0 items-center gap-0.5 text-[11px] text-foreground/45">
                    <Star
                      className="h-3 w-3 fill-current text-primary"
                      aria-hidden
                    />
                    {review.rating}/5
                  </span>
                </div>
                <p className="mt-0.5 truncate text-xs text-foreground/50">
                  {review.email}
                </p>
                <p className="mt-1 truncate text-xs text-foreground/65">
                  {review.message.replace(/\s+/g, " ").trim()}
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
                    {selected.role ? (
                      <p className="text-sm text-foreground/55">{selected.role}</p>
                    ) : null}
                    <p className="text-xs text-foreground/45">
                      {new Date(selected.created_at).toLocaleString()} ·{" "}
                      {selected.status} ·{" "}
                      {t("ratingLabel", { rating: selected.rating })}
                    </p>
                  </div>
                </DialogDescription>
              </DialogHeader>

              <div className="scrollbar-overlay min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
                <div className="whitespace-pre-wrap break-words rounded-xl border border-border/60 bg-muted/20 p-3 text-sm leading-relaxed text-foreground/85">
                  {selected.message}
                </div>
              </div>

              <DialogFooter className="shrink-0 flex-row flex-wrap justify-start gap-2 border-t border-border px-5 py-4 sm:justify-start sm:px-6">
                {selected.status !== "published" && (
                  <Button
                    type="button"
                    size="sm"
                    disabled={pending}
                    onClick={() => void patchStatus(selected.id, "published")}
                  >
                    {pending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    {t("approve")}
                  </Button>
                )}
                {selected.status === "published" && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() => void patchStatus(selected.id, "pending")}
                  >
                    <EyeOff className="h-4 w-4" />
                    {t("withdraw")}
                  </Button>
                )}
                {selected.status !== "rejected" && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() => void patchStatus(selected.id, "rejected")}
                  >
                    <XCircle className="h-4 w-4" />
                    {t("reject")}
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
              </DialogFooter>
            </div>
          </DialogContent>
        ) : null}
      </Dialog>
    </section>
  );
}
