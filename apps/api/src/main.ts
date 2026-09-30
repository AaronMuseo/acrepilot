import { createApp } from './app';
import { PostgresDatabase } from './database';
async function main() {
  const fixture = process.env.DEV_FIXTURE_AUTH === 'true';
  if (fixture && process.env.NODE_ENV !== 'development') throw new Error('Fixture authentication requires NODE_ENV=development');
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL required; run db:migrate before starting');
  const db = new PostgresDatabase(process.env.DATABASE_URL);
  const app = await createApp(db, fixture);
  await app.listen(Number(process.env.PORT ?? 3000), process.env.API_HOST ?? '127.0.0.1');
}
void main();
