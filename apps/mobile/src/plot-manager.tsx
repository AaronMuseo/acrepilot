import { IrrigationHistory } from './irrigation-history';
import { Button } from './ui';
import { usePalette, space, type, line, radius, border, type Colors } from './design-tokens';
import { DetailSection } from './detail-section';
import { PlotConditions } from './plot-conditions';
import { TenureHistory } from './tenure-history';
import { SoilTests } from './soil-tests';
import { WaterObservations } from './water-observations';
import { SoilObservations } from './soil-observations';
import { AreaEditor } from './area-editor';
import { makeControls } from './control-styles';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useApp } from './app-state';

export function PlotManager({farmId}: {farmId: string}) {
 const colors = usePalette(); const controls = makeControls(colors); const styles = makeStyles(colors, controls);

  const {repo, displayArea, text, busy, action, sync, setMessage} = useApp();
  const [areaEditing, setAreaEditing] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [invalid, setInvalid] = useState(false);
  if (!repo) return null;
  const plots = repo.plots(farmId); const selected = repo.selectedPlot(farmId);
  const draftKey = (id: string) => 'draftPlotName:' + farmId + ':' + id;
  const start = (id: string, initial = '') => {
    setAreaEditing(false); setEditing(id); setName(repo.meta(draftKey(id)) || initial); setInvalid(false);
  };
  const button = (label: string, onPress: () => void, secondary = false) => <Button label={label} onPress={onPress} secondary={secondary} disabled={busy} />;
  return <View style={styles.card}>
    <Text style={styles.heading}>{text('plots')}</Text>
    <Text style={styles.body}>{text('plotScope')}</Text>
    <Text style={styles.body}>{text('knownPlotArea')}: {displayArea(plots.reduce((sum, r) => sum + (r.data.kind === 'plot' ? r.data.areaM2 ?? 0 : 0), 0))}</Text>
    {button(text('addPlot'), () => start('new'), true)}
    {selected?.data.kind === 'plot' && button(text('renamePlot'), () => start(selected.id, selected.data.kind === 'plot' ? selected.data.name ?? text('defaultPlot') : ''), true)}
    {selected && button(text('changePlotArea'), () => {setEditing(null); setAreaEditing(true);}, true)}
    {areaEditing && selected && <AreaEditor key={selected.id} farmId={farmId} plotId={selected.id} onClose={() => setAreaEditing(false)} />}
    {editing !== null && <View style={styles.form}>
      <Text style={styles.label}>{text('plotName')}</Text>
      <TextInput accessibilityLabel={text('plotName')} style={styles.input} editable={!busy} maxLength={100} value={name}
        onChangeText={value => {try {repo.setMeta(draftKey(editing), value); setName(value); setInvalid(false);} catch {setMessage('error');}}} />
      {invalid && <Text accessibilityRole="alert" style={styles.error}>{text('plotNameInvalid')}</Text>}
      {button(text('saveChanges'), () => void action(() => {
        if (!name.trim()) {setInvalid(true); return;}
        if (editing === 'new') repo.createPlot(farmId, name);
        else repo.renamePlot(farmId, editing, name);
        repo.setMeta(draftKey(editing), ''); setEditing(null); setMessage('saved'); void sync();
      }))}
      {button(text('cancel'), () => setEditing(null), true)}
    </View>}
    {plots.map(plot => plot.data.kind === 'plot' && <Pressable key={plot.id} disabled={busy} accessibilityRole="radio"
      accessibilityState={{checked: selected?.id === plot.id, disabled: busy}} style={({pressed}) => [controls.choice, selected?.id === plot.id && styles.selected, pressed && controls.pressed]}
      onPress={() => void action(() => {repo.selectPlot(farmId, plot.id); setEditing(null); setAreaEditing(false);})}>
      <Text style={styles.label}>{selected?.id === plot.id ? '●  ' : '○  '}{plot.data.name ?? text('defaultPlot')}</Text>
    </Pressable>)}
    {selected?.data.kind === 'plot' && <View style={styles.form}>
      <Text style={styles.label}>{selected.data.name ?? text('defaultPlot')}</Text>
      <Text style={styles.body}>{selected.data.areaM2 === null ? text('plotAreaUnknown') : displayArea(selected.data.areaM2)}</Text>
      <DetailSection key={selected.id + ':history'} title={text('areaHistory')}>
      {selected.data.areaHistory ? [...selected.data.areaHistory].reverse().map(revision => <Text key={revision.id} style={styles.body}>{revision.effectiveDate ?? text('dateUnknown')} · {text(revision.reason)} · {displayArea(revision.areaM2)}</Text>) : <Text style={styles.body}>{text('noAreaHistory')}</Text>}
      </DetailSection>
      {selected.version > 0 && <Text style={styles.label}>{text(repo.pending().some(r => r.record_id === selected.id && r.failure) ? 'attention' : repo.pending().some(r => r.record_id === selected.id) ? 'pending' : 'synced')}</Text>}
      <DetailSection key={selected.id + ':plotConditions'} title={text('plotConditions')}><PlotConditions embedded key={selected.id + ":conditions"} farmId={farmId} plotId={selected.id} /></DetailSection>
      <DetailSection key={selected.id + ':soilObservations'} title={text('soilObservations')}><SoilObservations embedded key={selected.id} farmId={farmId} plotId={selected.id} /></DetailSection>
      <DetailSection key={selected.id + ':waterObservations'} title={text('waterObservations')}><WaterObservations embedded key={selected.id + ":water"} farmId={farmId} plotId={selected.id} /></DetailSection>
      <DetailSection key={selected.id + ':irrigation'} title={text('irrigation')}><IrrigationHistory farmId={farmId} plotId={selected.id}/></DetailSection>
      <DetailSection key={selected.id + ':soilTests'} title={text('soilTests')}><SoilTests embedded key={selected.id + ":tests"} farmId={farmId} plotId={selected.id} /></DetailSection>
      <DetailSection key={selected.id + ':tenure'} title={text('tenure')}><TenureHistory embedded key={selected.id + ":tenure"} farmId={farmId} plotId={selected.id} /></DetailSection>
    </View>}
  </View>;
}
const makeStyles = (colors: Colors, controls: ReturnType<typeof makeControls>) => StyleSheet.create({
  card: {padding: space.xl, borderRadius: radius.card, backgroundColor: colors.surface, gap: space.lg, borderWidth: border.hairline, borderColor: colors.border},
  heading: {fontSize: type.heading, fontWeight: '700', color: colors.textPrimary}, label: {fontSize: type.body, fontWeight: '600', color: colors.textPrimary},
  body: {fontSize: type.body, lineHeight: line.body, color: colors.textSecondary}, form: {gap: space.md},
  input: controls.input,
  button: controls.button, selected: controls.selected,
  error: {fontSize: type.body, color: colors.danger},
});
