/** Contexte transmis à l'envoi email après validation sécurité. */
export type FormSubmitContext = {
  idempotencyKey: string;
};
