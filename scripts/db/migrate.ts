/**
 * Applique les migrations SQL pending (supabase/migrations/*.sql).
 * Table de suivi : public.schema_migrations
 *
 * Usage : npm run db:migrate
 */
import pg from "pg";
import {
  getDatabaseUrl,
  listMigrationFiles,
  redactDatabaseUrl,
} from "./_shared";

const { Client } = pg;

const BOOTSTRAP = `
CREATE TABLE IF NOT EXISTS public.schema_migrations (
  id          serial PRIMARY KEY,
  name        text NOT NULL UNIQUE,
  checksum    text NOT NULL,
  applied_at  timestamptz NOT NULL DEFAULT now()
);
`;

async function main() {
  const databaseUrl = getDatabaseUrl();
  console.info(`[db] Connexion ${redactDatabaseUrl(databaseUrl)}`);

  const client = new Client({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes("localhost")
      ? undefined
      : { rejectUnauthorized: false },
  });

  await client.connect();

  try {
    await client.query(BOOTSTRAP);

    const { rows: applied } = await client.query<{
      name: string;
      checksum: string;
    }>("SELECT name, checksum FROM public.schema_migrations ORDER BY name");

    const appliedMap = new Map(applied.map((r) => [r.name, r.checksum]));
    const files = listMigrationFiles();

    if (files.length === 0) {
      console.info("[db] Aucun fichier dans supabase/migrations/");
      return;
    }

    let ran = 0;

    for (const file of files) {
      const prev = appliedMap.get(file.name);
      if (prev) {
        if (prev !== file.checksum) {
          throw new Error(
            `[db] Checksum modifié pour ${file.name} (déjà appliquée). ` +
              "Ne modifiez pas une migration déjà jouée — créez-en une nouvelle."
          );
        }
        console.info(`[db] skip  ${file.name}`);
        continue;
      }

      console.info(`[db] apply ${file.name}`);
      await client.query("BEGIN");
      try {
        await client.query(file.sql);
        await client.query(
          "INSERT INTO public.schema_migrations (name, checksum) VALUES ($1, $2)",
          [file.name, file.checksum]
        );
        await client.query("COMMIT");
        ran += 1;
        console.info(`[db] ok    ${file.name}`);
      } catch (err) {
        await client.query("ROLLBACK");
        const message = err instanceof Error ? err.message : String(err);
        throw new Error(`[db] Échec ${file.name}: ${message}`);
      }
    }

    if (ran === 0) {
      console.info("[db] Déjà à jour.");
    } else {
      console.info(`[db] ${ran} migration(s) appliquée(s).`);
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
