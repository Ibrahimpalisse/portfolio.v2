import { createHash } from "node:crypto";

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }

  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(",")}}`;
}

/** Empreinte stable d'une soumission (IP + type + contenu utile). */
export function createSubmissionFingerprint(
  ip: string,
  formKind: string,
  payload: unknown
): string {
  const material = `${ip}:${formKind}:${stableStringify(payload)}`;
  return createHash("sha256").update(material).digest("hex");
}

/** Hash court pour logs sans PII. */
export function hashForAudit(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
}
