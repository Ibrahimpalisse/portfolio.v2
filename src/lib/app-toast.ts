type ToastVariant = "error" | "info";

export type AppToast = {
  id: number;
  message: string;
  variant: ToastVariant;
};

type Listener = (toast: AppToast | null) => void;

const listeners = new Set<Listener>();
let seq = 0;

export function showAppToast(
  message: string,
  variant: ToastVariant = "error"
): void {
  const toast: AppToast = { id: ++seq, message, variant };
  for (const listener of listeners) listener(toast);
}

export function clearAppToast(): void {
  for (const listener of listeners) listener(null);
}

export function subscribeAppToast(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
