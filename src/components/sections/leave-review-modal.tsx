"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReviewFormPage } from "@/components/sections/review-form-page";
import { lockBodyScroll } from "@/lib/lock-body-scroll";
import {
  OPEN_LEAVE_REVIEW_EVENT,
  OPEN_REVIEW_QUERY,
} from "@/lib/open-leave-review-modal";
import { useModalA11y } from "@/hooks/use-modal-a11y";
import { REVIEW_MODAL_TITLE_ID } from "@/lib/modal-a11y-ids";

type LeaveReviewModalProps = {
  showCallout?: boolean;
};

function clearOpenReviewQuery() {
  const params = new URLSearchParams(window.location.search);
  if (params.get(OPEN_REVIEW_QUERY) !== "1") return;

  params.delete(OPEN_REVIEW_QUERY);
  const qs = params.toString();
  window.history.replaceState(
    null,
    "",
    window.location.pathname + (qs ? `?${qs}` : "")
  );
}

export function LeaveReviewModal({ showCallout = true }: LeaveReviewModalProps) {
  const [open, setOpen] = useState(false);
  const unlockScrollRef = useRef<(() => void) | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useModalA11y(open, dialogRef);

  useEffect(() => {
    function handleOpen() {
      setOpen(true);
    }

    document.addEventListener(OPEN_LEAVE_REVIEW_EVENT, handleOpen);

    const params = new URLSearchParams(window.location.search);
    if (params.get(OPEN_REVIEW_QUERY) === "1") {
      setOpen(true);
      clearOpenReviewQuery();
    }

    if (window.location.hash === "#laisser-un-avis") {
      window.history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search
      );
      setOpen(true);
    }

    return () => {
      document.removeEventListener(OPEN_LEAVE_REVIEW_EVENT, handleOpen);
    };
  }, []);

  useEffect(() => {
    if (!open) return;

    unlockScrollRef.current = lockBodyScroll();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const handleExitComplete = () => {
    unlockScrollRef.current?.();
    unlockScrollRef.current = null;
  };

  return (
    <div className={showCallout ? "bg-background px-4 py-16 sm:px-6 lg:py-20" : "contents"}>
      {showCallout && (
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-4 text-center">
          <p className="text-xs uppercase tracking-widest text-foreground/50">
            Témoignage
          </p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Laissez un avis en 1 minute
          </h2>
          <p className="max-w-2xl text-base leading-relaxed text-foreground/60 sm:text-lg">
            Pas de page séparée : la modale s&apos;ouvre ici même. Votre avis est envoyé
            puis publié après validation.
          </p>
          <Button size="lg" onClick={() => setOpen(true)}>
            Ouvrir la modale
          </Button>
        </div>
      )}

      <AnimatePresence onExitComplete={handleExitComplete}>
        {open && (
          <motion.div
            className="scrollbar-overlay fixed inset-0 z-[999] overflow-y-auto overscroll-contain bg-black/55 px-3 py-4 sm:px-4 sm:py-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            role="presentation"
          >
            <div className="flex min-h-full items-center justify-center">
              <motion.div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={REVIEW_MODAL_TITLE_ID}
                initial={{ opacity: 0, y: 20, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.98 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="relative my-auto w-full max-w-3xl overflow-hidden rounded-2xl border border-border bg-background shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  data-modal-initial-focus
                  className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-foreground/70 transition-colors hover:text-foreground sm:right-4 sm:top-4"
                  aria-label="Fermer la modale avis"
                >
                  <X className="h-5 w-5" />
                </button>

                <div className="p-4 sm:p-6">
                  <ReviewFormPage variant="modal" />
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
