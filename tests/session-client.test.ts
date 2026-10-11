import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SessionClient } from '../apps/mobile/src/session-client';
import type { AuthSession } from '../packages/contracts';
const initial: AuthSession = {ownerId: 'owner-a', token: 'old', refreshToken: 'refresh-old', verificationKind: 'development_fixture'};
const renewed: AuthSession = {...initial, token: 'new', refreshToken: 'refresh-new'};
test('parallel expired requests renew once and persist new credentials before retrying', async () => {
  let refreshes = 0; let persisted = false; const tokens: string[] = [];
  const client = new SessionClient(initial, async (path, body, token) => {
    if (path === 'sessions/refresh') { refreshes++; await new Promise(resolve => setTimeout(resolve, 10)); return renewed; }
    if (token === 'old') throw new Error('UNAUTHORIZED');
    assert.ok(persisted); tokens.push(token!); return {ok: true};
  }, async next => { assert.deepEqual(next, renewed); persisted = true; });
  await Promise.all([client.request('sync/pull'), client.request('sync/pull')]);
  assert.equal(refreshes, 1); assert.deepEqual(tokens, ['new', 'new']);
});
test('offline errors never consume refresh tokens and legacy sessions require sign-in', async () => {
  const paths: string[] = [];
  const client = new SessionClient(initial, async path => { paths.push(path); throw new TypeError('Network request failed'); }, async () => assert.fail('must not persist'));
  await assert.rejects(() => client.request('sync/pull')); assert.deepEqual(paths, ['sync/pull']);
  const legacy = new SessionClient({...initial, refreshToken: undefined}, async () => {throw new Error('UNAUTHORIZED');}, async () => assert.fail());
  await assert.rejects(() => legacy.request('sync/pull'), /UNAUTHORIZED/);
});
test('rotated credentials cannot change owners or be used before secure persistence succeeds', async () => {
  let calls = 0;
  const client = new SessionClient(initial, async path => {calls++; if (path === 'sessions/refresh') return renewed; throw new Error('UNAUTHORIZED');}, async () => {throw new Error('STORAGE_FULL');});
  await assert.rejects(() => client.request('sync/pull'), /STORAGE_FULL/); assert.equal(calls, 2);
  await assert.rejects(() => client.replace({...renewed, ownerId: 'owner-b'}), /ACCOUNT_ISOLATION/);
});
