import { Button, Skeleton } from './ui';
import { palettes, usePalette, space, type, line, radius, border, layout, feedback, type Colors } from './design-tokens';
import { makeControls } from './control-styles';
import { useState } from 'react';
import { StatusBar, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, type Href } from 'expo-router';
import { type MessageKey } from '../../../packages/translations';
import { areaUnits } from '../../../packages/domain';
import type { Ack } from '../../../packages/contracts';
import { request } from './api';
import { isExpoGo, type Session } from './storage';
import { validateAuth, type AuthErrors } from './auth-validation';
import { FarmManager, FarmPicker } from './farm-manager';
import { useApp } from './app-state';
export const sections = ['home', 'farm', 'crops', 'tools', 'markets', 'more'] as const;
export type Section = typeof sections[number];
const routes: Record<Section, Href> = {home: '/', farm: '/farm', crops: '/crops', tools: '/tools', markets: '/markets', more: '/more'};
const navLabels: Record<Section, MessageKey> = {home: 'navHome', farm: 'navFarm', crops: 'navCrops', tools: 'navTools', markets: 'navMarkets', more: 'navMore'};
export default function AppScreen({section}: {section: Section}) {
 const colors = usePalette(); const controls = makeControls(colors); const styles = makeStyles(colors, controls);

  const [showPreviewDetails, setShowPreviewDetails] = useState(false);
  const [authErrors, setAuthErrors] = useState<AuthErrors>({});
  const [password, setPasswordInput] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const {fontScale, width} = useWindowDimensions();
  const {setPassword, language, areaUnit, changeLanguage, changeAreaUnit,
    session, repo, loading, busy, syncFeedback, syncing, message, setMessage,
    identity, setIdentity, code, setCode, challenge, setChallenge,
    reauth, text, displayArea, describe, activate, sync, action, signOut} = useApp();
  const validate = (mode: 'password' | 'requestCode' | 'verify') => {
    const errors = validateAuth(mode, {identity, password, code}); setAuthErrors(errors);
    return Object.keys(errors).length === 0;
  };
  const clearFieldError = (key: keyof AuthErrors) => setAuthErrors(current => ({...current, [key]: undefined}));
  const fieldError = (key: keyof AuthErrors) => authErrors[key] ? <Text accessibilityRole="alert" style={styles.fieldError}>{text(authErrors[key]!)}</Text> : null;
  const button = (label: string, onPress: () => void, secondary = false) => <Button label={label} onPress={onPress} secondary={secondary} disabled={busy} />;
  const field = (key: MessageKey, value: string, onChangeText: (value: string) => void, numeric = false) => <View style={styles.field}><Text style={styles.label}>{text(key)}</Text><TextInput accessibilityLabel={text(key)} style={styles.input} editable={!busy} value={value} onChangeText={onChangeText} keyboardType={numeric ? 'decimal-pad' : 'default'} autoCapitalize="none" maxLength={key === 'farmName' ? 100 : 254} /></View>;
  const pending = repo?.pending() ?? []; const failed = pending.find(r => r.failure);
  const conflict = failed ? JSON.parse(failed.failure!) as Ack : null;
  const records = repo?.list().filter(r => !r.deleted) ?? [];
  const farm = repo?.selectedFarm();
  const task = records.find(r => r.data.kind === 'task' && r.data.farmId === farm?.id);
  return <SafeAreaView style={styles.safe}><StatusBar barStyle={colors.background === palettes.dark.background ? "light-content" : "dark-content"} /><ScrollView style={styles.scroll} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets keyboardDismissMode="on-drag">
    <Text style={repo ? styles.wordmark : styles.brand}>AcrePilot</Text>{!repo && <Text style={styles.subtitle}>{text('subtitle')}</Text>}
    {(!repo || section === 'more') && <View style={styles.languages}>{(['en', 'sw'] as const).map(lang => <Pressable key={lang} accessibilityRole="button" accessibilityState={{selected: lang === language, disabled: busy}} disabled={busy} onPress={() => void action(async () => { await changeLanguage(lang); })} style={[styles.language, lang === language && styles.selected]}><Text style={styles.label}>{lang === 'en' ? 'English' : 'Kiswahili'}</Text></Pressable>)}</View>}
    <View style={styles.preview}>
      <Pressable accessibilityRole="button" accessibilityState={{expanded: showPreviewDetails}} onPress={() => setShowPreviewDetails(value => !value)} style={styles.previewToggle}><Text style={styles.previewText}>{text(isExpoGo ? 'previewGoShort' : 'previewShort')}</Text><Text style={styles.label}>{text(showPreviewDetails ? 'hideDetails' : 'previewDetails')} {showPreviewDetails ? '−' : '+'}</Text></Pressable>
      {showPreviewDetails && <><Text style={styles.notice}>{text('fixture')}</Text>{isExpoGo && <Text style={styles.notice}>{text('expoGoFixture')}</Text>}</>}
    </View>
    {message && !(reauth && section !== 'more') && <Text accessibilityRole="alert" style={styles.notice}>{text(message)}</Text>}
    {loading ? <Skeleton label={text('loading')} /> : <>
      {(!session || (reauth && section === 'more')) && <View style={styles.card}>
        <Text style={styles.body}>{text('onlineRequired')}</Text>
        {field('identity', identity, value => { setIdentity(value); clearFieldError('identity'); setChallenge(null); setCode(''); clearFieldError('code'); })}
        {fieldError('identity')}
        <Text style={styles.label}>{text('password')}</Text>
        <TextInput accessibilityLabel={text('password')} secureTextEntry autoCapitalize="none" autoCorrect={false} editable={!busy} value={password} onChangeText={value => { setPasswordInput(value); clearFieldError('password'); }} maxLength={128} style={styles.input} />
        {fieldError('password')}
        {button(text('passwordLogin'), () => void action(async () => {
          if (!validate('password')) return;
          const entered = password;
          const value: Session = await request('auth/password/login', {identity, password: entered});
          await activate(value); setPasswordInput(''); setAuthErrors({}); setChallenge(null); setCode('');
        }))}
        <Text style={styles.body}>{text('codeAlternative')}</Text>
        {button(text('sendCode'), () => void action(async () => { if (!validate('requestCode')) return; setChallenge(await request('auth/codes', {identity})); setCode(''); }), true)}
        {challenge && <><Text selectable style={styles.notice}>DEV: {challenge.developmentCode}</Text>{field('code', code, value => { setCode(value); clearFieldError('code'); }, true)}{fieldError('code')}
          {button(text('verify'), () => void action(async () => {
            if (!validate('verify')) return;
            const value: Session = await request('auth/verify', {challengeId: challenge.challengeId, code});
            if (repo && repo.ownerId !== value.ownerId) throw new Error('REAUTH_SAME_ACCOUNT_REQUIRED');
            await activate(value); setChallenge(null); setCode('');
          }))}</>}
        {busy && <Text accessibilityLiveRegion="polite" style={styles.body}>{text('authWorking')}</Text>}
        {message && <Text accessibilityRole="alert" style={styles.notice}>{text(message)}</Text>}
      </View>}
      {repo && <>

        <Text accessibilityRole="header" style={styles.heading}>{text(navLabels[section])}</Text>
        {(failed || reauth) && section !== 'more' && button(text('reviewSync'), () => router.replace('/more'), true)}
        <View style={styles.status}><Text style={styles.label}>{text(syncing ? 'syncing' : failed ? 'attention' : pending.length ? 'pending' : 'synced')}</Text></View>
        {section === 'farm' && <FarmManager />}
        {section === 'home' && <>
          <FarmPicker />
          {farm?.data.kind === 'farm' ? <View style={styles.card}><Text style={styles.heading}>{farm.data.name}</Text><Text style={styles.body}>{displayArea(farm.data.areaM2)}</Text>{button(text('manageFarm'), () => router.replace('/farm'), true)}</View> : button(text('addFarm'), () => router.replace('/farm'))}
        </>}
        {section === 'home' && task?.data.kind === 'task' && <View style={styles.card}><Text style={styles.heading}>{text('fixtureTask')}</Text><Text style={styles.body}>{text(task.data.done ? 'yes' : 'no')}</Text>
          <Text accessibilityLiveRegion="polite" style={styles.label}>{text(pending.some(item => item.record_id === task.id && item.failure) ? 'attention' : pending.some(item => item.record_id === task.id) ? 'pending' : 'synced')}</Text>
          {button(text(task.data.done ? 'reopen' : 'complete'), () => void action(() => { if (task.data.kind === 'task') repo.save(task.id, {...task.data, done: !task.data.done}); setMessage('saved'); void sync(); }))}</View>}
        {section === 'crops' && <View style={styles.card}><Text style={styles.heading}>{text('guide')}</Text><Text style={styles.body}>{text('guideBody')}</Text></View>}
        {(section === 'tools' || section === 'markets') && <View style={styles.card}><Text style={styles.heading}>{text('notAvailable')}</Text><Text style={styles.body}>{text(section === 'tools' ? 'toolsPending' : 'marketsPending')}</Text></View>}
        {section === 'more' && <>
        <View style={styles.card}><Text style={styles.heading}>{text('areaUnits')}</Text><Text style={styles.body}>{text('unitHelp')}</Text>
          {areaUnits.map(unit => <Pressable key={unit} accessibilityRole="radio" accessibilityState={{checked: unit === areaUnit, disabled: busy}} disabled={busy} onPress={() => void action(() => changeAreaUnit(unit))} style={[styles.language, unit === areaUnit && styles.selected]}><Text style={styles.label}>{text(unit)}{unit === areaUnit ? ' ✓' : ''}</Text></Pressable>)}
        </View>
        {conflict && <View style={styles.card}><Text style={styles.heading}>{text('attention')}</Text><Text style={styles.body}>{text(conflict.status === 'conflict' && !conflict.record?.deleted ? 'conflict' : 'syncRejected')}</Text>
          {conflict.code === 'PLOT_AREA_EXCEEDS_FARM' && <Text style={styles.body}>{text('plotAreaExceedsFarm')}</Text>}
          {conflict.record && (conflict.record.data.kind === 'farm' || conflict.record.data.kind === 'plot') && <Text style={styles.body}>{text('areaConflictHelp')}</Text>}
          <Text selectable style={styles.body}>{text('mine')}: {describe(repo.get(failed!.record_id)?.data)}</Text><Text selectable style={styles.body}>{text('server')}: {describe(conflict.record?.data)}</Text>
          {conflict.status === 'conflict' && conflict.record && !conflict.record.deleted && <>{button(text('keepMine'), () => void action(() => { repo.resolve(failed!.record_id, 'mine'); void sync(); }))}{button(text('useServer'), () => void action(() => { repo.resolve(failed!.record_id, 'server'); void sync(); }), true)}</>}
        </View>}
        <View style={styles.card}>
          {pending.length > 0 && <Text accessibilityLiveRegion="polite" style={styles.label}>{text(failed ? 'attention' : 'pending')}</Text>}
          <Pressable accessibilityRole="button" accessibilityState={{disabled: busy || syncing, busy: syncing}} disabled={busy || syncing} onPress={() => void sync()} style={({pressed}) => [styles.button, styles.secondary, (busy || syncing) && styles.disabled, pressed && controls.pressed]}><Text style={[styles.buttonText, styles.secondaryText]}>{text(syncing ? 'syncing' : 'retry')}</Text></Pressable>
          {syncFeedback && <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.body}>{text(syncFeedback)}</Text>}
          <Text style={styles.body}>{text('lastSync')}: {repo.meta('lastSync') ? new Date(repo.meta('lastSync')!).toLocaleString(language === 'sw' ? 'sw-KE' : 'en-KE', {year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'}) : text('never')}</Text>
        </View><Text style={styles.body}>{text('noBackup')}</Text>
        <View style={styles.card}><Text style={styles.heading}>{text('accountSecurity')}</Text>
          <Text style={styles.body}>{text('passwordHelp')}</Text>
          {message && <Text accessibilityRole="alert" style={styles.notice}>{text(message)}</Text>}
          <Text style={styles.label}>{text('newPassword')}</Text>
          <TextInput accessibilityLabel={text('newPassword')} secureTextEntry autoCapitalize="none" autoCorrect={false} editable={!busy} value={newPassword} onChangeText={setNewPassword} maxLength={128} style={styles.input} />
          {button(text('savePassword'), () => void action(async () => {
            if (newPassword.length < 15) { setMessage('passwordLength'); return; }
            const entered = newPassword; setNewPassword(''); await setPassword(entered);
          }))}
        </View>
        {button(text('signOut'), () => void action(signOut), true)}
        </>}
      </>}
    </>}
  </ScrollView>
    {repo && !loading && <View style={styles.navigation} accessibilityRole="tablist">
      {sections.map(item => {
        const selected = section === item;
        return <Pressable key={item} accessibilityRole="tab" accessibilityLabel={text(navLabels[item])} accessibilityState={{selected}}
          onPress={() => router.replace(routes[item])}
          style={({pressed}) => [styles.navItem, (fontScale > 1.3 || width < 420) && styles.largeNavItem, selected && styles.navSelected, pressed && styles.navPressed]}>

          <Text style={[styles.navLabel, selected && styles.navActive]}>{text(navLabels[item])}</Text>
        </Pressable>;
      })}
    </View>}
  </SafeAreaView>;
}
const makeStyles = (colors: Colors, controls: ReturnType<typeof makeControls>) => StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.background}, container: {padding: space.lg, gap: space.lg, maxWidth: layout.content, width: '100%', alignSelf: 'center'},
  wordmark: {fontSize: type.lead, lineHeight: line.lead, fontWeight: '700', color: colors.accent},
  brand: {fontSize: type.title, fontWeight: '800', color: colors.textPrimary}, subtitle: {fontSize: type.lead, color: colors.textSecondary},
  scroll: {flex: 1},
  navigation: {flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: space.xs, paddingTop: space.sm, paddingBottom: space.xs, backgroundColor: colors.surface, borderTopWidth: border.hairline, borderColor: colors.border},
  navItem: {flexBasis: '16.666%', flexGrow: 1, minHeight: layout.target, alignItems: 'center', justifyContent: 'center', paddingVertical: space.sm, paddingHorizontal: space.xs, borderRadius: radius.button, gap: space.xs},
  largeNavItem: {flexBasis: '33.333%'},
  navSelected: {backgroundColor: colors.accentSoft}, navPressed: {opacity: feedback.pressed},
  navIcon: {fontSize: type.heading, lineHeight: line.lead, color: colors.textSecondary},
  navLabel: {fontSize: type.body, lineHeight: line.body, fontWeight: '600', textAlign: 'center', color: colors.textSecondary},
  navActive: {color: colors.accent, fontWeight: '800'},
  languages: {flexDirection: 'row', gap: space.md, flexWrap: 'wrap'}, language: controls.choice, selected: controls.selected,
  preview: {gap: space.sm}, previewText: {fontSize: type.caption, lineHeight: line.caption, color: colors.warning}, previewToggle: {minHeight: layout.target, justifyContent: 'center', gap: space.sm},
  notice: {backgroundColor: colors.warningSurface, color: colors.warning, padding: space.lg, borderRadius: radius.button, fontSize: type.body, lineHeight: line.body},
  card: {padding: space.xl, borderRadius: radius.card, backgroundColor: colors.surface, gap: space.lg, borderWidth: border.hairline, borderColor: colors.border},
  heading: {fontSize: type.heading, fontWeight: '700', color: colors.textPrimary}, body: {fontSize: type.body, lineHeight: line.body, color: colors.textSecondary},
  label: {fontSize: type.body, fontWeight: '600', color: colors.textPrimary}, field: {gap: space.sm},
  fieldError: {color: colors.danger, fontSize: type.body, lineHeight: line.body},
  input: controls.input,
  button: controls.button, buttonText: controls.buttonText,
  secondary: controls.secondary, secondaryText: controls.secondaryText, disabled: controls.disabled, status: {gap: space.sm},
});
