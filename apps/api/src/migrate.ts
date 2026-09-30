import { PostgresDatabase, migration } from './database';
async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL required');
  const db = new PostgresDatabase(process.env.DATABASE_URL);
  try { await db.transaction(async tx => { await tx.query(migration()); }); }
  finally { await db.pool.end(); }
}
void main();
