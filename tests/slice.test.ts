import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { createApp } from '../apps/api/src/app';
import { migration, type Database } from '../apps/api/src/database';
import { Repository, type LocalDatabase } from '../apps/mobile/src/repository';
import { SyncEngine, type SyncTransport } from '../apps/mobile/src/sync';
import { SliceService } from '../apps/api/src/service';
import { acresToSquareMetres } from '../packages/domain';
import { messages } from '../packages/translations';
import { storagePolicy } from '../apps/mobile/src/storage-policy';
import type { Operation } from '../packages/contracts';

let pg: PGlite; let db: Database; let app: Awaited<ReturnType<typeof createApp>>; let url: string;
const work = mkdtempSync(join(tmpdir(), 'acrepilot-test-'));
before(async () => {
  pg = new PGlite(); await pg.exec(migration()); await pg.exec(migration());
  db = { query: (sql, params) => pg.query(sql, params), transaction: fn => pg.transaction(tx => fn(tx)) };
  app = await createApp(db, true); await app.listen(0, '127.0.0.1'); url = await app.getUrl();
});
after(async () => { await app?.close(); await pg?.close(); rmSync(work, { recursive: true, force: true }); });
async function request(path: string, body?: unknown, token?: string) {
  const response = await fetch(`${url}/v1/${path}`, {method: body === undefined ? 'GET' : 'POST', headers: {'Content-Type': 'application/json', ...(token ? {Authorization: `Bearer ${token}`} : {})}, ...(body === undefined ? {} : {body: JSON.stringify(body)})});
  return {status: response.status, body: await response.json() as any};
}
async function account() {
  const challenge = await request('auth/codes', {identity: `${randomUUID()}@example.test`});
  assert.equal(challenge.status, 201);
  const response = await request('auth/verify', {challengeId: challenge.body.challengeId, code: challenge.body.developmentCode});
  assert.equal(response.status, 201); return response.body as {ownerId: string; token: string};
}
function local(ownerId: string, file = ':memory:', deviceId = randomUUID()) {
  const sqlite = new DatabaseSync(file);
  const adapter: LocalDatabase = {
    execSync: sql => sqlite.exec(sql), runSync: (sql, ...args) => sqlite.prepare(sql).run(...args),
    getAllSync: <T>(sql: string, ...args: any[]) => sqlite.prepare(sql).all(...args) as T[],
    getFirstSync: <T>(sql: string, ...args: any[]) => sqlite.prepare(sql).get(...args) as T ?? null,
  };
  return { repo: new Repository(adapter, ownerId, deviceId, randomUUID), close: () => sqlite.close() };
}
function transport(token: string): SyncTransport {
  return { push: async operations => {const r = await request('sync/push', {operations}, token); assert.equal(r.status, 201); return r.body;}, pull: async cursor => {const r = await request(`sync/pull?cursor=${cursor}`, undefined, token); assert.equal(r.status, 200); return r.body;} };
}
test('offline farm/task survive restart; lost acknowledgement is retried once without duplicate server update', async () => {
  const user = await account(); const file = join(work, 'restart.db'); const device = randomUUID();
  let phone = local(user.ownerId, file, device); phone.repo.createFarm('Mwangaza', null);
  await new SyncEngine(phone.repo, transport(user.token)).run();
  const task = phone.repo.list().find(r => r.data.kind === 'task')!;
  assert.equal(task.data.kind, 'task');
  if (task.data.kind !== 'task') return;
  phone.repo.save(task.id, {...task.data, done: true}); phone.close();
  phone = local(user.ownerId, file, device);
  assert.equal((phone.repo.get(task.id)!.data as any).done, true);
  const pendingOperation = phone.repo.batch()[0]; const network = transport(user.token);
  await assert.rejects(new SyncEngine(phone.repo, {...network, push: async ops => {await network.push(ops); throw new Error('NETWORK_LOST_AFTER_COMMIT');}}).run());
  assert.equal(phone.repo.pending().length, 1);
  phone.close(); phone = local(user.ownerId, file, device);
  await new SyncEngine(phone.repo, network).run();
  assert.equal(phone.repo.pending().length, 0); assert.equal(phone.repo.get(task.id)!.version, 2);
  const count = await db.query("SELECT count(*)::int AS n FROM changes WHERE record->>'id'=$1", [task.id]);
  assert.equal(count.rows[0].n, 2); // create + exactly one accepted edit
  const retry = await network.push([pendingOperation]); assert.equal(retry.acknowledgements[0].record!.version, 2);
  phone.close();
});
test('owner checks block guessed record IDs and cross-owner parents; pull is private', async () => {
  const a = await account(); const b = await account(); const phone = local(a.ownerId); const farm = phone.repo.createFarm('A', 100);
  await new SyncEngine(phone.repo, transport(a.token)).run();
  const forged: Operation = { operationId: randomUUID(), deviceId: randomUUID(), recordId: farm, baseVersion: 1, data: phone.repo.get(farm)!.data };
  assert.equal((await transport(b.token).push([forged])).acknowledgements[0].code, 'NOT_FOUND');
  const child: Operation = {...forged, operationId: randomUUID(), recordId: randomUUID(), baseVersion: 0, data: {kind: 'task', farmId: farm, titleKey: 'fixtureTask', done: false}};
  assert.equal((await transport(b.token).push([child])).acknowledgements[0].code, 'PARENT_NOT_FOUND');
  assert.deepEqual((await transport(b.token).pull('0')).records, []);
  assert.throws(() => new Repository(phone.repo.db, b.ownerId, randomUUID(), randomUUID), /ACCOUNT_ISOLATION/);
  phone.close();
});
test('two-device conflict keeps both values; explicit resolution retains audit history', async () => {
  const user = await account(); const a = local(user.ownerId); const b = local(user.ownerId);
  const farm = a.repo.createFarm('Original', 100); const network = transport(user.token);
  await new SyncEngine(a.repo, network).run(); await new SyncEngine(b.repo, network).run();
  const original = a.repo.get(farm)!.data; if (original.kind !== 'farm') return;
  a.repo.save(farm, {...original, name: 'Device A'}); b.repo.save(farm, {...original, name: 'Device B'});
  await new SyncEngine(a.repo, network).run(); await new SyncEngine(b.repo, network).run();
  assert.equal((b.repo.get(farm)!.data as any).name, 'Device B');
  assert.equal(JSON.parse(b.repo.pending()[0].failure!).record.data.name, 'Device A');
  b.repo.resolve(farm, 'mine'); await new SyncEngine(b.repo, network).run();
  assert.equal(b.repo.pending().length, 0); assert.equal(b.repo.get(farm)!.version, 3);
  assert.equal(b.repo.db.getAllSync('SELECT * FROM resolutions').length, 1); a.close(); b.close();
});
test('acknowledging an older edit cannot overwrite a newer local edit', async () => {
  const user = await account(); const phone = local(user.ownerId); const farm = phone.repo.createFarm('First', null);
  const op = phone.repo.batch()[0]; const data = phone.repo.get(farm)!.data; if (data.kind !== 'farm') return;
  phone.repo.save(farm, {...data, name: 'Newer'});
  const ack = (await transport(user.token).push([op])).acknowledgements[0]; phone.repo.acknowledge(ack);
  assert.equal((phone.repo.get(farm)!.data as any).name, 'Newer');
  await new SyncEngine(phone.repo, transport(user.token)).run(); assert.equal(phone.repo.pending().length, 0); phone.close();
});
test('local write/outbox and pull/cursor transactions roll back on storage errors', () => {
  const phone = local(randomUUID());
  phone.repo.db.execSync("CREATE TRIGGER fail_outbox BEFORE INSERT ON outbox BEGIN SELECT RAISE(ABORT,'full disk'); END;");
  assert.throws(() => phone.repo.createFarm('Test', 1), /full disk/); assert.equal(phone.repo.list().length, 0);
  phone.repo.db.execSync("CREATE TRIGGER fail_records BEFORE INSERT ON records BEGIN SELECT RAISE(ABORT,'full disk'); END;");
  assert.throws(() => phone.repo.pull([{id: randomUUID(), version: 1, deleted: false, data: {kind:'farm',name:'Test',plotId:randomUUID(),areaM2:null,location:null,soil:'unknown',water:'unknown'}}], '22'));
  assert.equal(phone.repo.meta('cursor'), undefined); phone.close();
});
test('OTP expiry, attempt limit, single use, resend cooldown and session revocation', async () => {
  const identity = `${randomUUID()}@example.test`;
  const c = (await request('auth/codes', {identity})).body;
  assert.equal((await request('auth/codes', {identity})).status, 429);
  for (let i = 0; i < 5; i++) assert.equal((await request('auth/verify', {challengeId: c.challengeId, code:'000000'})).status, 401);
  assert.equal((await request('auth/verify', {challengeId: c.challengeId, code:c.developmentCode})).status, 401);
  const expired = (await request('auth/codes', {identity: `${randomUUID()}@example.test`})).body;
  await db.query("UPDATE challenges SET expires_at=now()-interval '1 second' WHERE id=$1", [expired.challengeId]);
  assert.equal((await request('auth/verify', {challengeId:expired.challengeId, code:expired.developmentCode})).status, 401);
  const valid = (await request('auth/codes', {identity: '+254712345678'})).body;
  const credentials = {challengeId: valid.challengeId, code: valid.developmentCode};
  const verified = (await request('auth/verify', credentials)).body;
  assert.equal((await request('auth/verify', credentials)).status, 401);
  await request('sessions/revoke', {}, verified.token);
  assert.equal((await request('sync/pull', undefined, verified.token)).status, 401);
  await assert.rejects(new SliceService(db, false).requestCode({identity}), /Http Exception/);
});
test('input validation, bounded batches, idempotency-key misuse, units, translations', async () => {
  const user = await account(); const phone = local(user.ownerId); const farm = phone.repo.createFarm('Test', null); const op = phone.repo.batch()[0];
  const network = transport(user.token); await network.push([op]);
  const changed = {...op, baseVersion: 3};
  assert.equal((await network.push([changed])).acknowledgements[0].code, 'OPERATION_ID_REUSED');
  assert.equal((await request('sync/push', {operations: Array(51).fill(op)}, user.token)).status, 400);
  assert.equal((await request('sync/push', {operations: [{...op, ownerId: randomUUID()}]}, user.token)).status, 400);
  assert.equal((await request('sync/pull?cursor=-1', undefined, user.token)).status, 400);
  assert.equal(phone.repo.get(farm)!.data.kind, 'farm');
  assert.equal(acresToSquareMetres(1), 4046.8564224); assert.throws(() => acresToSquareMetres(0));
  assert.deepEqual(Object.keys(messages.en).sort(), Object.keys(messages.sw).sort()); phone.close();
});
test('simultaneous retries share one acknowledgement and tombstones reject stale reactivation', async () => {
  const user = await account(); const phone = local(user.ownerId); const farm = phone.repo.createFarm('Concurrent', 10);
  const op = phone.repo.batch()[0]; const network = transport(user.token);
  const [first, second] = await Promise.all([network.push([op]), network.push([op])]);
  assert.deepEqual(first, second);
  assert.equal((await db.query("SELECT count(*)::int AS n FROM changes WHERE record->>'id'=$1", [farm])).rows[0].n, 1);
  await db.query('UPDATE records SET deleted=true WHERE id=$1', [farm]);
  const stale = {...op, operationId: randomUUID(), baseVersion: 1};
  const ack = (await network.push([stale])).acknowledgements[0];
  assert.equal(ack.status, 'conflict'); assert.equal(ack.record!.deleted, true);
  assert.equal((await db.query('SELECT deleted FROM records WHERE id=$1', [farm])).rows[0].deleted, true); phone.close();
});
test('future local schema fails closed instead of resetting migration version', () => {
  const phone = local(randomUUID()); phone.repo.db.execSync('PRAGMA user_version=2');
  assert.throws(() => new Repository(phone.repo.db, phone.repo.ownerId, randomUUID(), randomUUID), /NEWER_DATABASE/);
  assert.equal(phone.repo.db.getFirstSync<{user_version:number}>('PRAGMA user_version')!.user_version, 2); phone.close();
});
test('Expo Go permits only isolated fixture storage; native builds always require encryption', () => {
  const owner = randomUUID();
  const native = storagePolicy(owner, false, 'development_fixture');
  const preview = storagePolicy(owner, true, 'development_fixture');
  assert.equal(native.encrypted, true); assert.equal(preview.encrypted, false);
  assert.notEqual(native.filename, preview.filename);
  assert.throws(() => storagePolicy(owner, true, 'verified_email'), /REQUIRES_FIXTURE_ACCOUNT/);
});
