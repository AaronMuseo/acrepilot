import { recordSchema, type Ack, type Operation, type RecordData, type ServerRecord } from '../../../packages/contracts';

export interface LocalDatabase {
  execSync(sql: string): void;
  runSync(sql: string, ...params: any[]): unknown;
  getAllSync<T>(sql: string, ...params: any[]): T[];
  getFirstSync<T>(sql: string, ...params: any[]): T | null;
}
export type LocalRecord = ServerRecord;
type OutboxRow = { sequence: number; record_id: string; operation: string; failure: string | null };
export class Repository {
  constructor(readonly db: LocalDatabase, readonly ownerId: string, readonly deviceId: string, readonly uuid: () => string) {
    const version = db.getFirstSync<{user_version: number}>('PRAGMA user_version')?.user_version ?? 0;
    if (version > 1) throw new Error('NEWER_DATABASE_REQUIRES_APP_UPDATE');
    db.execSync(`PRAGMA journal_mode=WAL;
      CREATE TABLE IF NOT EXISTS metadata(key TEXT PRIMARY KEY,value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS records(id TEXT PRIMARY KEY,version INTEGER NOT NULL,data TEXT NOT NULL,deleted INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE IF NOT EXISTS outbox(sequence INTEGER PRIMARY KEY AUTOINCREMENT,record_id TEXT NOT NULL,operation TEXT NOT NULL,failure TEXT);
      CREATE TABLE IF NOT EXISTS resolutions(id INTEGER PRIMARY KEY AUTOINCREMENT,record_id TEXT NOT NULL,local_data TEXT NOT NULL,server_data TEXT NOT NULL,choice TEXT NOT NULL,created_at TEXT NOT NULL);
      PRAGMA user_version=1;`);
    const owner = this.meta('owner');
    if (owner && owner !== ownerId) throw new Error('ACCOUNT_ISOLATION');
    this.setMeta('owner', ownerId);
  }
  transaction<T>(fn: () => T): T {
    this.db.execSync('BEGIN IMMEDIATE');
    try { const result = fn(); this.db.execSync('COMMIT'); return result; }
    catch (error) { this.db.execSync('ROLLBACK'); throw error; }
  }
  meta(key: string) { return this.db.getFirstSync<{value: string}>('SELECT value FROM metadata WHERE key=?', key)?.value; }
  setMeta(key: string, value: string) { this.db.runSync('INSERT OR REPLACE INTO metadata(key,value) VALUES (?,?)', key, value); }
  list(): LocalRecord[] {
    return this.db.getAllSync<any>('SELECT * FROM records ORDER BY rowid').map(r => ({ id: r.id, version: r.version, data: JSON.parse(r.data), deleted: Boolean(r.deleted) }));
  }
  get(id: string) { return this.list().find(r => r.id === id); }
  private put(record: ServerRecord) {
    this.db.runSync('INSERT OR REPLACE INTO records(id,version,data,deleted) VALUES (?,?,?,?)', record.id, record.version, JSON.stringify(record.data), Number(record.deleted));
  }
  private enqueue(id: string, data: RecordData) {
    const existing = this.get(id);
    const op: Operation = { operationId: this.uuid(), deviceId: this.deviceId, recordId: id, baseVersion: existing?.version ?? 0, data: recordSchema.parse(data) };
    this.put({ id, data: op.data, version: op.baseVersion + 1, deleted: false });
    this.db.runSync('INSERT INTO outbox(record_id,operation) VALUES (?,?)', id, JSON.stringify(op));
    return op;
  }
  save(id: string, data: RecordData) { return this.transaction(() => this.enqueue(id, data)); }
  createFarm(name: string, areaM2: number | null) {
    return this.transaction(() => {
      const farmId = this.uuid(); const taskId = this.uuid();
      this.enqueue(farmId, { kind: 'farm', name, plotId: this.uuid(), areaM2, location: null, soil: 'unknown', water: 'unknown' });
      this.enqueue(taskId, { kind: 'task', farmId, titleKey: 'fixtureTask', done: false });
      return farmId;
    });
  }
  farms() { return this.list().filter(record => !record.deleted && record.data.kind === 'farm'); }
  selectedFarm() {
    const farms = this.farms();
    return farms.find(record => record.id === this.meta('selectedFarmId')) ?? farms[0];
  }
  selectFarm(id: string) {
    if (!this.farms().some(record => record.id === id)) throw new Error('FARM_NOT_FOUND');
    this.setMeta('selectedFarmId', id);
  }
  renameFarm(id: string, name: string) {
    const record = this.get(id);
    if (!record || record.deleted || record.data.kind !== 'farm') throw new Error('FARM_NOT_FOUND');
    return this.save(id, {...record.data, name});
  }
  pending() { return this.db.getAllSync<OutboxRow>('SELECT * FROM outbox ORDER BY sequence'); }
  // Stop at a failure so dependent task/farm writes cannot overtake it.
  batch(): Operation[] {
    const pending = this.pending(); const failure = pending.findIndex(r => r.failure);
    return pending.slice(0, failure < 0 ? 50 : Math.min(failure, 50)).map(r => JSON.parse(r.operation));
  }
  acknowledge(ack: Ack) {
    this.transaction(() => {
      const row = this.pending().find(r => JSON.parse(r.operation).operationId === ack.operationId);
      if (!row) return;
      if (ack.status !== 'accepted' || !ack.record) {
        this.db.runSync('UPDATE outbox SET failure=? WHERE sequence=?', JSON.stringify(ack), row.sequence); return;
      }
      this.db.runSync('DELETE FROM outbox WHERE sequence=?', row.sequence);
      if (!this.pending().some(r => r.record_id === row.record_id)) this.put(ack.record);
    });
  }
  pull(records: ServerRecord[], cursor: string) {
    this.transaction(() => {
      const pending = new Set(this.pending().map(r => r.record_id));
      for (const record of records) {
        if (pending.has(record.id)) continue;
        const local = this.get(record.id);
        if (!local || local.version <= record.version) this.put(record);
      }
      this.setMeta('cursor', cursor);
    });
  }
  resolve(id: string, choice: 'mine' | 'server') {
    this.transaction(() => {
      const row = this.pending().find(r => r.record_id === id && r.failure);
      if (!row) throw new Error('NO_CONFLICT');
      const ack = JSON.parse(row.failure!) as Ack;
      if (ack.status !== 'conflict' || !ack.record || ack.record.deleted) throw new Error('RECOVERY_REQUIRED');
      const local = this.get(id)!;
      this.db.runSync('INSERT INTO resolutions(record_id,local_data,server_data,choice,created_at) VALUES (?,?,?,?,?)', id, JSON.stringify(local), JSON.stringify(ack.record), choice, new Date().toISOString());
      this.db.runSync('DELETE FROM outbox WHERE record_id=?', id);
      this.put(ack.record);
      if (choice === 'mine') this.enqueue(id, local.data);
    });
  }
}
