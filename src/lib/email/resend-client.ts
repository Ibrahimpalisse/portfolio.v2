import { Resend } from "resend";
import { getEmailConfig } from "@/lib/email/config";

let client: Resend | null = null;
let clientKey: string | null = null;

/** Client Resend singleton — instancié uniquement côté serveur. */
export function getResendClient(): Resend | null {
  const config = getEmailConfig();
  if (!config.ok) return null;

  if (!client || clientKey !== config.config.apiKey) {
    client = new Resend(config.config.apiKey);
    clientKey = config.config.apiKey;
  }

  return client;
}
