import { usePalette, space, type, line, radius, border, type Colors } from './design-tokens';
import { makeControls } from './control-styles';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { areaToSquareMetres, squareMetresToArea, validAreaUnit, type AreaUnit } from '../../../packages/domain';
import { todayInKenya } from '../../../packages/domain/land';
import type { MessageKey } from '../../../packages/translations';
import { useApp } from './app-state';
type Draft = {amount: string; unit: AreaUnit; effectiveDate: string; reason: 'correction' | 'expansion' | 'reduction'};
const reasons = ['correction', 'expansion', 'reduction'] as const;
export function AreaEditor({farmId, plotId, onClose}: {farmId: string; plotId?: string; onClose: () => void}) {
 const colors = usePalette(); const controls = makeControls(colors); const styles = makeStyles(colors, controls);

  const {repo, areaUnit, busy, text, action, sync, setMessage, displayArea} = useApp();
  const recordId = plotId ?? farmId;
  const farm = plotId ? repo!.plots(farmId).find(r => r.id === plotId)! : repo!.get(farmId)!;
  const [draft, setDraft] = useState<Draft>(() => {
    const saved = repo!.meta('draftAreaRevision:' + recordId);
    if (saved) {
      try { const value = JSON.parse(saved); if (typeof value.amount === 'string' && typeof value.effectiveDate === 'string' && reasons.includes(value.reason)) return {...value, unit: validAreaUnit(value.unit)}; } catch { /* Retain malformed metadata; offer a fresh form. */ }
    }
    return {amount: (farm.data.kind === 'farm' || farm.data.kind === 'plot') && farm.data.areaM2 !== null ? String(squareMetresToArea(farm.data.areaM2, areaUnit)) : '', unit: areaUnit, effectiveDate: todayInKenya(), reason: 'correction'};
  });
  const [error, setError] = useState<MessageKey | null>(null);
  const update = (value: Partial<Draft>) => {
    const next = {...draft, ...value};
    try {repo!.setMeta('draftAreaRevision:' + recordId, JSON.stringify(next)); setDraft(next); setError(null);} catch {setError('error');}
  };
  const save = () => void action(() => {
    const value = Number(draft.amount);
    if (!draft.amount.trim() || !Number.isFinite(value) || value <= 0) {setError('requiredArea'); return;}
    const area = areaToSquareMetres(value, draft.unit);
    if (area > 1e9) {setError('invalidArea'); return;}
    try {
      if (plotId) repo!.revisePlotArea(farmId, plotId, area, draft.effectiveDate, draft.reason);
      else repo!.reviseFarmArea(farmId, area, draft.effectiveDate, draft.reason);
      repo!.setMeta('draftAreaRevision:' + recordId, ''); setMessage('saved'); onClose(); void sync();
    } catch (error) {
      const errors: Record<string, MessageKey> = {PLOT_AREA_EXCEEDS_FARM: 'plotAreaExceedsFarm', AREA_DATE_INVALID: 'areaDateInvalid', AREA_REASON_INVALID: 'areaReasonInvalid', AREA_UNCHANGED: 'areaUnchanged'};
      setError(errors[error instanceof Error ? error.message : ''] ?? 'error');
    }
  });
  return <View style={styles.card}>
    <Text style={styles.heading}>{text(plotId ? 'changePlotArea' : 'changeArea')}</Text>
    <Text style={styles.body}>{text('currentArea')}: {(farm.data.kind === 'farm' || farm.data.kind === 'plot') ? displayArea(farm.data.areaM2) : text('unknown')}</Text>
    <Text style={styles.label}>{text('newArea')} · {text(draft.unit)}</Text>
    <TextInput accessibilityLabel={text('newArea') + ' ' + text(draft.unit)} editable={!busy} style={styles.input} value={draft.amount} onChangeText={amount => update({amount})} keyboardType="decimal-pad" maxLength={30} />
    <Text style={styles.label}>{text('effectiveDate')}</Text>
    <TextInput accessibilityLabel={text('effectiveDate')} editable={!busy} style={styles.input} value={draft.effectiveDate} onChangeText={effectiveDate => update({effectiveDate})} placeholder="YYYY-MM-DD" autoCapitalize="none" maxLength={10} />
    <Text style={styles.body}>{text('areaDateHelp')}</Text>
    <Text style={styles.label}>{text('changeReason')}</Text>
    {reasons.map(reason => <Pressable key={reason} accessibilityRole="radio" accessibilityState={{checked: draft.reason === reason, disabled: busy}} disabled={busy} onPress={() => update({reason})} style={({pressed}) => [styles.choice, draft.reason === reason && styles.selected, pressed && controls.pressed]}><Text style={styles.label}>{draft.reason === reason ? '●  ' : '○  '}{text(reason)}</Text></Pressable>)}
    {error && <Text accessibilityRole="alert" style={styles.error}>{text(error)}</Text>}
    <Pressable accessibilityRole="button" disabled={busy} onPress={save} style={({pressed}) => [styles.button, busy && controls.disabled, pressed && controls.pressed]}><Text style={styles.buttonText}>{text('saveChanges')}</Text></Pressable>
    <Pressable accessibilityRole="button" disabled={busy} onPress={onClose} style={({pressed}) => [styles.button, controls.secondary, busy && controls.disabled, pressed && controls.pressed]}><Text style={[controls.buttonText, controls.secondaryText]}>{text('cancel')}</Text></Pressable>
  </View>;
}
const makeStyles = (colors: Colors, controls: ReturnType<typeof makeControls>) => StyleSheet.create({
  card: {padding: space.xl, borderRadius: radius.card, backgroundColor: colors.surface, gap: space.lg, borderWidth: border.hairline, borderColor: colors.border},
  heading: {fontSize: type.heading, fontWeight: '700', color: colors.textPrimary}, label: {fontSize: type.body, fontWeight: '600', color: colors.textPrimary}, body: {fontSize: type.body, lineHeight: line.body, color: colors.textSecondary},
  input: controls.input,
  choice: controls.choice, selected: controls.selected,
  button: controls.button, buttonText: controls.buttonText, error: {fontSize: type.body, color: colors.danger},
});
