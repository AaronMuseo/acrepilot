import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { areaToSquareMetres } from '../../../packages/domain';
import { useApp } from './app-state';
export function FarmPicker() {
  const {repo, selectFarm, text, busy, action} = useApp();
  const selected = repo?.selectedFarm(); const farms = repo?.farms() ?? [];
  return <View style={styles.card}><Text style={styles.heading}>{text('myFarms')}</Text>
    {farms.map(farm => farm.data.kind === 'farm' && <Pressable key={farm.id} disabled={busy} accessibilityRole="radio" accessibilityLabel={farm.data.name} accessibilityState={{checked: farm.id === selected?.id, disabled: busy}}
      onPress={() => void action(() => selectFarm(farm.id))} style={[styles.choice, farm.id === selected?.id && styles.selected]}>
      <Text style={styles.label}>{farm.data.name}{farm.id === selected?.id ? ' ✓' : ''}</Text>
    </Pressable>)}
    {!farms.length && <Text style={styles.body}>{text('noFarm')}</Text>}
  </View>;
}
export function FarmManager() {
  const {repo, busy, text, action, displayArea, farmName, setFarmName, area, draftUnit, changeDraftArea, createFarm, sync, setMessage} = useApp();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState<'farmNameInvalid' | 'invalidArea' | null>(null);
  const farm = repo?.selectedFarm();
  if (!repo) return null;
  const field = (label: string, value: string, onChangeText: (value: string) => void, numeric = false) => <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput style={styles.input} accessibilityLabel={label} editable={!busy} value={value} onChangeText={onChangeText} maxLength={numeric ? 30 : 100} keyboardType={numeric ? 'decimal-pad' : 'default'} /></View>;
  const button = (label: string, press: () => void, secondary = false) => <Pressable accessibilityRole="button" disabled={busy} accessibilityState={{disabled: busy}} onPress={press} style={[styles.button, secondary && styles.secondary, busy && {opacity: 0.5}]}><Text style={[styles.buttonText, secondary && styles.label]}>{label}</Text></Pressable>;
  return <>
    <FarmPicker />
    {farm?.data.kind === 'farm' && <View style={styles.card}><Text style={styles.heading}>{farm.data.name}</Text>
      <Text style={styles.label}>{text('defaultPlot')}</Text><Text style={styles.body}>{displayArea(farm.data.areaM2)}</Text>
      <Text style={styles.body}>{text('soil')}: {text('unknown')} · {text('water')}: {text('unknown')}</Text>
      <Text style={styles.body}>{text('locationMissing')}</Text>
      <Text style={styles.label}>{text(repo.pending().some(row => row.record_id === farm.id && row.failure) ? 'attention' : repo.pending().some(row => row.record_id === farm.id) ? 'pending' : 'synced')}</Text>
      {button(text('renameFarm'), () => { setAdding(false); setEditing(farm.id); if (farm.data.kind === 'farm') setName(repo.meta('draftName:' + farm.id) || farm.data.name); setError(null); }, true)}
      <Text style={styles.body}>{text('landHistoryPending')}</Text>
    </View>}
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
    </View> : button(text('addFarm'), () => {setAdding(true); setEditing(null); setError(null);})}
  </>;
}
const styles = StyleSheet.create({
  card: {padding: 20, borderRadius: 20, backgroundColor: '#fff', gap: 14, borderWidth: 1, borderColor: '#dbe2d9'},
  heading: {fontSize: 23, fontWeight: '700', color: '#183e2d'}, label: {fontSize: 16, fontWeight: '600', color: '#183e2d'},
  body: {fontSize: 17, lineHeight: 26, color: '#38473d'}, field: {gap: 8},
  input: {borderWidth: 1, borderColor: '#75877c', borderRadius: 10, padding: 14, minHeight: 52, fontSize: 18, color: '#172d20'},
  choice: {padding: 14, minHeight: 48, borderWidth: 1, borderColor: '#789083', borderRadius: 12}, selected: {backgroundColor: '#d8e8d9'},
  button: {minHeight: 50, padding: 14, backgroundColor: '#20563a', borderRadius: 12, alignItems: 'center'}, buttonText: {color: '#fff', fontSize: 17, fontWeight: '600'}, secondary: {backgroundColor: '#e3eadf'},
  error: {fontSize: 15, lineHeight: 22, color: '#9b2525'},
});
