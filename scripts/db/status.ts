/**
 * Affiche l'état des migrations (pending / applied / drift).
 *
 * Usage : npm run db:status
 */
import pg from "pg";
import {
  getDatabaseUrl,
  listMigrationFiles,
  redactDatabaseUrl,
} from "./_shared";

const { Client } = pg;

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
    const table = await client.query(`
      SELECT to_regclass('public.schema_migrations') AS reg
    `);
    const exists = Boolean(table.rows[0]?.reg);

    const files = listMigrationFiles();
    const appliedMap = new Map<string, string>();

    if (exists) {
      const { rows } = await client.query<{ name: string; checksum: string; applied_at: Date }>(
        "SELECT name, checksum, applied_at FROM public.schema_migrations ORDER BY name"
      );
      for (const row of rows) {
        appliedMap.set(row.name, row.checksum);
      }
    } else {
      console.info("[db] Table schema_migrations absente (lancez db:migrate).");
    }

    console.info("");
    console.info("Migration                         Status");
    console.info("---------------------------------  --------");

    let pending = 0;
    let drift = 0;

    for (const file of files) {
      const checksum = appliedMap.get(file.name);
      let status: string;
      if (!checksum) {
        status = "pending";
        pending += 1;
      } else if (checksum !== file.checksum) {
        status = "DRIFT";
        drift += 1;
      } else {
        status = "applied";
      }
      console.info(`${file.name.padEnd(33)} ${status}`);
      appliedMap.delete(file.name);
    }

    for (const orphan of appliedMap.keys()) {
      console.info(`${orphan.padEnd(33)} missing-file`);
      drift += 1;
    }

    console.info("");
    console.info(
      `[db] ${files.length} fichier(s), ${pending} pending, ${drift} drift/orphan.`
    );
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
