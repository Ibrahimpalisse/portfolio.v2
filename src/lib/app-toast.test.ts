import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import {
  clearAppToast,
  showAppToast,
  subscribeAppToast,
  type AppToast,
} from "@/lib/app-toast";

describe("app-toast bus", () => {
  let last: AppToast | null = null;
  let unsub: (() => void) | null = null;

  beforeEach(() => {
    last = null;
    unsub = subscribeAppToast((t) => {
      last = t;
    });
  });

  afterEach(() => {
    clearAppToast();
    unsub?.();
    unsub = null;
  });

  it("showAppToast notifie les abonnés", () => {
    showAppToast("Limite atteinte", "info");
    assert.ok(last);
    assert.equal(last?.message, "Limite atteinte");
    assert.equal(last?.variant, "info");
    assert.ok(typeof last?.id === "number");
  });

  it("variant défaut = error", () => {
    showAppToast("Erreur réseau");
    assert.equal(last?.variant, "error");
  });

  it("clearAppToast envoie null", () => {
    showAppToast("x");
    clearAppToast();
    assert.equal(last, null);
  });

  it("ids croissants entre toasts", () => {
    showAppToast("a");
    const id1 = last!.id;
    showAppToast("b");
    assert.ok(last!.id > id1);
  });
});
