import { WaterSourceManager } from './water-source-manager';
import { Button } from './ui';
import { usePalette, space, type, line, radius, border, type Colors } from './design-tokens';
import { DetailSection } from './detail-section';
import { WaterStorageManager } from './water-storage-manager';
import { makeControls } from './control-styles';
import { PlotManager } from './plot-manager';
import { AreaEditor } from './area-editor';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { areaToSquareMetres } from '../../../packages/domain';
import { useApp } from './app-state';
export function FarmPicker() {
 const colors = usePalette(); const controls = makeControls(colors); const styles = makeStyles(colors, controls);

  const {repo, selectFarm, text, busy, action} = useApp();
  const selected = repo?.selectedFarm(); const farms = repo?.farms() ?? [];
  return <View style={styles.card}><Text style={styles.heading}>{text('myFarms')}</Text>
    {farms.map(farm => farm.data.kind === 'farm' && <Pressable key={farm.id} disabled={busy} accessibilityRole="radio" accessibilityLabel={farm.data.name} accessibilityState={{checked: farm.id === selected?.id, disabled: busy}}
      onPress={() => void action(() => selectFarm(farm.id))} style={({pressed}) => [styles.choice, farm.id === selected?.id && styles.selected, pressed && controls.pressed]}>
      <Text style={styles.label}>{farm.id === selected?.id ? '●  ' : '○  '}{farm.data.name}</Text>
    </Pressable>)}
    {!farms.length && <Text style={styles.body}>{text('noFarm')}</Text>}
  </View>;
}
export function FarmManager() {
 const colors = usePalette(); const controls = makeControls(colors); const styles = makeStyles(colors, controls);

  const {repo, busy, text, action, displayArea, farmName, setFarmName, area, draftUnit, changeDraftArea, createFarm, sync, setMessage} = useApp();
  const [areaEditing, setAreaEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState<'farmNameInvalid' | 'invalidArea' | null>(null);
  const farm = repo?.selectedFarm();
  if (!repo) return null;
  const field = (label: string, value: string, onChangeText: (value: string) => void, numeric = false) => <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput style={styles.input} accessibilityLabel={label} editable={!busy} value={value} onChangeText={onChangeText} maxLength={numeric ? 30 : 100} keyboardType={numeric ? 'decimal-pad' : 'default'} /></View>;
  const button = (label: string, press: () => void, secondary = false) => <Button label={label} onPress={press} secondary={secondary} disabled={busy} />;
  return <>
    <View style={styles.card}>
      {button(text('addFarm'), () => {setAdding(true); setEditing(null); setAreaEditing(null); setError(null);}, adding || editing !== null || areaEditing !== null)}
      {farm?.data.kind === 'farm' && button(text('renameFarm'), () => {
        setAdding(false); setEditing(farm.id); setAreaEditing(null);
        if (farm.data.kind === 'farm') setName(repo.meta('draftName:' + farm.id) || farm.data.name);
        setError(null);
      }, true)}
      {farm && button(text('changeArea'), () => {setAreaEditing(farm.id); setAdding(false); setEditing(null);}, true)}
    </View>
    {areaEditing === farm?.id && <AreaEditor key={farm.id} farmId={farm.id} onClose={() => setAreaEditing(null)} />}
    {editing === farm?.id && <View style={styles.card}>
      {field(text('farmName'), name, value => {repo.setMeta('draftName:' + editing, value); setName(value); setError(null);})}
      {error && <Text accessibilityRole="alert" style={styles.error}>{text(error)}</Text>}
      {button(text('saveChanges'), () => void action(() => {
        if (!name.trim()) {setError('farmNameInvalid'); return;}
        repo.renameFarm(editing!, name); repo.setMeta('draftName:' + editing, ''); setEditing(null); setMessage('saved'); void sync();
      }))}
      {button(text('cancel'), () => {setEditing(null); setError(null);}, true)}
    </View>}
    {(!farm || adding) ? <View style={styles.card}><Text style={styles.heading}>{text('addFarm')}</Text>
      {field(text('farmName'), farmName, value => {repo.setMeta('draftFarmName', value); setFarmName(value); setError(null);})}
      {field(text('areaOptional') + ' · ' + text(draftUnit), area, value => {changeDraftArea(value); setError(null);}, true)}
      {error && <Text accessibilityRole="alert" style={styles.error}>{text(error)}</Text>}
      {button(text('createFarm'), () => void action(() => {
        if (!farmName.trim()) {setError('farmNameInvalid'); return;}
        const value = area.trim() ? Number(area) : null;
        const areaM2 = value === null ? null : Number.isFinite(value) && value > 0 ? areaToSquareMetres(value, draftUnit) : NaN;
        if (areaM2 !== null && (!Number.isFinite(areaM2) || areaM2 > 1e9)) {setError('invalidArea'); return;}
        createFarm(areaM2); setAdding(false); setError(null);
      }))}
      {farm && button(text('cancel'), () => {setAdding(false); setError(null);}, true)}
    </View> : null}
    {!adding && <FarmPicker />}
    {!adding && editing !== farm?.id && farm?.data.kind === 'farm' && <View style={styles.card}><Text style={styles.heading}>{farm.data.name}</Text>
      <Text style={styles.label}>{text('currentArea')}</Text><Text style={styles.body}>{displayArea(farm.data.areaM2)}</Text>
      <Text style={styles.body}>{text('locationMissing')}</Text>
      <Text style={styles.label}>{text(repo.pending().some(row => row.record_id === farm.id && row.failure) ? 'attention' : repo.pending().some(row => row.record_id === farm.id) ? 'pending' : 'synced')}</Text>

      <DetailSection key={farm.id + ':history'} title={text('areaHistory')}>
      {farm.data.areaHistory ? [...farm.data.areaHistory].reverse().map(revision => <View key={revision.id} style={styles.field}>
        <Text style={styles.label}>{revision.effectiveDate ?? text('dateUnknown')} · {text(revision.reason)}</Text>
        <Text style={styles.body}>{displayArea(revision.areaM2)}</Text>
      </View>) : <Text style={styles.body}>{text('noAreaHistory')}</Text>}
      </DetailSection>
    </View>}
    {!adding && farm && <PlotManager key={farm.id} farmId={farm.id} />}
    {!adding && farm && <WaterSourceManager key={farm.id + ":sources"} farmId={farm.id} />}
    {!adding && farm && <WaterStorageManager key={farm.id + ":storage"} farmId={farm.id} />}


  </>;
}
const makeStyles = (colors: Colors, controls: ReturnType<typeof makeControls>) => StyleSheet.create({
  card: {padding: space.xl, borderRadius: radius.card, backgroundColor: colors.surface, gap: space.lg, borderWidth: border.hairline, borderColor: colors.border},
  heading: {fontSize: type.heading, fontWeight: '700', color: colors.textPrimary}, label: {fontSize: type.body, fontWeight: '600', color: colors.textPrimary},
  body: {fontSize: type.body, lineHeight: line.body, color: colors.textSecondary}, field: {gap: space.sm},
  input: controls.input,
  choice: controls.choice, selected: controls.selected,
  button: controls.button, buttonText: controls.buttonText, secondary: controls.secondary,
  error: {fontSize: type.body, lineHeight: line.body, color: colors.danger},
});
