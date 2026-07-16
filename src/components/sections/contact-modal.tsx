"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { ContactForm } from "@/components/sections/contact";
import { lockBodyScroll } from "@/lib/lock-body-scroll";
import { OPEN_CONTACT_EVENT } from "@/lib/open-contact-modal";
import { homeAnchors } from "@/lib/routes";
import { useModalA11y } from "@/hooks/use-modal-a11y";
import { CONTACT_MODAL_TITLE_ID } from "@/lib/modal-a11y-ids";

type ContactModalProps = {
  showCallout?: boolean;
  contactEmail: string;
};

export function ContactModal({
  showCallout = true,
  contactEmail,
}: ContactModalProps) {
  const t = useTranslations("common");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const unlockScrollRef = useRef<(() => void) | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useModalA11y(open, dialogRef);

  useEffect(() => {
    function handleOpen() {
      setOpen(true);
    }

    document.addEventListener(OPEN_CONTACT_EVENT, handleOpen);

    if (window.location.hash === homeAnchors.contact) {
      window.history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search
      );
      setOpen(true);
    }

    return () => {
      document.removeEventListener(OPEN_CONTACT_EVENT, handleOpen);
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
                aria-labelledby={CONTACT_MODAL_TITLE_ID}
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
                  className="absolute end-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-foreground/70 transition-colors hover:text-foreground sm:end-4 sm:top-4"
                  aria-label={t("closeModal")}
                >
                  <X className="h-5 w-5" />
                </button>

                <div className="p-4 sm:p-6">
                  <ContactForm key={locale} contactEmail={contactEmail} />
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
