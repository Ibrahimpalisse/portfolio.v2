/**
 * Crée un nouveau fichier SQL dans supabase/migrations/.
 *
 * Usage : npm run db:new -- add_reviews_table
 */
import fs from "node:fs";
import path from "node:path";
import {
  listMigrationFiles,
  MIGRATIONS_DIR,
  nextMigrationPrefix,
  slugifyMigrationName,
} from "./_shared";

function main() {
  const raw = process.argv.slice(2).join(" ").trim();
  if (!raw) {
    console.error("Usage: npm run db:new -- <nom_migration>");
    console.error("Exemple: npm run db:new -- add_contact_replies");
    process.exit(1);
  }

  const slug = slugifyMigrationName(raw);
  const files = listMigrationFiles();
  const prefix = nextMigrationPrefix(files);
  const name = `${prefix}_${slug}.sql`;
  const full = path.join(MIGRATIONS_DIR, name);

  if (fs.existsSync(full)) {
    console.error(`[db] Existe déjà: ${name}`);
    process.exit(1);
  }

  const template = `-- Migration: ${name}
-- Date: ${new Date().toISOString().slice(0, 10)}
--
-- Règles :
-- - Une migration = un changement atomique
-- - Ne jamais modifier une migration déjà appliquée (créez-en une nouvelle)
-- - Pas de BEGIN/COMMIT ici : le runner enveloppe déjà chaque fichier
-- - Préférez IF NOT EXISTS / IF EXISTS pour la robustesse

-- TODO: votre SQL ici
`;

  fs.mkdirSync(MIGRATIONS_DIR, { recursive: true });
  fs.writeFileSync(full, template, "utf8");
  console.info(`[db] Créé ${path.relative(process.cwd(), full)}`);
}

main();
