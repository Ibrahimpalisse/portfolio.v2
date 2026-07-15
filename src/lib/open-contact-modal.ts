export const OPEN_CONTACT_EVENT = "open-contact-modal";

export function openContactModal(e?: { preventDefault?: () => void }) {
  e?.preventDefault?.();
  document.dispatchEvent(new CustomEvent(OPEN_CONTACT_EVENT));
}
