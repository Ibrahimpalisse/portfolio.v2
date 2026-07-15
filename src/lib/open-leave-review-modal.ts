export const OPEN_LEAVE_REVIEW_EVENT = "open-leave-review-modal";
export const OPEN_REVIEW_QUERY = "openReview";

export function openLeaveReviewModal(e?: { preventDefault?: () => void }) {
  e?.preventDefault?.();
  document.dispatchEvent(new CustomEvent(OPEN_LEAVE_REVIEW_EVENT));
}
