"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, Info, X } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  clearAppToast,
  subscribeAppToast,
  type AppToast,
} from "@/lib/app-toast";
import { cn } from "@/lib/utils";

const AUTO_DISMISS_MS = 6200;

export function AppToastHost() {
  const tCommon = useTranslations("common");
  const [toast, setToast] = useState<AppToast | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return subscribeAppToast(setToast);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => clearAppToast(), AUTO_DISMISS_MS);
    return () => window.clearTimeout(timer);
  }, [toast]);

  if (!mounted) return null;

  const Icon = toast?.variant === "info" ? Info : AlertCircle;

  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[1100] flex justify-center p-4 sm:p-6">
      <AnimatePresence mode="wait">
        {toast ? (
          <motion.div
            key={toast.id}
            role="alert"
            aria-live="assertive"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              "pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl border px-4 py-3.5 shadow-xl backdrop-blur-md",
              toast.variant === "info"
                ? "border-accent/30 bg-card/95 text-foreground"
                : "border-red-500/25 bg-card/95 text-foreground"
            )}
          >
            <Icon
              className={cn(
                "mt-0.5 h-5 w-5 shrink-0",
                toast.variant === "info" ? "text-accent" : "text-red-600"
              )}
              aria-hidden
            />
            <p className="min-w-0 flex-1 text-sm leading-relaxed text-foreground/90">
              {toast.message}
            </p>
            <button
              type="button"
              onClick={() => clearAppToast()}
              className="shrink-0 rounded-full p-1 text-foreground/45 transition-colors hover:bg-muted hover:text-foreground"
              aria-label={tCommon("closeModal")}
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>,
    document.body
  );
}
