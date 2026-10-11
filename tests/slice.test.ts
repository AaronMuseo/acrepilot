import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { createApp } from '../apps/api/src/app';
import { migration, type Database } from '../apps/api/src/database';
import { Repository, type LocalDatabase } from '../apps/mobile/src/repository';
import { SyncEngine, type SyncTransport } from '../apps/mobile/src/sync';
import { SliceService } from '../apps/api/src/service';
import { areaUnits, validAreaUnit, areaToSquareMetres, squareMetresToArea, acresToSquareMetres } from '../packages/domain';
import { messages } from '../packages/translations';
import { readPreferences, readFarmDraft, saveAreaUnit, saveDraftArea } from '../apps/mobile/src/preferences';
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
  assert.equal(response.status, 201); return response.body as {ownerId: string; token: string; refreshToken: string};
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

test('area preferences survive reopening without rewriting farm records or outbox', () => {
  const owner = randomUUID(); const file = join(work, 'preferences.db');
  let phone = local(owner, file);
  phone.repo.createFarm('Units test', 10000);
  const beforeRecords = phone.repo.list(); const beforeOperations = phone.repo.pending();
  saveAreaUnit(phone.repo, 'hectares');
  phone.close(); phone = local(owner, file);
  assert.equal(readPreferences(phone.repo).areaUnit, 'hectares');
  assert.equal(squareMetresToArea(10000, readPreferences(phone.repo).areaUnit), 1);
  assert.deepEqual(phone.repo.list(), beforeRecords);
  assert.deepEqual(phone.repo.pending(), beforeOperations);
  const other = local(randomUUID());
  assert.equal(readPreferences(other.repo).areaUnit, 'acres');
  other.close(); phone.close();
});

test('legacy and new draft areas keep their unit when settings change and database reopens', () => {
  const owner = randomUUID(); const file = join(work, 'draft-units.db');
  let phone = local(owner, file);
  phone.repo.setMeta('draftFarmName', 'Unfinished farm');
  phone.repo.setMeta('draftArea', '2'); // Older releases stored acres with no unit tag.
  saveAreaUnit(phone.repo, 'hectares');
  assert.equal(readFarmDraft(phone.repo).unit, 'acres');
  saveDraftArea(phone.repo, '3', 'hectares');
  saveAreaUnit(phone.repo, 'squareMetres');
  phone.close(); phone = local(owner, file);
  const draft = readFarmDraft(phone.repo);
  assert.deepEqual(draft, {name: 'Unfinished farm', area: '3', unit: 'hectares'});
  phone.repo.createFarm(draft.name, areaToSquareMetres(Number(draft.area), draft.unit));
  const farmData = phone.repo.list().find(r => r.data.kind === 'farm')!.data;
  assert.ok(farmData.kind === 'farm'); assert.equal(farmData.areaM2, 30000);
  saveDraftArea(phone.repo, '', draft.unit);
  assert.equal(readFarmDraft(phone.repo).unit, 'squareMetres');
  phone.close();
});

test('area conversions preserve physical area and reject invalid input', () => {
  for (const unit of areaUnits) {
    const original = 12345.6789;
    assert.ok(Math.abs(areaToSquareMetres(squareMetresToArea(original, unit), unit) - original) < 1e-8);
    for (const invalid of [0, -1, NaN, Infinity]) assert.throws(() => areaToSquareMetres(invalid, unit), /INVALID_AREA/);
  }
  assert.equal(areaToSquareMetres(1, 'hectares'), 10000);
  assert.equal(validAreaUnit('damaged-setting'), 'acres');
});

test('rotating sessions renew expired access and replay revokes only that session family', async () => {
  const user = await account();
  const other = await account();
  await pg.query("UPDATE sessions SET expires_at=now()-interval '1 second' WHERE owner_id=$1", [user.ownerId]);
  assert.equal((await request('sync/pull', undefined, user.token)).status, 401);
  const renewed = await request('sessions/refresh', {refreshToken: user.refreshToken});
  assert.equal(renewed.status, 201);
  assert.notEqual(renewed.body.refreshToken, user.refreshToken);
  assert.equal((await request('sync/pull', undefined, renewed.body.token)).status, 200);
  assert.equal((await request('sessions/refresh', {refreshToken: user.refreshToken})).status, 401);
  assert.equal((await request('sync/pull', undefined, renewed.body.token)).status, 401);
  assert.equal((await request('sessions/refresh', {refreshToken: renewed.body.refreshToken})).status, 401);
  assert.equal((await request('sync/pull', undefined, other.token)).status, 200);
});

test('refresh expiry and sign-out prevent future renewal', async () => {
  const expired = await account();
  await pg.query("UPDATE sessions SET refresh_expires_at=now()-interval '1 second' WHERE owner_id=$1", [expired.ownerId]);
  assert.equal((await request('sessions/refresh', {refreshToken: expired.refreshToken})).status, 401);
  const user = await account();
  const next = await request('sessions/refresh', {refreshToken: user.refreshToken});
  assert.equal((await request('sessions/revoke', {}, next.body.token)).status, 201);
  assert.equal((await request('sessions/refresh', {refreshToken: next.body.refreshToken})).status, 401);
});

test('password setup needs recent authentication, hashes passwords and revokes older sessions', async () => {
  const user = await account(); const password = 'test-only passphrase 2026';
  const identity = (await pg.query<{identity: string}>('SELECT identity FROM accounts WHERE id=$1', [user.ownerId])).rows[0].identity;
  assert.equal((await request('auth/password', {password: 'short'}, user.token)).status, 400);
  await pg.query("UPDATE sessions SET authenticated_at=now()-interval '11 minutes' WHERE owner_id=$1", [user.ownerId]);
  assert.equal((await request('auth/password', {password}, user.token)).body.code, 'REAUTH_REQUIRED');
  await pg.query('UPDATE sessions SET authenticated_at=now() WHERE owner_id=$1', [user.ownerId]);
  const changed = await request('auth/password', {password}, user.token);
  assert.equal(changed.status, 201);
  assert.equal((await request('sync/pull', undefined, user.token)).status, 401);
  assert.equal((await request('sessions/refresh', {refreshToken: user.refreshToken})).status, 401);
  const stored = (await pg.query<{password_hash: string}>('SELECT password_hash FROM accounts WHERE id=$1', [user.ownerId])).rows[0].password_hash;
  assert.ok(stored.startsWith('scrypt$')); assert.ok(!stored.includes(password));
  const login = await request('auth/password/login', {identity: identity.toUpperCase(), password});
  assert.equal(login.status, 201); assert.equal(login.body.ownerId, user.ownerId);
  assert.equal((await request('sync/pull', undefined, login.body.token)).status, 200);
  for (let i = 0; i < 4; i++) assert.equal((await request('auth/password/login', {identity, password: 'incorrect test password'})).body.code, 'INVALID_LOGIN');
  assert.equal((await request('auth/password/login', {identity, password})).status, 429);
});

test('unknown password identities and unavailable delivery do not create accounts', async () => {
  const identity = `${randomUUID()}@example.test`;
  assert.equal((await request('auth/password/login', {identity, password: 'unknown test passphrase'})).body.code, 'INVALID_LOGIN');
  assert.equal((await pg.query('SELECT id FROM accounts WHERE identity=$1', [identity])).rows.length, 0);
  const disabled = new SliceService(db, false);
  await assert.rejects(() => disabled.passwordLogin({identity, password: 'unknown test passphrase'}), /DELIVERY_NOT_CONFIGURED|Http Exception/);
  await assert.rejects(() => disabled.refresh({refreshToken: 'a'.repeat(64)}));
});

test('concurrent refresh reuse leaves no active child session', async () => {
  const user = await account();
  const results = await Promise.all([request('sessions/refresh', {refreshToken: user.refreshToken}), request('sessions/refresh', {refreshToken: user.refreshToken})]);
  assert.deepEqual(results.map(r => r.status).sort(), [201, 401]);
  const success = results.find(r => r.status === 201)!;
  assert.equal((await request('sync/pull', undefined, success.body.token)).status, 401);
});

test('P1 migration preserves legacy accounts, sessions and farm records when reapplied', async () => {
  const legacy = new PGlite();
  try {
    await legacy.exec(readFileSync('apps/api/migrations/001_initial.sql', 'utf8'));
    const owner = randomUUID(); const record = randomUUID();
    await legacy.query("INSERT INTO accounts(id,identity,verification_kind) VALUES ($1,$2,'development_fixture')", [owner, 'migration@example.test']);
    await legacy.query("INSERT INTO sessions(token_hash,owner_id,expires_at) VALUES ($1,$2,now()+interval '7 days')", ['legacy-hash', owner]);
    await legacy.query('INSERT INTO records(id,owner_id,version,data) VALUES ($1,$2,1,$3)', [record, owner, {kind:'farm',name:'Retained'}]);
    await legacy.exec(migration()); await legacy.exec(migration());
    assert.equal((await legacy.query('SELECT id FROM accounts WHERE id=$1', [owner])).rows.length, 1);
    assert.deepEqual((await legacy.query<{data: unknown}>('SELECT data FROM records WHERE id=$1', [record])).rows[0].data, {kind:'farm',name:'Retained'});
    const row = (await legacy.query<{refresh_hash: string | null; revoked: boolean}>('SELECT refresh_hash,revoked FROM sessions WHERE token_hash=$1', ['legacy-hash'])).rows[0];
    assert.equal(row.refresh_hash, null); assert.equal(row.revoked, false);
  } finally { await legacy.close(); }
});

test('multiple farms retain selected farm and pair tasks after offline restart and sync', async () => {
  const user = await account(); const file = join(work, 'multiple-farms.db');
  let phone = local(user.ownerId, file);
  const first = phone.repo.createFarm('First farm', null); const second = phone.repo.createFarm('Second farm', 10000);
  phone.repo.selectFarm(second);
  const task = phone.repo.list().find(r => r.data.kind === 'task' && r.data.farmId === second)!;
  assert.ok(task.data.kind === 'task'); phone.repo.save(task.id, {...task.data, done:true});
  phone.repo.renameFarm(first, 'Renamed first farm');
  phone.close(); phone = local(user.ownerId, file);
  assert.equal(phone.repo.farms().length, 2); assert.equal(phone.repo.selectedFarm()!.id, second);
  await new SyncEngine(phone.repo, transport(user.token)).run();
  assert.equal(phone.repo.pending().length, 0);
  const remote = (await request('sync/pull', undefined, user.token)).body.records;
  assert.ok(remote.some((r: any) => r.id === first && r.data.name === 'Renamed first farm'));
  assert.ok(remote.some((r: any) => r.id === task.id && r.data.done === true && r.data.farmId === second));
  assert.equal(phone.repo.get(second)!.data.kind, 'farm');
  const secondData = phone.repo.get(second)!.data; assert.ok(secondData.kind === 'farm'); assert.equal(secondData.areaM2,10000);
  assert.throws(() => phone.repo.selectFarm(randomUUID()), /FARM_NOT_FOUND/);
  assert.throws(() => phone.repo.renameFarm(task.id, 'Not a farm'), /FARM_NOT_FOUND/);
  phone.close();
});
