import {
  clearHomeScrollRestoreFlag,
  markHomeForScrollRestore,
  restoreScrollPosition,
  saveScrollPosition,
  scrollStorageKey,
  shouldRestoreHomeScroll,
} from "@/lib/scroll-position";
import { routes } from "@/lib/routes";

/** Bloque le scroll de la page sans perdre la position (modales). */
export function lockBodyScroll(): () => void {
  const scrollY = window.scrollY;
  const scrollbarWidth =
    window.innerWidth - document.documentElement.clientWidth;

  saveScrollPosition(window.location.pathname, scrollY);

  document.body.style.position = "fixed";
  document.body.style.top = `-${scrollY}px`;
  document.body.style.left = "0";
  document.body.style.right = "0";
  document.body.style.width = "100%";

  if (scrollbarWidth > 0) {
    document.body.style.paddingRight = `${scrollbarWidth}px`;
  }

  return () => {
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.left = "";
    document.body.style.right = "";
    document.body.style.width = "";
    document.body.style.paddingRight = "";
    restoreScrollPosition(scrollY);
    saveScrollPosition(window.location.pathname, scrollY);
  };
}

export { markHomeForScrollRestore };
