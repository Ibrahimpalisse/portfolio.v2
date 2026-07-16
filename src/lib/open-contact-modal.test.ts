import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
  OPEN_CONTACT_EVENT,
  openContactModal,
} from "@/lib/open-contact-modal";
import {
  OPEN_LEAVE_REVIEW_EVENT,
  OPEN_REVIEW_QUERY,
  openLeaveReviewModal,
} from "@/lib/open-leave-review-modal";
import {
  CONTACT_MODAL_TITLE_ID,
  PROJECT_MODAL_TITLE_ID,
  REVIEW_MODAL_TITLE_ID,
} from "@/lib/modal-a11y-ids";
import { homeAnchors, routes } from "@/lib/routes";

type DocListener = EventListener;

function installDocumentMock() {
  const listeners = new Map<string, Set<DocListener>>();

  const documentMock = {
    addEventListener(type: string, listener: DocListener) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)!.add(listener);
    },
    removeEventListener(type: string, listener: DocListener) {
      listeners.get(type)?.delete(listener);
    },
    dispatchEvent(event: Event) {
      const set = listeners.get(event.type);
      if (!set) return true;
      for (const listener of set) listener(event);
      return true;
    },
  };

  Object.defineProperty(globalThis, "document", {
    value: documentMock,
    configurable: true,
    writable: true,
  });

  Object.defineProperty(globalThis, "CustomEvent", {
    value: class CustomEvent extends Event {
      detail: unknown;
      constructor(type: string, init?: CustomEventInit) {
        super(type, init);
        this.detail = init?.detail;
      }
    },
    configurable: true,
    writable: true,
  });

  return {
    listeners,
    cleanup() {
      // @ts-expect-error test teardown
      delete globalThis.document;
    },
  };
}

describe("openContactModal", () => {
  let cleanup: () => void;

  beforeEach(() => {
    cleanup = installDocumentMock().cleanup;
  });

  afterEach(() => {
    cleanup();
  });

  it("émet l'événement OPEN_CONTACT_EVENT", () => {
    let received = "";
    document.addEventListener(OPEN_CONTACT_EVENT, (e) => {
      received = e.type;
    });

    openContactModal();
    assert.equal(received, OPEN_CONTACT_EVENT);
  });

  it("appelle preventDefault quand un événement est fourni", () => {
    let prevented = false;
    openContactModal({
      preventDefault() {
        prevented = true;
      },
    });
    assert.equal(prevented, true);
  });

  it("ne plante pas sans événement ni preventDefault", () => {
    assert.doesNotThrow(() => openContactModal());
    assert.doesNotThrow(() => openContactModal({}));
  });

  it("émet toujours le même nom d'événement (contrat UI)", () => {
    assert.equal(OPEN_CONTACT_EVENT, "open-contact-modal");
  });

  it("peut être appelé plusieurs fois de suite", () => {
    let count = 0;
    document.addEventListener(OPEN_CONTACT_EVENT, () => {
      count += 1;
    });
    openContactModal();
    openContactModal();
    openContactModal();
    assert.equal(count, 3);
  });
});

describe("openLeaveReviewModal (parity contact system)", () => {
  let cleanup: () => void;

  beforeEach(() => {
    cleanup = installDocumentMock().cleanup;
  });

  afterEach(() => {
    cleanup();
  });

  it("émet OPEN_LEAVE_REVIEW_EVENT et respecte preventDefault", () => {
    let received = "";
    let prevented = false;
    document.addEventListener(OPEN_LEAVE_REVIEW_EVENT, (e) => {
      received = e.type;
    });

    openLeaveReviewModal({
      preventDefault() {
        prevented = true;
      },
    });

    assert.equal(received, OPEN_LEAVE_REVIEW_EVENT);
    assert.equal(prevented, true);
    assert.equal(OPEN_REVIEW_QUERY, "openReview");
    assert.equal(OPEN_LEAVE_REVIEW_EVENT, "open-leave-review-modal");
  });

  it("ne plante pas sans événement", () => {
    assert.doesNotThrow(() => openLeaveReviewModal());
    assert.doesNotThrow(() => openLeaveReviewModal({}));
  });
});

describe("modal a11y ids — contact system", () => {
  it("expose des ids stables et uniques", () => {
    assert.equal(CONTACT_MODAL_TITLE_ID, "contact-modal-title");
    assert.equal(REVIEW_MODAL_TITLE_ID, "review-modal-title");
    assert.equal(PROJECT_MODAL_TITLE_ID, "project-modal-title");

    const ids = [
      CONTACT_MODAL_TITLE_ID,
      REVIEW_MODAL_TITLE_ID,
      PROJECT_MODAL_TITLE_ID,
    ];
    assert.equal(new Set(ids).size, ids.length);
  });

  it("utilise un format HTML id sûr (sans espaces ni caractères dangereux)", () => {
    for (const id of [
      CONTACT_MODAL_TITLE_ID,
      REVIEW_MODAL_TITLE_ID,
      PROJECT_MODAL_TITLE_ID,
    ]) {
      assert.match(id, /^[a-z][a-z0-9-]*$/);
      assert.equal(id.includes("<"), false);
      assert.equal(id.includes('"'), false);
    }
  });
});

describe("routes contact — ancres & pages", () => {
  it("conserve l'ancre #contact alignée sur la modale", () => {
    assert.equal(homeAnchors.contact, "#contact");
    assert.equal(routes.contact, "/contact");
  });

  it("ne confond pas revue et contact", () => {
    assert.notEqual(homeAnchors.contact, homeAnchors.reviews);
    assert.notEqual(routes.contact, routes.leaveReview);
  });
});
