import {
  markHomeForScrollRestore,
  restoreScrollPosition,
  saveScrollPosition,
} from "@/lib/scroll-position";

const SCROLL_LOCK_ATTR = "data-scroll-locked";

/**
 * Bloque le scroll sans trou latéral (barre / scrollbar-gutter).
 * Compense via --scrollbar-compensation (html + headers fixed).
 */
export function lockBodyScroll(): () => void {
  const html = document.documentElement;
  const { body } = document;

  const lockCount = Number(html.dataset.scrollLockCount ?? "0");
  html.dataset.scrollLockCount = String(lockCount + 1);
  if (lockCount > 0) {
    return () => {
      const next = Math.max(0, Number(html.dataset.scrollLockCount ?? "1") - 1);
      html.dataset.scrollLockCount = String(next);
      if (next === 0) unlockScrollStyles();
    };
  }

  const scrollY = window.scrollY;
  const scrollbarWidth = Math.max(0, window.innerWidth - html.clientWidth);

  saveScrollPosition(window.location.pathname, scrollY);

  html.setAttribute(SCROLL_LOCK_ATTR, "true");
  html.style.setProperty("--scrollbar-compensation", `${scrollbarWidth}px`);

  body.style.position = "fixed";
  body.style.top = `-${scrollY}px`;
  body.style.left = "0";
  body.style.right = "0";
  body.style.width = "100%";
  body.style.overflow = "hidden";

  return () => {
    const next = Math.max(0, Number(html.dataset.scrollLockCount ?? "1") - 1);
    html.dataset.scrollLockCount = String(next);
    if (next > 0) return;

    unlockScrollStyles();
    restoreScrollPosition(scrollY);
    saveScrollPosition(window.location.pathname, scrollY);
  };
}

function unlockScrollStyles() {
  const html = document.documentElement;
  const { body } = document;

  html.removeAttribute(SCROLL_LOCK_ATTR);
  html.style.removeProperty("--scrollbar-compensation");
  delete html.dataset.scrollLockCount;

  body.style.position = "";
  body.style.top = "";
  body.style.left = "";
  body.style.right = "";
  body.style.width = "";
  body.style.overflow = "";
}

export { markHomeForScrollRestore };
