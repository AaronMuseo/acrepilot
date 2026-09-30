import * as SQLite from 'expo-sqlite';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Repository } from './repository';
import { storagePolicy } from './storage-policy';
export const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
const sessionKey = isExpoGo ? 'expo-go-fixture-session' : 'session';
export type Session = { ownerId: string; token: string; verificationKind: 'development_fixture' };
export const loadSession = async (): Promise<Session | null> => {
  const value = await SecureStore.getItemAsync(sessionKey); return value ? JSON.parse(value) : null;
};
export const saveSession = (session: Session) => SecureStore.setItemAsync(sessionKey, JSON.stringify(session));
export const clearSession = () => SecureStore.deleteItemAsync(sessionKey);
export async function openRepository(session: Session) {
  const {ownerId} = session;
  const policy = storagePolicy(ownerId, isExpoGo, session.verificationKind);
  let deviceId = await SecureStore.getItemAsync('device-id');
  if (!deviceId) { deviceId = Crypto.randomUUID(); await SecureStore.setItemAsync('device-id', deviceId); }
  if (!policy.encrypted) {
    const fixtureDb = SQLite.openDatabaseSync(policy.filename);
    try { return new Repository(fixtureDb, ownerId, deviceId, Crypto.randomUUID); }
    catch (error) { fixtureDb.closeSync(); throw error; }
  }
  let key = await SecureStore.getItemAsync(`db-key-${ownerId}`);
  if (!key) {
    key = Array.from(await Crypto.getRandomBytesAsync(32), b => b.toString(16).padStart(2, '0')).join('');
    await SecureStore.setItemAsync(`db-key-${ownerId}`, key);
  }
  const db = SQLite.openDatabaseSync(policy.filename);
  try {
    if (!/^[a-f0-9]{64}$/.test(key)) throw new Error('INVALID_KEY');
    db.execSync(`PRAGMA key = "x'${key}'";`);
    if (!db.getFirstSync<{cipher_version: string}>('PRAGMA cipher_version')?.cipher_version) throw new Error('SQLCIPHER_BUILD_REQUIRED');
    return new Repository(db, ownerId, deviceId, Crypto.randomUUID);
  } catch (error) { db.closeSync(); throw error; }
}
