import { Button } from './ui';
import { usePalette, space, type, line, border } from './design-tokens';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { calendarDateSchema, waterSources, waterReliability, type WaterObservationData } from '../../../packages/contracts';
import { todayInKenya } from '../../../packages/domain/land';
import { useApp } from './app-state';
import { makeControls } from './control-styles';

type Draft = Pick<WaterObservationData, 'observedDate' | 'sourceKnowledge' | 'sources' | 'reliability' | 'shortageNotes' | 'sourceNotes'>;
export function WaterObservations({farmId, plotId, embedded=false}: {farmId: string; plotId: string; embedded?: boolean}) {
 const colors = usePalette(); const controls = makeControls(colors);

 const {repo, text, busy, action, sync, setMessage} = useApp();
 const [open,setOpen] = useState(false); const [error,setError] = useState<'date' | 'sources' | null>(null);
 const key = 'draftWater:' + plotId;
 const [draft,setDraft] = useState<Draft>(() => {
   try {const saved = JSON.parse(repo!.meta(key) ?? 'null'); if (saved && ['unknown','none','known'].includes(saved.sourceKnowledge) && Array.isArray(saved.sources) && saved.sources.every((v:any)=>waterSources.includes(v)) && waterReliability.includes(saved.reliability) && ['observedDate','shortageNotes','sourceNotes'].every(k=>typeof saved[k] === 'string')) return saved;} catch {}
   const initial: Draft = {observedDate: todayInKenya(), sourceKnowledge:'unknown', sources:[], reliability:'unknown', sourceNotes:'', shortageNotes:''}; return initial;
 });
 const update = (values: Partial<Draft>) => {const next = {...draft,...values}; try {repo!.setMeta(key,JSON.stringify(next)); setDraft(next);setError(null);} catch {setMessage('error');}};
 const button = (label:string,fn:()=>void,secondary=false) => <Button label={label} onPress={fn} secondary={secondary} disabled={busy} />;
 const labelStyle = {fontSize:type.body,fontWeight:'600' as const,color:colors.textPrimary};
 const bodyStyle = {fontSize:type.body,lineHeight:line.body,color:colors.textSecondary};
 return <View style={{gap:space.lg,paddingTop:space.xl,borderTopWidth:border.hairline,borderColor:colors.border}}>
   {!embedded && <Text style={{...labelStyle,fontSize:type.heading}}>{text('waterObservations')}</Text>}
   {!open && button(text('addWaterObservation'),()=>setOpen(true),true)}
   {open && <View style={{gap:space.lg}}>
     <Text style={bodyStyle}>{text('waterHelp')}</Text>
     <Text style={labelStyle}>{text('observationDate')}</Text>
     <TextInput style={controls.input} accessibilityLabel={text('observationDate')} editable={!busy} value={draft.observedDate} onChangeText={observedDate=>update({observedDate})} placeholder="YYYY-MM-DD" maxLength={10}/>
     <Text style={labelStyle}>{text('waterKnowledge')}</Text>
     {(['unknown','none','known'] as const).map(sourceKnowledge=><Pressable key={sourceKnowledge} accessibilityRole="radio" accessibilityState={{checked:draft.sourceKnowledge===sourceKnowledge,disabled:busy}} disabled={busy} onPress={()=>update({sourceKnowledge,sources:sourceKnowledge==='known'?draft.sources:[],reliability:'unknown'})} style={({pressed})=>[controls.choice,draft.sourceKnowledge===sourceKnowledge&&controls.selected,pressed&&controls.pressed]}><Text style={labelStyle}>{draft.sourceKnowledge===sourceKnowledge?'●  ':'○  '}{text(sourceKnowledge)}</Text></Pressable>)}
     {draft.sourceKnowledge==='known' && <View style={{gap:space.md}}><Text style={labelStyle}>{text('waterSourceLabel')}</Text>{waterSources.map(source=><Pressable key={source} accessibilityRole="checkbox" accessibilityState={{checked:draft.sources.includes(source),disabled:busy}} disabled={busy} onPress={()=>update({sources:draft.sources.includes(source)?draft.sources.filter(v=>v!==source):[...draft.sources,source]})} style={({pressed})=>[controls.choice,draft.sources.includes(source)&&controls.selected,pressed&&controls.pressed]}><Text style={labelStyle}>{draft.sources.includes(source)?'☑  ':'☐  '}{text(source)}</Text></Pressable>)}</View>}
     {draft.sourceKnowledge==='known' && <View style={{gap:space.md}}><Text style={labelStyle}>{text('reliabilityLabel')}</Text>
     {waterReliability.map(reliability=><Pressable key={reliability} accessibilityRole="radio" accessibilityLabel={text('reliabilityLabel')+': '+text(reliability)} accessibilityState={{checked:draft.reliability===reliability,disabled:busy}} disabled={busy} onPress={()=>update({reliability})} style={({pressed})=>[controls.choice,draft.reliability===reliability&&controls.selected,pressed&&controls.pressed]}><Text style={labelStyle}>{draft.reliability===reliability?'●  ':'○  '}{text(reliability)}</Text></Pressable>)}</View>}
     {(['sourceNotes','shortageNotes'] as const).map(field=><View key={field} style={{gap:space.sm}}><Text style={labelStyle}>{text(field)}</Text><TextInput style={[controls.input,{minHeight:90,textAlignVertical:'top'}]} accessibilityLabel={text(field)} editable={!busy} multiline maxLength={500} value={draft[field]} onChangeText={value=>update({[field]:value})}/></View>)}
     {error && <Text accessibilityRole="alert" style={{color:colors.danger,fontSize:type.body}}>{text(error==='date'?'observationDateInvalid':'waterSourceRequired')}</Text>}
     {button(text('saveChanges'),()=>void action(()=>{
       if(!calendarDateSchema.safeParse(draft.observedDate).success||draft.observedDate>todayInKenya()){setError('date');return;}
       if(draft.sourceKnowledge==='known'&&!draft.sources.length){setError('sources');return;}
       repo!.recordWater(farmId,plotId,draft);repo!.setMeta(key,'');setOpen(false);setDraft({observedDate:todayInKenya(),sourceKnowledge:'unknown',sources:[],reliability:'unknown',shortageNotes:'',sourceNotes:''});setMessage('saved');void sync();
     }))}
     {button(text('cancel'),()=>setOpen(false),true)}
   </View>}
   <Text style={bodyStyle}>{text('waterSelfReported')}</Text>
   {repo!.waterObservations(plotId).map(record=><View key={record.id} style={{gap:space.sm,paddingVertical:space.md}}>
     <Text style={labelStyle}>{record.data.observedDate} · {record.data.sourceKnowledge==='known'?record.data.sources.map(source=>text(source)).join(', '):text(record.data.sourceKnowledge)}</Text>
     {!!record.data.sourceNotes && <Text style={bodyStyle}>{text('sourceNotes')}: {record.data.sourceNotes}</Text>}
     {!!record.data.shortageNotes && <Text style={bodyStyle}>{text('shortageNotes')}: {record.data.shortageNotes}</Text>}
     <Text style={bodyStyle}>{text('reliabilityLabel')}: {text(record.data.reliability)}</Text>
     <Text style={labelStyle}>{text(repo!.pending().some(r=>r.record_id===record.id&&r.failure)?'attention':repo!.pending().some(r=>r.record_id===record.id)?'pending':'synced')}</Text>
   </View>)}
   {!repo!.waterObservations(plotId).length && <Text style={bodyStyle}>{text('noWaterObservations')}</Text>}
 </View>;
}
