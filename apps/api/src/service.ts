import { createHash, randomInt, randomBytes, randomUUID } from 'node:crypto';
import { HttpException } from '@nestjs/common';
import { codeRequestSchema, verifySchema, pushSchema, type Ack, type Operation, type ServerRecord } from '../../../packages/contracts';
import type { Database, Queryable } from './database';

const hash = (s: string) => createHash('sha256').update(s).digest('hex');
const fail = (code: string, status = 400): never => { throw new HttpException({ code }, status); };
function parse<T>(schema: { safeParse(v: unknown): any }, value: unknown): T {
  const parsed = schema.safeParse(value); if (!parsed.success) fail('INVALID_INPUT'); return parsed.data;
}
function asRecord(row: any): ServerRecord { return { id: row.id, version: row.version, data: row.data, deleted: row.deleted }; }
export class SliceService {
  constructor(readonly db: Database, readonly fixtureAuth: boolean) {}
  async requestCode(body: unknown) {
    if (!this.fixtureAuth) fail('DELIVERY_NOT_CONFIGURED', 503);
    const { identity } = parse<{identity: string}>(codeRequestSchema, body);
    return this.db.transaction(async tx => {
      // Serialises challenge issuance with verification and enforces cooldown races.
      await tx.query('SELECT id FROM change_clock WHERE id=1 FOR UPDATE');
      const recent = await tx.query("SELECT id FROM challenges WHERE identity=$1 AND created_at > now() - interval '60 seconds'", [identity]);
      if (recent.rows.length) fail('RESEND_COOLDOWN', 429);
      const challengeId = randomUUID(); const code = String(randomInt(100000, 1000000));
      await tx.query('UPDATE challenges SET consumed=true WHERE identity=$1', [identity]);
      await tx.query("INSERT INTO challenges(id,identity,code_hash,expires_at) VALUES ($1,$2,$3,now()+interval '5 minutes')", [challengeId, identity, hash(challengeId + code)]);
      return { challengeId, developmentCode: code, verificationKind: 'development_fixture' };
    });
  }
  async verify(body: unknown) {
    if (!this.fixtureAuth) fail('DELIVERY_NOT_CONFIGURED', 503);
    const { challengeId, code } = parse<{challengeId: string; code: string}>(verifySchema, body);
    const result = await this.db.transaction(async tx => {
      await tx.query('SELECT id FROM change_clock WHERE id=1 FOR UPDATE');
      const row = (await tx.query('SELECT *, expires_at > now() AS valid FROM challenges WHERE id=$1 FOR UPDATE', [challengeId])).rows[0];
      if (!row || row.consumed || !row.valid || row.attempts >= 5) return null;
      await tx.query('UPDATE challenges SET attempts=attempts+1 WHERE id=$1', [challengeId]);
      if (row.code_hash !== hash(challengeId + code)) return null;
      await tx.query('UPDATE challenges SET consumed=true WHERE id=$1', [challengeId]);
      const account = (await tx.query("INSERT INTO accounts(id,identity,verification_kind) VALUES ($1,$2,'development_fixture') ON CONFLICT(identity) DO UPDATE SET identity=EXCLUDED.identity RETURNING id", [randomUUID(), row.identity])).rows[0];
      const token = randomBytes(32).toString('hex');
      await tx.query("INSERT INTO sessions(token_hash,owner_id,expires_at) VALUES ($1,$2,now()+interval '7 days')", [hash(token), account.id]);
      return { ownerId: account.id as string, token, verificationKind: 'development_fixture' };
    });
    return result ?? fail('INVALID_OR_EXPIRED_CODE', 401);
  }
  async owner(authorization?: string) {
    const token = authorization?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
    if (!token) return fail('UNAUTHORIZED', 401);
    const row = (await this.db.query('SELECT owner_id FROM sessions WHERE token_hash=$1 AND NOT revoked AND expires_at > now()', [hash(token)])).rows[0];
    return row?.owner_id as string || fail('UNAUTHORIZED', 401);
  }
  async revoke(authorization?: string) {
    await this.owner(authorization);
    await this.db.query('UPDATE sessions SET revoked=true WHERE token_hash=$1', [hash(authorization!.slice(7))]);
    return { revoked: true };
  }
  async push(ownerId: string, body: unknown): Promise<{ acknowledgements: Ack[] }> {
    const { operations } = parse<{operations: Operation[]}>(pushSchema, body);
    const acknowledgements: Ack[] = [];
    for (const operation of operations) acknowledgements.push(await this.apply(ownerId, operation));
    return { acknowledgements };
  }
  private async apply(ownerId: string, op: Operation): Promise<Ack> {
    return this.db.transaction(async tx => {
      // P0 global serialisation: correctness first; replace with per-owner clock at scale.
      await tx.query('SELECT id FROM change_clock WHERE id=1 FOR UPDATE');
      const payload = JSON.stringify(op);
      const prior = (await tx.query('SELECT * FROM operations WHERE owner_id=$1 AND operation_id=$2', [ownerId, op.operationId])).rows[0];
      if (prior) return prior.payload === payload ? prior.acknowledgement : { operationId: op.operationId, status: 'invalid', code: 'OPERATION_ID_REUSED' };
      const existing = (await tx.query('SELECT * FROM records WHERE id=$1', [op.recordId])).rows[0];
      let ack: Ack;
      if (existing && existing.owner_id !== ownerId) ack = { operationId: op.operationId, status: 'invalid', code: 'NOT_FOUND' };
      else if ((existing?.version ?? 0) !== op.baseVersion || existing?.deleted) ack = { operationId: op.operationId, status: 'conflict', record: existing ? asRecord(existing) : undefined };
      else if (existing && existing.data.kind !== op.data.kind) ack = { operationId: op.operationId, status: 'invalid', code: 'TYPE_IMMUTABLE' };
      else if (!(await this.validParent(tx, ownerId, op))) ack = { operationId: op.operationId, status: 'invalid', code: 'PARENT_NOT_FOUND' };
      else {
        const record: ServerRecord = { id: op.recordId, version: op.baseVersion + 1, data: op.data, deleted: false };
        await tx.query('INSERT INTO records(id,owner_id,version,data) VALUES ($1,$2,$3,$4) ON CONFLICT(id) DO UPDATE SET version=EXCLUDED.version,data=EXCLUDED.data,updated_at=now()', [record.id, ownerId, record.version, record.data]);
        const clock = (await tx.query('UPDATE change_clock SET value=value+1 WHERE id=1 RETURNING value')).rows[0];
        await tx.query('INSERT INTO changes(cursor,owner_id,record) VALUES ($1,$2,$3)', [clock.value, ownerId, record]);
        ack = { operationId: op.operationId, status: 'accepted', record };
      }
      await tx.query('INSERT INTO operations(owner_id,operation_id,payload,acknowledgement) VALUES ($1,$2,$3,$4)', [ownerId, op.operationId, payload, ack]);
      return ack;
    });
  }
  private async validParent(tx: Queryable, ownerId: string, op: Operation) {
    if (op.data.kind === 'farm') return true;
    return (await tx.query("SELECT id FROM records WHERE id=$1 AND owner_id=$2 AND NOT deleted AND data->>'kind'='farm'", [op.data.farmId, ownerId])).rows.length > 0;
  }
  async pull(ownerId: string, rawCursor: unknown) {
    const cursor = String(rawCursor ?? '0');
    if (!/^\d{1,15}$/.test(cursor)) fail('INVALID_CURSOR');
    const rows = (await this.db.query('SELECT cursor,record FROM changes WHERE owner_id=$1 AND cursor > $2 ORDER BY cursor LIMIT 100', [ownerId, cursor])).rows;
    return { records: rows.map(r => r.record as ServerRecord), cursor: rows.length ? String(rows.at(-1)!.cursor) : cursor, hasMore: rows.length === 100 };
  }
}
