import { createContext, useContext, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as Network from 'expo-network';
import { t, type MessageKey } from '../../../packages/translations';
import { squareMetresToArea, type AreaUnit } from '../../../packages/domain';
import type { Language, RecordData } from '../../../packages/contracts';
import { Repository } from './repository';
import { SyncEngine } from './sync';
import { request } from './api';
import { clearSession, loadSession, openRepository, saveSession, type Session } from './storage';
import { SessionClient } from './session-client';
import { readPreferences, readFarmDraft, saveAreaUnit, saveDraftArea } from './preferences';
function useAppController() {
  const [language, setLanguage] = useState<Language>('en');
  const [areaUnit, setAreaUnit] = useState<AreaUnit>('acres');
  const [draftUnit, setDraftUnit] = useState<AreaUnit>('acres');
  const [session, setSession] = useState<Session | null>(null);
  const [repo, setRepo] = useState<Repository | null>(null);
  const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<MessageKey | null>(null);
  const [syncing, setSyncing] = useState(false); const [, refresh] = useState(0);
  const [message, setMessage] = useState<MessageKey | null>(null);
  const [identity, setIdentity] = useState(''); const [code, setCode] = useState('');
  const [challenge, setChallenge] = useState<{challengeId: string; developmentCode: string} | null>(null);
  const [farmName, setFarmName] = useState(''); const [area, setArea] = useState('');
  const [reauth, setReauth] = useState(false);
  const client = useRef<SessionClient | null>(null);
  const engine = useRef<SyncEngine | null>(null);
  const retryState = useRef({failures: 0, after: 0});
  const signingOut = useRef(false);
  const network = Network.useNetworkState();
  const text = (key: MessageKey) => t(language, key);
  const displayArea = (areaM2: number | null) => areaM2 === null ? text('unknown') : `${squareMetresToArea(areaM2, areaUnit).toLocaleString(language === 'sw' ? 'sw-KE' : 'en-KE', {maximumFractionDigits: 6})} ${text(areaUnit)}`;
  const describe = (data?: RecordData) => !data ? text('unknown') : data.kind === 'task' ? `${text('fixtureTask')}: ${text(data.done ? 'yes' : 'no')}` : `${data.name} · ${displayArea(data.areaM2)}`;
  const redraw = () => refresh(v => v + 1);
  const activate = async (value: Session) => {
    // Finish an old-token request before replacing its engine or closing its database.
    await engine.current?.waitUntilIdle().catch(() => undefined);
    if (repo && repo.ownerId !== value.ownerId) throw new Error('REAUTH_SAME_ACCOUNT_REQUIRED');
    await saveSession(value);
    const repository = repo?.ownerId === value.ownerId ? repo : await openRepository(value);
    if (repo && repo !== repository && 'closeSync' in repo.db) (repo.db as any).closeSync();
    const authenticated = new SessionClient(value, request, async next => { await saveSession(next); setSession(next); });
    client.current = authenticated;
    engine.current = new SyncEngine(repository, {
      push: operations => authenticated.request('sync/push', {operations}),
      pull: cursor => authenticated.request('sync/pull?cursor=' + cursor),
    });
    const draft = readFarmDraft(repository);
    setFarmName(draft.name); setArea(draft.area); setDraftUnit(draft.unit);
    setAreaUnit(readPreferences(repository).areaUnit);
    retryState.current = {failures: 0, after: 0}; setSyncFeedback(null);
    setRepo(repository); setSession(value); setReauth(false);
  };
  useEffect(() => { void (async () => {
    try {
      const savedLanguage = await SecureStore.getItemAsync('language');
      if (savedLanguage === 'sw') setLanguage('sw');
      const value = await loadSession(); if (value) await activate(value);
    } catch (error) { setMessage(error instanceof Error && error.message === 'SQLCIPHER_BUILD_REQUIRED' ? 'encryptedBuild' : 'error'); } finally { setLoading(false); }
  })(); }, []);
  const sync = useCallback(async () => {
    if (!engine.current || signingOut.current) return;
    const activeEngine = engine.current;
    setSyncing(true); setSyncFeedback('syncing');
    try {
      await activeEngine.run(); retryState.current = {failures: 0, after: 0};
      const remaining = activeEngine.repository.pending();
      setSyncFeedback(remaining.some(item => item.failure) ? 'syncRejected' : remaining.length ? 'pending' : 'syncSuccess');
    }
    catch (error) {
      const failures = retryState.current.failures + 1;
      retryState.current = {failures, after: Date.now() + Math.min(300000, 5000 * 2 ** Math.min(failures - 1, 6))};
      if (error instanceof Error && error.message === 'UNAUTHORIZED') { setMessage('expired'); setSyncFeedback('expired'); setReauth(true); }
      else { const key = error instanceof Error && error.message === 'REQUEST_FAILED' ? 'syncServerError' : 'syncUnavailable'; setSyncFeedback(key); }
    } finally { setSyncing(false); redraw(); }
  }, []);
  useEffect(() => {
    if (!repo || reauth) return;
    void sync();
    const listener = AppState.addEventListener('change', state => { if (state === 'active') void sync(); });
    // Foreground retry uses a modest interval; OS background work is not promised.
    const timer = setInterval(() => { if (AppState.currentState === 'active' && network.isConnected !== false && Date.now() >= retryState.current.after) void sync(); }, 30000);
    return () => { listener.remove(); clearInterval(timer); };
  }, [repo, reauth, network.isConnected, sync]);
  const action = async (fn: () => Promise<void> | void) => {
    setBusy(true); setMessage(null);
    try { await fn(); } catch (error) {
      const code = error instanceof Error ? error.message : '';
      const errors: Record<string, MessageKey> = {SQLCIPHER_BUILD_REQUIRED: 'encryptedBuild', INVALID_LOGIN: 'invalidLogin', LOGIN_COOLDOWN: 'loginCooldown', REAUTH_REQUIRED: 'passwordReauth', RESEND_COOLDOWN: 'codeCooldown', INVALID_OR_EXPIRED_CODE: 'invalidCode', REAUTH_SAME_ACCOUNT_REQUIRED: 'sameAccount', UNAUTHORIZED: 'expired'};
      setMessage(errors[code] ?? 'error');
      if (code === 'REAUTH_REQUIRED' || code === 'UNAUTHORIZED') setReauth(true);
    } finally { setBusy(false); redraw(); }
  };
  const changeLanguage = async (value: Language) => { await SecureStore.setItemAsync('language', value); setLanguage(value); };
  const changeAreaUnit = (value: AreaUnit) => {
    if (!repo) return;
    saveAreaUnit(repo, value); setAreaUnit(value);
    if (!area) setDraftUnit(value);
  };
  const changeDraftArea = (value: string) => {
    if (!repo) return;
    saveDraftArea(repo, value, draftUnit); setArea(value);
  };
  const signOut = async () => {
    if (!repo || !session) return;
    if (repo.pending().length) { setMessage('unsynced'); return; }
    signingOut.current = true;
    try {
      await engine.current?.run();
      await client.current!.request('sessions/revoke', {});
      await clearSession(); engine.current = null; client.current = null;
      if ('closeSync' in repo.db) (repo.db as any).closeSync();
      setRepo(null); setSession(null); setIdentity(''); setReauth(false);
      setSyncFeedback(null); setChallenge(null); setCode(''); setFarmName(''); setArea('');
    } finally { signingOut.current = false; }
  };
  const setPassword = async (password: string) => {
    if (!client.current) return;
    signingOut.current = true; // Pause new sync requests while replacing all account sessions.
    try {
      await engine.current?.waitUntilIdle().catch(() => undefined);
      const next = await client.current.request('auth/password', {password});
      await client.current.replace(next);
      setReauth(false); setMessage('passwordSaved');
    } finally { signingOut.current = false; }
  };
  const selectFarm = (id: string) => { repo?.selectFarm(id); redraw(); };
  const createFarm = (areaM2: number | null) => {
    if (!repo) return;
    const id = repo.createFarm(farmName, areaM2); repo.selectFarm(id);
    repo.setMeta('draftFarmName', ''); repo.setMeta('draftArea', '');
    setFarmName(''); setArea(''); setDraftUnit(areaUnit); setMessage('saved'); redraw(); void sync();
  };
  return {selectFarm, createFarm, setPassword, language, areaUnit, draftUnit, changeLanguage, changeAreaUnit, changeDraftArea,
    session, repo, loading, busy, syncFeedback, syncing, message, setMessage,
    identity, setIdentity, code, setCode, challenge, setChallenge, farmName, setFarmName,
    area, reauth, text, displayArea, describe, activate, sync, action, signOut};
}
const AppContext = createContext<ReturnType<typeof useAppController> | null>(null);
export function AppProvider({children}: {children: ReactNode}) {
  const state = useAppController();
  return <AppContext.Provider value={state}>{children}</AppContext.Provider>;
}
export function useApp() {
  const state = useContext(AppContext);
  if (!state) throw new Error('APP_PROVIDER_REQUIRED');
  return state;
}
