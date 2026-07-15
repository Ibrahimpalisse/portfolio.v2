import { routes } from "@/lib/routes";

const SCROLL_KEY_PREFIX = "portfolio:scroll:";
const RESTORE_HOME_FLAG = "portfolio:should-restore-home";

export function scrollStorageKey(pathname: string) {
  return SCROLL_KEY_PREFIX + pathname;
}

export function saveScrollPosition(pathname: string, y = window.scrollY) {
  sessionStorage.setItem(scrollStorageKey(pathname), String(y));
}

export function markHomeForScrollRestore() {
  saveScrollPosition(routes.home);
  sessionStorage.setItem(RESTORE_HOME_FLAG, "1");
}

export function shouldRestoreHomeScroll() {
  return sessionStorage.getItem(RESTORE_HOME_FLAG) === "1";
}

export function clearHomeScrollRestoreFlag() {
  sessionStorage.removeItem(RESTORE_HOME_FLAG);
}

/** Restaure le scroll une fois le contenu assez haut (sections dynamiques). */
export function restoreScrollPosition(y: number) {
  if (y <= 0) return;

  let attempts = 0;
  const maxAttempts = 20;

  const apply = () => {
    window.scrollTo({ top: y, left: 0, behavior: "instant" });
    attempts += 1;

    const tallEnough =
      document.documentElement.scrollHeight >= y + window.innerHeight * 0.5;

    if (!tallEnough && attempts < maxAttempts) {
      requestAnimationFrame(apply);
    }
  };

  requestAnimationFrame(apply);
}
