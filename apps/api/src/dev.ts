// Explicit P0 fallback when Docker is unavailable. Same PostgreSQL engine/SQL as tests.
import { PGlite } from '@electric-sql/pglite';
import { mkdirSync } from 'node:fs';
import { createApp } from './app';
import { migration, type Database } from './database';
async function main() {
  if (process.env.NODE_ENV === 'production') throw new Error('Development server cannot run in production');
  mkdirSync('.local', {recursive: true});
  const pg = new PGlite('.local/pglite'); await pg.exec(migration());
  const db: Database = {query: (sql, params) => pg.query(sql, params), transaction: fn => pg.transaction(tx => fn(tx))};
  const app = await createApp(db, true);
  await app.listen(Number(process.env.PORT ?? 3000), process.env.API_HOST ?? '127.0.0.1');
  console.info('AcrePilot P0: development-only identity fixtures enabled. No SMS or email is sent.');
}
void main();
