import { Pool, PoolClient } from 'pg';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
export interface Queryable { query<T = any>(sql: string, params?: any[]): Promise<{ rows: T[] }> }
export interface Database extends Queryable { transaction<T>(fn: (tx: Queryable) => Promise<T>): Promise<T> }
export class PostgresDatabase implements Database {
  readonly pool: Pool;
  constructor(url: string) { this.pool = new Pool({ connectionString: url }); }
  query<T = any>(sql: string, params?: any[]) { return this.pool.query(sql, params) as unknown as Promise<{rows: T[]}>; }
  async transaction<T>(fn: (tx: Queryable) => Promise<T>): Promise<T> {
    const client: PoolClient = await this.pool.connect();
    try { await client.query('BEGIN'); const value = await fn(client); await client.query('COMMIT'); return value; }
    catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  }
}
export const migration = () => ['001_initial.sql', '002_sessions.sql'].map(file => readFileSync(resolve('apps/api/migrations', file), 'utf8')).join('\n');
