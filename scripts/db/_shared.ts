import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const MIGRATIONS_DIR = path.join(ROOT, "supabase", "migrations");

/** Charge .env puis .env.local (local gagne). Les fichiers priment sur le shell. */
export function loadEnvFiles() {
  const fromFiles = new Map<string, string>();

  for (const name of [".env", ".env.local"] as const) {
    const file = path.join(ROOT, name);
    if (!fs.existsSync(file)) continue;
    const text = fs.readFileSync(file, "utf8");
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      fromFiles.set(key, value);
    }
  }

  for (const [key, value] of fromFiles) {
    process.env[key] = value;
  }
}

export function getDatabaseUrl(): string {
  loadEnvFiles();
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error(
      "DATABASE_URL manquant. Ajoutez-le dans .env.local (Supabase → Database → URI)."
    );
  }
  if (!url.startsWith("postgres://") && !url.startsWith("postgresql://")) {
    throw new Error(
      "DATABASE_URL invalide.\n" +
        "Mettez l'URI Postgres complète (pas seulement le mot de passe), ex. :\n" +
        "  postgresql://postgres.[REF]:[PASSWORD]@aws-0-xx.pooler.supabase.com:5432/postgres\n" +
        "Supabase → Project Settings → Database → Connection string → URI (Session/Direct)."
    );
  }
  return url;
}

/** Masque le mot de passe pour les logs. */
export function redactDatabaseUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.password) u.password = "***";
    return u.toString();
  } catch {
    return "[invalid-url]";
  }
}

const SAFE_NAME = /^[0-9]{3,14}_[a-z0-9_]+\.sql$/i;

export type MigrationFile = {
  name: string;
  path: string;
  sql: string;
  checksum: string;
};

export function listMigrationFiles(): MigrationFile[] {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    fs.mkdirSync(MIGRATIONS_DIR, { recursive: true });
  }

  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith(".sql"))
    .filter((name) => {
      if (!SAFE_NAME.test(name)) {
        console.warn(`[db] Fichier ignoré (nom invalide): ${name}`);
        return false;
      }
      return true;
    })
    .sort((a, b) => a.localeCompare(b, "en"))
    .map((name) => {
      const full = path.join(MIGRATIONS_DIR, name);
      const sql = fs.readFileSync(full, "utf8");
      return {
        name,
        path: full,
        sql,
        checksum: createHash("sha256").update(sql).digest("hex"),
      };
    });
}

export function nextMigrationPrefix(files: MigrationFile[]): string {
  let max = 0;
  for (const file of files) {
    const n = Number.parseInt(file.name.split("_")[0] ?? "0", 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return String(max + 1).padStart(3, "0");
}

export function slugifyMigrationName(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60) || "migration";
}
