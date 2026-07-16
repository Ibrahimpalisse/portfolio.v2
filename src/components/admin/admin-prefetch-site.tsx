"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { routes } from "@/lib/routes";

/**
 * Précharge les pages publiques pendant que l’admin est ouvert.
 * Accélère le retour site (lien « Retour » ou historique navigateur).
 */
export function AdminPrefetchSite() {
  const router = useRouter();

  useEffect(() => {
    const prefetch = () => {
      router.prefetch(routes.home);
      router.prefetch(routes.projects);
      router.prefetch(routes.reviews);
    };

    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(prefetch, { timeout: 1500 });
      return () => window.cancelIdleCallback(id);
    }

    const timer = window.setTimeout(prefetch, 300);
    return () => window.clearTimeout(timer);
  }, [router]);

  return null;
}
