"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import {
  clearHomeScrollRestoreFlag,
  restoreScrollPosition,
  saveScrollPosition,
  scrollStorageKey,
  shouldRestoreHomeScroll,
} from "@/lib/scroll-position";
import { routes } from "@/lib/routes";

export function ScrollRestoration() {
  const pathname = usePathname();
  const prevPathname = useRef(pathname);
  const isBackNavigation = useRef(false);
  const pendingHomeRestore = useRef<number | null>(null);

  useEffect(() => {
    const onPopState = () => {
      isBackNavigation.current = true;
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useLayoutEffect(() => {
    const prev = prevPathname.current;

    if (prev === routes.home && pathname !== routes.home) {
      saveScrollPosition(routes.home);
      sessionStorage.setItem("portfolio:should-restore-home", "1");
    }

    prevPathname.current = pathname;

    const shouldRestore =
      pathname === routes.home &&
      (isBackNavigation.current || shouldRestoreHomeScroll());

    if (!shouldRestore) {
      isBackNavigation.current = false;
      return;
    }

    const saved = sessionStorage.getItem(scrollStorageKey(routes.home));
    clearHomeScrollRestoreFlag();
    isBackNavigation.current = false;

    if (saved !== null) {
      const y = Number(saved);
      pendingHomeRestore.current = y;
      restoreScrollPosition(y);
    }
  }, [pathname]);

  useEffect(() => {
    const y = pendingHomeRestore.current;
    if (pathname !== routes.home || y === null) return;

    pendingHomeRestore.current = null;
    const delays = [50, 150, 350];
    const timers = delays.map((ms) =>
      window.setTimeout(() => restoreScrollPosition(y), ms)
    );

    return () => timers.forEach(clearTimeout);
  }, [pathname]);

  useEffect(() => {
    const key = scrollStorageKey(pathname);
    let ticking = false;

    const onScroll = () => {
      if (document.body.style.position === "fixed") return;
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        saveScrollPosition(pathname);
        ticking = false;
      });
    };

    saveScrollPosition(pathname);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname]);

  return null;
}
