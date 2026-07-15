export type SendEmailResult =
  | { ok: true; id: string }
  | { ok: false; reason: "not_configured" | "send_failed" };

export type SendEmailParams = {
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  idempotencyKey?: string;
  tags?: { name: string; value: string }[];
};
