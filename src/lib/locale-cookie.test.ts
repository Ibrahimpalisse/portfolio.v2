import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
  LOCALE_CHANGE_EVENT,
  NEXT_LOCALE_COOKIE,
  markLocaleChange,
  setNextLocaleCookie,
} from "@/lib/locale-cookie";
import { locales } from "@/i18n/routing";

function installBrowserMocks() {
  let cookieStore = "";
  const windowListeners = new Map<string, Set<EventListener>>();

  Object.defineProperty(globalThis, "document", {
    value: {
      get cookie() {
        return cookieStore;
      },
      set cookie(value: string) {
        const [pair] = value.split(";");
        const [key, ...rest] = pair.split("=");
        const next = `${key}=${rest.join("=")}`;
        const parts = cookieStore
          ? cookieStore.split("; ").filter((p) => !p.startsWith(`${key}=`))
          : [];
        parts.push(next);
        cookieStore = parts.join("; ");
      },
    },
    configurable: true,
    writable: true,
  });

  Object.defineProperty(globalThis, "window", {
    value: {
      addEventListener(type: string, listener: EventListener) {
        if (!windowListeners.has(type)) windowListeners.set(type, new Set());
        windowListeners.get(type)!.add(listener);
      },
      removeEventListener(type: string, listener: EventListener) {
        windowListeners.get(type)?.delete(listener);
      },
      dispatchEvent(event: Event) {
        const set = windowListeners.get(event.type);
        if (!set) return true;
        for (const listener of set) listener(event);
        return true;
      },
    },
    configurable: true,
    writable: true,
  });

  return {
    getCookie: () => cookieStore,
    clearCookie: () => {
      cookieStore = "";
    },
    windowListeners,
    cleanup() {
      // @ts-expect-error test teardown
      delete globalThis.document;
      // @ts-expect-error test teardown
      delete globalThis.window;
    },
  };
}

describe("setNextLocaleCookie — sécurité", () => {
  let mocks: ReturnType<typeof installBrowserMocks>;

  beforeEach(() => {
    mocks = installBrowserMocks();
  });

  afterEach(() => {
    mocks.cleanup();
  });

  it("écrit le cookie pour chaque locale supportée", () => {
    for (const locale of locales) {
      mocks.clearCookie();
      const ok = setNextLocaleCookie(locale);
      assert.equal(ok, true);
      assert.match(mocks.getCookie(), new RegExp(`${NEXT_LOCALE_COOKIE}=${locale}`));
    }
  });

  it("applique path, max-age et samesite=lax dans l'assignation cookie", () => {
    let raw = "";
    Object.defineProperty(document, "cookie", {
      set(value: string) {
        raw = value;
      },
      get() {
        return raw;
      },
      configurable: true,
    });

    setNextLocaleCookie("en");
    assert.match(raw, /^NEXT_LOCALE=en;/);
    assert.match(raw, /path=\//);
    assert.match(raw, /max-age=\d+/);
    assert.match(raw, /samesite=lax/i);
  });

  it("rejette les locales inconnues (cookie injection)", () => {
    const attacks = [
      "fr; evil=1",
      "en\nSet-Cookie: stolen=1",
      "../admin",
      "javascript:alert(1)",
      "",
      "FR",
      "de",
      "zh",
      "null",
      "<script>",
    ];

    for (const attack of attacks) {
      mocks.clearCookie();
      const ok = setNextLocaleCookie(attack);
      assert.equal(ok, false, `aurait dû rejeter: ${JSON.stringify(attack)}`);
      assert.equal(mocks.getCookie(), "");
    }
  });

  it("n'écrit pas de cookie pour une chaîne dangereuse avec locale valide au début", () => {
    mocks.clearCookie();
    assert.equal(setNextLocaleCookie("fr; path=/; domain=evil.com"), false);
    assert.equal(mocks.getCookie(), "");
  });
});

describe("markLocaleChange", () => {
  let mocks: ReturnType<typeof installBrowserMocks>;

  beforeEach(() => {
    mocks = installBrowserMocks();
  });

  afterEach(() => {
    mocks.cleanup();
  });

  it("émet LOCALE_CHANGE_EVENT sur window", () => {
    let received = "";
    window.addEventListener(LOCALE_CHANGE_EVENT, (e) => {
      received = e.type;
    });

    markLocaleChange();
    assert.equal(received, LOCALE_CHANGE_EVENT);
    assert.equal(LOCALE_CHANGE_EVENT, "locale-change-start");
  });

  it("peut émettre plusieurs fois sans erreur", () => {
    let count = 0;
    window.addEventListener(LOCALE_CHANGE_EVENT, () => {
      count += 1;
    });
    markLocaleChange();
    markLocaleChange();
    assert.equal(count, 2);
  });
});
