import { areaChangeError, todayInKenya } from '../../../packages/domain/land';
import { createHash, randomInt, randomBytes, randomUUID } from 'node:crypto';
import { HttpException } from '@nestjs/common';
import { codeRequestSchema, verifySchema, pushSchema, passwordLoginSchema, setPasswordSchema, refreshSchema, type Ack, type Operation, type ServerRecord } from '../../../packages/contracts';
import type { Database, Queryable } from './database';
import { hashPassword, checkPassword } from './passwords';
import { FixtureDelivery } from './code-delivery';

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
      const delivery = await new FixtureDelivery().deliver(identity, code);
      return { challengeId, ...delivery, verificationKind: 'development_fixture' };
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
      return this.issueSession(tx, account.id);
    });
    return result ?? fail('INVALID_OR_EXPIRED_CODE', 401);
  }
  private async issueSession(tx: Queryable, ownerId: string, familyId = randomUUID(), authenticatedAt = new Date(), refreshExpiry = new Date(Date.now() + 30 * 86400000)) {
    const token = randomBytes(32).toString('hex'); const refreshToken = randomBytes(32).toString('hex');
    await tx.query("INSERT INTO sessions(token_hash,owner_id,expires_at,family_id,refresh_hash,refresh_expires_at,authenticated_at) VALUES ($1,$2,now()+interval '15 minutes',$3,$4,$5,$6)", [hash(token), ownerId, familyId, hash(refreshToken), refreshExpiry, authenticatedAt]);
    return {ownerId, token, refreshToken, verificationKind: 'development_fixture' as const};
  }
  async refresh(body: unknown) {
    if (!this.fixtureAuth) fail('DELIVERY_NOT_CONFIGURED', 503);
    const {refreshToken} = parse<{refreshToken: string}>(refreshSchema, body);
    const result = await this.db.transaction(async tx => {
      await tx.query('SELECT id FROM change_clock WHERE id=1 FOR UPDATE');
      const row = (await tx.query('SELECT *, refresh_expires_at > now() AS valid FROM sessions WHERE refresh_hash=$1 FOR UPDATE', [hash(refreshToken)])).rows[0];
      if (!row) return null;
      if (row.refresh_consumed) {
        await tx.query('UPDATE sessions SET revoked=true WHERE family_id=$1', [row.family_id]);
        return null;
      }
      if (row.revoked || !row.valid) return null;
      await tx.query('UPDATE sessions SET revoked=true,refresh_consumed=true WHERE token_hash=$1', [row.token_hash]);
      return this.issueSession(tx, row.owner_id, row.family_id, row.authenticated_at, row.refresh_expires_at);
    });
    return result ?? fail('UNAUTHORIZED', 401);
  }
  async passwordLogin(body: unknown) {
    if (!this.fixtureAuth) fail('DELIVERY_NOT_CONFIGURED', 503);
    const {identity, password} = parse<{identity: string; password: string}>(passwordLoginSchema, body);
    // Persist attempts before checking the password; failed requests cannot roll back the limit.
    const allowed = await this.db.transaction(async tx => {
      await tx.query('SELECT id FROM change_clock WHERE id=1 FOR UPDATE');
      const key = hash('password:' + identity);
      await tx.query("INSERT INTO auth_limits(key,attempts,reset_at) VALUES ($1,1,now()+interval '15 minutes') ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN auth_limits.reset_at <= now() THEN 1 ELSE auth_limits.attempts+1 END, reset_at=CASE WHEN auth_limits.reset_at <= now() THEN now()+interval '15 minutes' ELSE auth_limits.reset_at END", [key]);
      return (await tx.query('SELECT attempts FROM auth_limits WHERE key=$1', [key])).rows[0].attempts <= 5;
    });
    if (!allowed) fail('LOGIN_COOLDOWN', 429);
    const account = (await this.db.query('SELECT * FROM accounts WHERE identity=$1', [identity])).rows[0];
    if (!(await checkPassword(password, account?.password_hash))) fail('INVALID_LOGIN', 401);
    return this.db.transaction(async tx => {
      await tx.query('SELECT id FROM change_clock WHERE id=1 FOR UPDATE');
      const current = (await tx.query('SELECT password_hash FROM accounts WHERE id=$1', [account.id])).rows[0];
      if (current.password_hash !== account.password_hash) fail('INVALID_LOGIN', 401);
      return this.issueSession(tx, account.id);
    });
  }
  async setPassword(authorization: string | undefined, body: unknown) {
    if (!this.fixtureAuth) fail('DELIVERY_NOT_CONFIGURED', 503);
    const ownerId = await this.owner(authorization);
    const {password} = parse<{password: string}>(setPasswordSchema, body);
    const fresh = (await this.db.query("SELECT owner_id FROM sessions WHERE token_hash=$1 AND NOT revoked AND authenticated_at > now()-interval '10 minutes'", [hash(authorization!.slice(7))])).rows[0];
    if (!fresh) fail('REAUTH_REQUIRED', 401);
    const passwordHash = await hashPassword(password);
    return this.db.transaction(async tx => {
      await tx.query('SELECT id FROM change_clock WHERE id=1 FOR UPDATE');
      const recent = (await tx.query("SELECT owner_id FROM sessions WHERE token_hash=$1 AND NOT revoked AND expires_at > now() AND authenticated_at > now()-interval '10 minutes'", [hash(authorization!.slice(7))])).rows[0];
      if (!recent || recent.owner_id !== ownerId) fail('REAUTH_REQUIRED', 401);
      await tx.query('UPDATE accounts SET password_hash=$1 WHERE id=$2', [passwordHash, ownerId]);
      await tx.query('UPDATE sessions SET revoked=true WHERE owner_id=$1', [ownerId]);
      return this.issueSession(tx, ownerId);
    });
  }
  async owner(authorization?: string) {
    const token = authorization?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
    if (!token) return fail('UNAUTHORIZED', 401);
    const row = (await this.db.query('SELECT owner_id FROM sessions WHERE token_hash=$1 AND NOT revoked AND expires_at > now()', [hash(token)])).rows[0];
    return row?.owner_id as string || fail('UNAUTHORIZED', 401);
  }
  async revoke(authorization?: string) {
    const token = authorization?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
    if (!token) fail('UNAUTHORIZED', 401);
    const revoked = await this.db.transaction(async tx => {
      // Order revocation against renewal so no new child session escapes sign-out.
      await tx.query('SELECT id FROM change_clock WHERE id=1 FOR UPDATE');
      const row = (await tx.query('SELECT family_id FROM sessions WHERE token_hash=$1 AND NOT revoked AND expires_at > now()', [hash(token!)])).rows[0];
      if (!row) return false;
      await tx.query('UPDATE sessions SET revoked=true WHERE token_hash=$1 OR family_id=$2', [hash(token!), row.family_id]);
      return true;
    });
    if (!revoked) fail('UNAUTHORIZED', 401);
    return {revoked: true};
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
      else if (existing?.data.kind === 'waterSource' && op.data.kind === 'waterSource' && existing.data.farmId !== op.data.farmId) ack = {operationId:op.operationId,status:'invalid',code:'PARENT_IMMUTABLE'};
      else if (existing?.data.kind === 'waterStorage' && op.data.kind === 'waterStorage' && existing.data.farmId !== op.data.farmId) ack = {operationId:op.operationId,status:'invalid',code:'PARENT_IMMUTABLE'};
      else if (existing?.data.kind === 'plot' && op.data.kind === 'plot' && existing.data.farmId !== op.data.farmId) ack = {operationId: op.operationId, status: 'invalid', code: 'PARENT_IMMUTABLE'};
      else if ((op.data.kind === 'farm' || op.data.kind === 'plot') && areaChangeError(existing?.data, op.data)) ack = {operationId: op.operationId, status: 'invalid', code: areaChangeError(existing?.data, op.data)!};
      else if ((op.data.kind === 'condition' || op.data.kind === 'waterObservation' || op.data.kind === 'soilTest' || op.data.kind === 'tenure' || op.data.kind === 'plotCondition' || op.data.kind === 'irrigation') && (existing || op.data.observedDate > todayInKenya())) ack = {operationId: op.operationId, status: 'invalid', code: existing ? 'OBSERVATION_IMMUTABLE' : 'OBSERVATION_DATE_INVALID'};
      else if (!(await this.validCopy(tx,ownerId,op))) ack = {operationId:op.operationId,status:'invalid',code:'COPY_SOURCE_NOT_FOUND'};
      else if (!(await this.validParent(tx, ownerId, op))) ack = { operationId: op.operationId, status: 'invalid', code: 'PARENT_NOT_FOUND' };
      else if (!(await this.irrigationSnapshotFits(tx,ownerId,op))) ack = {operationId:op.operationId,status:'invalid',code:'IRRIGATION_AREA_SNAPSHOT_INVALID'};
      else if (!(await this.areaFits(tx, ownerId, op))) ack = {operationId: op.operationId, status: existing ? 'conflict' : 'invalid', code: 'PLOT_AREA_EXCEEDS_FARM', record: existing ? asRecord(existing) : undefined};
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
  private async irrigationSnapshotFits(tx:Queryable,ownerId:string,op:Operation){
    if(op.data.kind!=='irrigation')return true;
    const plot=(await tx.query("SELECT data FROM records WHERE id=$1 AND owner_id=$2 AND NOT deleted AND data->>'kind'='plot'",[op.data.plotId,ownerId])).rows[0]?.data;
    const snapshot=op.data.plotAreaM2;
    return !!plot && (plot.areaM2===snapshot || (plot.areaHistory??[]).some((revision:{areaM2:number|null})=>revision.areaM2===snapshot));
  }
  private async areaFits(tx: Queryable, ownerId: string, op: Operation) {
    if (op.data.kind !== 'farm' && op.data.kind !== 'plot') return true;
    const farmId = op.data.kind === 'farm' ? op.recordId : op.data.farmId;
    const farm = op.data.kind === 'farm' ? op.data : (await tx.query('SELECT data FROM records WHERE id=$1 AND owner_id=$2', [farmId, ownerId])).rows[0]?.data;
    if (!farm || farm.areaM2 === null) return true;
    const plots = (await tx.query("SELECT id,data FROM records WHERE owner_id=$1 AND NOT deleted AND data->>'kind'='plot' AND data->>'farmId'=$2", [ownerId, farmId])).rows;
    const sum = plots.filter(p => p.id !== op.recordId).reduce((value, p) => value + (p.data.areaM2 ?? 0), 0) + (op.data.kind === 'plot' ? op.data.areaM2 ?? 0 : 0);
    return sum <= farm.areaM2 + 0.000001;
  }
  private async validCopy(tx: Queryable, ownerId: string, op: Operation) {
    if(op.data.kind!=='condition'||!op.data.copiedFrom)return true;
    const source=(await tx.query("SELECT data FROM records WHERE id=$1 AND owner_id=$2 AND NOT deleted AND data->>'kind'='condition'",[op.data.copiedFrom,ownerId])).rows[0];
    return !!source && source.data.farmId===op.data.farmId && source.data.plotId!==op.data.plotId;
  }
  private async validParent(tx: Queryable, ownerId: string, op: Operation) {
    if (op.data.kind === 'farm') return true;
    if(op.data.kind==='waterStorage'||op.data.kind==='waterSource'){for(const plotId of op.data.plotIds){const plot=(await tx.query("SELECT data FROM records WHERE id=$1 AND owner_id=$2 AND NOT deleted AND data->>'kind'='plot'",[plotId,ownerId])).rows[0];if(!plot||plot.data.farmId!==op.data.farmId)return false;}}
    if (op.data.kind === 'condition' || op.data.kind === 'waterObservation' || op.data.kind === 'soilTest' || op.data.kind === 'tenure' || op.data.kind === 'plotCondition' || op.data.kind === 'irrigation') {
      const plot = (await tx.query("SELECT data FROM records WHERE id=$1 AND owner_id=$2 AND NOT deleted AND data->>'kind'='plot'", [op.data.plotId, ownerId])).rows[0];
      if (!plot || plot.data.farmId !== op.data.farmId) return false;
    }
    return (await tx.query("SELECT id FROM records WHERE id=$1 AND owner_id=$2 AND NOT deleted AND data->>'kind'='farm'", [op.data.farmId, ownerId])).rows.length > 0;
  }
  async pull(ownerId: string, rawCursor: unknown) {
    const cursor = String(rawCursor ?? '0');
    if (!/^\d{1,15}$/.test(cursor)) fail('INVALID_CURSOR');
    const rows = (await this.db.query('SELECT cursor,record FROM changes WHERE owner_id=$1 AND cursor > $2 ORDER BY cursor LIMIT 100', [ownerId, cursor])).rows;
    return { records: rows.map(r => r.record as ServerRecord), cursor: rows.length ? String(rows.at(-1)!.cursor) : cursor, hasMore: rows.length === 100 };
  }
}
