import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import * as Network from 'expo-network';
import { t, type MessageKey } from '../../../packages/translations';
import { acresToSquareMetres } from '../../../packages/domain';
import type { Ack, Language, RecordData } from '../../../packages/contracts';
import { Repository } from '../src/repository';
import { SyncEngine } from '../src/sync';
import { request, transport } from '../src/api';
import { clearSession, loadSession, openRepository, saveSession, isExpoGo, type Session } from '../src/storage';

export default function Home() {
  const [language, setLanguage] = useState<Language>('en');
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
  const engine = useRef<SyncEngine | null>(null);
  const retryState = useRef({failures: 0, after: 0});
  const signingOut = useRef(false);
  const network = Network.useNetworkState();
  const text = (key: MessageKey) => t(language, key);
  const displayArea = (areaM2: number | null) => areaM2 === null ? text('unknown') : `${(areaM2 / 4046.8564224).toLocaleString(language === 'sw' ? 'sw-KE' : 'en-KE')} ${text('acres')}`;
  const describe = (data?: RecordData) => !data ? text('unknown') : data.kind === 'task' ? `${text('fixtureTask')}: ${text(data.done ? 'yes' : 'no')}` : `${data.name} · ${displayArea(data.areaM2)}`;
  const redraw = () => refresh(v => v + 1);
  const activate = async (value: Session) => {
    const repository = repo?.ownerId === value.ownerId ? repo : await openRepository(value);
    if (repo && repo !== repository && 'closeSync' in repo.db) (repo.db as any).closeSync();
    engine.current = new SyncEngine(repository, transport(value.token));
    setFarmName(repository.meta('draftFarmName') ?? ''); setArea(repository.meta('draftArea') ?? '');
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
    setSyncing(true); setSyncFeedback('syncing');
    try {
      await engine.current.run(); retryState.current = {failures: 0, after: 0}; setMessage(null);
      const remaining = engine.current.repository.pending();
      setSyncFeedback(remaining.some(item => item.failure) ? 'attention' : remaining.length ? 'pending' : 'syncSuccess');
    }
    catch (error) {
      const failures = retryState.current.failures + 1;
      retryState.current = {failures, after: Date.now() + Math.min(300000, 5000 * 2 ** Math.min(failures - 1, 6))};
      if (error instanceof Error && error.message === 'UNAUTHORIZED') { setMessage('expired'); setSyncFeedback('expired'); setReauth(true); }
      else { setMessage('offline'); setSyncFeedback('syncUnavailable'); }
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
    try { await fn(); } catch (error) { setMessage(error instanceof Error && error.message === 'SQLCIPHER_BUILD_REQUIRED' ? 'encryptedBuild' : 'error'); } finally { setBusy(false); redraw(); }
  };
  const button = (label: string, onPress: () => void, secondary = false) => <Pressable accessibilityRole="button" disabled={busy} onPress={onPress} style={[styles.button, secondary && styles.secondary, busy && styles.disabled]}><Text style={[styles.buttonText, secondary && styles.secondaryText]}>{label}</Text></Pressable>;
  const field = (key: MessageKey, value: string, onChangeText: (value: string) => void, numeric = false) => <View style={styles.field}><Text style={styles.label}>{text(key)}</Text><TextInput accessibilityLabel={text(key)} style={styles.input} value={value} onChangeText={onChangeText} keyboardType={numeric ? 'decimal-pad' : 'default'} autoCapitalize="none" maxLength={key === 'farmName' ? 100 : 254} /></View>;
  const pending = repo?.pending() ?? []; const failed = pending.find(r => r.failure);
  const conflict = failed ? JSON.parse(failed.failure!) as Ack : null;
  const records = repo?.list().filter(r => !r.deleted) ?? [];
  const farm = records.find(r => r.data.kind === 'farm');
  const task = records.find(r => r.data.kind === 'task');
  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
    <Text style={styles.brand}>AcrePilot</Text><Text style={styles.subtitle}>{text('subtitle')}</Text>
    <View style={styles.languages}>{(['en', 'sw'] as const).map(lang => <Pressable key={lang} accessibilityRole="button" accessibilityState={{selected: lang === language}} onPress={() => void action(async () => { await SecureStore.setItemAsync('language', lang); setLanguage(lang); })} style={[styles.language, lang === language && styles.selected]}><Text style={styles.label}>{lang === 'en' ? 'English' : 'Kiswahili'}</Text></Pressable>)}</View>
    <Text style={styles.notice}>{text('fixture')}</Text>
    {isExpoGo && <Text style={styles.notice}>{text('expoGoFixture')}</Text>}
    {message && <Text accessibilityRole="alert" style={styles.notice}>{text(message)}</Text>}
    {loading ? <Text>{text('loading')}</Text> : <>
      {(!session || reauth) && <View style={styles.card}>
        <Text style={styles.body}>{text('onlineRequired')}</Text>
        {field('identity', identity, setIdentity)}
        {button(text('sendCode'), () => void action(async () => { setChallenge(await request('auth/codes', {identity})); }))}
        {challenge && <><Text selectable style={styles.notice}>DEV: {challenge.developmentCode}</Text>{field('code', code, setCode, true)}
          {button(text('verify'), () => void action(async () => {
            const value: Session = await request('auth/verify', {challengeId: challenge.challengeId, code});
            if (repo && repo.ownerId !== value.ownerId) throw new Error('REAUTH_SAME_ACCOUNT_REQUIRED');
            await activate(value); await saveSession(value); setChallenge(null); setCode('');
          }))}</>}
      </View>}
      {repo && <>
        <View style={styles.status}><Text style={styles.label}>{text(syncing ? 'syncing' : failed ? 'attention' : pending.length ? 'pending' : 'synced')}</Text><Text>{text('lastSync')}: {repo.meta('lastSync') ? new Date(repo.meta('lastSync')!).toLocaleString(language === 'sw' ? 'sw-KE' : 'en-KE') : text('never')}</Text></View>
        {!farm ? <View style={styles.card}><Text style={styles.heading}>{text('home')}</Text><Text style={styles.body}>{text('noFarm')}</Text>
          {field('farmName', farmName, value => { repo.setMeta('draftFarmName', value); setFarmName(value); })}{field('area', area, value => { repo.setMeta('draftArea', value); setArea(value); }, true)}
          {button(text('createFarm'), () => void action(() => {
            const value = area.trim() ? Number(area) : null;
            if (value !== null && (!Number.isFinite(value) || value <= 0)) { setMessage('invalidArea'); return; }
            repo.createFarm(farmName, value === null ? null : acresToSquareMetres(value)); repo.setMeta('draftFarmName', ''); repo.setMeta('draftArea', ''); setMessage('saved'); void sync();
          }))}</View> : farm.data.kind === 'farm' && <View style={styles.card}>
          <Text style={styles.heading}>{farm.data.name}</Text><Text style={styles.label}>{text('defaultPlot')}</Text>
          <Text style={styles.body}>{displayArea(farm.data.areaM2)}</Text>
          <Text style={styles.body}>{text('soil')}: {text('unknown')} · {text('water')}: {text('unknown')}</Text><Text style={styles.body}>{text('locationMissing')}</Text>
        </View>}
        {task?.data.kind === 'task' && <View style={styles.card}><Text style={styles.heading}>{text('fixtureTask')}</Text><Text style={styles.body}>{text(task.data.done ? 'yes' : 'no')}</Text>
          <Text accessibilityLiveRegion="polite" style={styles.label}>{text(pending.some(item => item.record_id === task.id && item.failure) ? 'attention' : pending.some(item => item.record_id === task.id) ? 'pending' : 'synced')}</Text>
          {button(text(task.data.done ? 'reopen' : 'complete'), () => void action(() => { if (task.data.kind === 'task') repo.save(task.id, {...task.data, done: !task.data.done}); setMessage('saved'); void sync(); }))}</View>}
        <View style={styles.card}><Text style={styles.heading}>{text('guide')}</Text><Text style={styles.body}>{text('guideBody')}</Text></View>
        {conflict && <View style={styles.card}><Text style={styles.heading}>{text('attention')}</Text><Text style={styles.body}>{text('conflict')}</Text>
          <Text selectable style={styles.body}>{text('mine')}: {describe(repo.get(failed!.record_id)?.data)}</Text><Text selectable style={styles.body}>{text('server')}: {describe(conflict.record?.data)}</Text>
          {conflict.status === 'conflict' && conflict.record && !conflict.record.deleted && <>{button(text('keepMine'), () => void action(() => { repo.resolve(failed!.record_id, 'mine'); void sync(); }))}{button(text('useServer'), () => void action(() => { repo.resolve(failed!.record_id, 'server'); void sync(); }), true)}</>}
        </View>}
        <View style={styles.card}>
          {pending.length > 0 && <Text accessibilityLiveRegion="polite" style={styles.label}>{text(failed ? 'attention' : 'pending')}</Text>}
          <Pressable accessibilityRole="button" accessibilityState={{disabled: busy || syncing, busy: syncing}} disabled={busy || syncing} onPress={() => void sync()} style={[styles.button, styles.secondary, (busy || syncing) && styles.disabled]}><Text style={[styles.buttonText, styles.secondaryText]}>{text(syncing ? 'syncing' : 'retry')}</Text></Pressable>
          {syncFeedback && <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.body}>{text(syncFeedback)}</Text>}
          <Text style={styles.body}>{text('lastSync')}: {repo.meta('lastSync') ? new Date(repo.meta('lastSync')!).toLocaleString(language === 'sw' ? 'sw-KE' : 'en-KE', {year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'}) : text('never')}</Text>
        </View><Text style={styles.body}>{text('noBackup')}</Text>
        {button(text('signOut'), () => void action(async () => {
          if (repo.pending().length) { setMessage('unsynced'); return; }
          signingOut.current = true;
          try {
            await engine.current?.run();
            await request('sessions/revoke', {}, session!.token);
            await clearSession(); engine.current = null;
            if ('closeSync' in repo.db) (repo.db as any).closeSync();
            setRepo(null); setSession(null); setIdentity(''); setReauth(false);
          } finally { signingOut.current = false; }
        }), true)}
      </>}
    </>}
  </ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: '#f4f5ef'}, container: {padding: 22, gap: 18, maxWidth: 640, width: '100%', alignSelf: 'center'},
  brand: {fontSize: 34, fontWeight: '800', color: '#183e2d'}, subtitle: {fontSize: 18, color: '#395144'},
  languages: {flexDirection: 'row', gap: 12, flexWrap: 'wrap'}, language: {padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#789083'}, selected: {backgroundColor: '#d8e8d9'},
  notice: {backgroundColor: '#fff0cb', color: '#553c10', padding: 14, borderRadius: 10, fontSize: 15, lineHeight: 23},
  card: {padding: 20, borderRadius: 20, backgroundColor: '#ffffff', gap: 14, borderWidth: 1, borderColor: '#dbe2d9'},
  heading: {fontSize: 23, fontWeight: '700', color: '#183e2d'}, body: {fontSize: 17, lineHeight: 26, color: '#38473d'},
  label: {fontSize: 16, fontWeight: '600', color: '#183e2d'}, field: {gap: 8},
  input: {borderWidth: 1, borderColor: '#75877c', borderRadius: 10, padding: 14, minHeight: 52, fontSize: 18, color: '#172d20'},
  button: {minHeight: 50, padding: 14, backgroundColor: '#20563a', borderRadius: 12, alignItems: 'center', justifyContent: 'center'}, buttonText: {color: '#ffffff', fontSize: 17, fontWeight: '600'},
  secondary: {backgroundColor: '#e3eadf'}, secondaryText: {color: '#183e2d'}, disabled: {opacity: 0.5}, status: {gap: 6},
});
