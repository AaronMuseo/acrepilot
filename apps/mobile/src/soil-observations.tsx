import { Button } from './ui';
import { usePalette, space, type, line, border } from './design-tokens';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { calendarDateSchema, soilTypes, type ConditionData } from '../../../packages/contracts';
import { todayInKenya } from '../../../packages/domain/land';
import { useApp } from './app-state';
import { makeControls } from './control-styles';

type Draft = Pick<ConditionData, 'observedDate' | 'soilType' | 'textureNotes' | 'fertilityNotes' | 'copiedFrom'>;
export function SoilObservations({farmId, plotId, embedded=false}: {farmId: string; plotId: string; embedded?: boolean}) {
 const colors = usePalette(); const controls = makeControls(colors);

 const {repo, text, busy, action, sync, setMessage} = useApp();
 const [choosing,setChoosing]=useState(false);
 const [open,setOpen] = useState(false); const [error,setError] = useState(false);
 const key = 'draftSoil:' + plotId;
 const [draft,setDraft] = useState<Draft>(() => {
   try {const saved = JSON.parse(repo!.meta(key) ?? 'null'); if (saved && soilTypes.includes(saved.soilType) && ['observedDate','textureNotes','fertilityNotes'].every(k=>typeof saved[k] === 'string')) return saved;} catch {}
   return {observedDate: todayInKenya(), soilType:'unknown', textureNotes:'', fertilityNotes:''};
 });
 const update = (values: Partial<Draft>) => {const next = {...draft,...values}; try {repo!.setMeta(key,JSON.stringify(next)); setDraft(next);setError(false);} catch {setMessage('error');}};
 const button = (label:string,fn:()=>void,secondary=false) => <Button label={label} onPress={fn} secondary={secondary} disabled={busy} />;
 const labelStyle = {fontSize:type.body,fontWeight:'600' as const,color:colors.textPrimary};
 const bodyStyle = {fontSize:type.body,lineHeight:line.body,color:colors.textSecondary};
 const sources=repo!.plots(farmId).filter(plot=>plot.id!==plotId).flatMap(plot=>repo!.conditions(plot.id).map(record=>({plot,record})));
 const sourceLabel=(id:string)=>{const record=repo!.get(id);if(record?.data.kind!=='condition')return text('unknown');const plot=repo!.get(record.data.plotId);return (plot?.data.kind==='plot'?plot.data.name??text('defaultPlot'):text('unknown'))+' · '+record.data.observedDate;};
 return <View style={{gap:space.lg,paddingTop:space.xl,borderTopWidth:border.hairline,borderColor:colors.border}}>
   {!embedded && <Text style={{...labelStyle,fontSize:type.heading}}>{text('soilObservations')}</Text>}
   {!open && button(text('addSoilObservation'),()=>setOpen(true),true)}
   {button(text('copySoil'),()=>setChoosing(value=>!value),true)}
   {choosing&&<View style={{gap:space.md}}><Text style={bodyStyle}>{text('copySoilHelp')}</Text>
    {sources.map(({plot,record})=><View key={record.id}>{button((plot.data.kind==='plot'?plot.data.name??text('defaultPlot'):text('unknown'))+' · '+record.data.observedDate+' · '+text(record.data.soilType),()=>{
      const next:Draft={observedDate:todayInKenya(),soilType:record.data.soilType,textureNotes:record.data.textureNotes,fertilityNotes:record.data.fertilityNotes,copiedFrom:record.id};
      try{repo!.setMeta(key,JSON.stringify(next));setDraft(next);setError(false);setOpen(true);setChoosing(false);}catch{setMessage('error');}
    },true)}</View>)}
    {!sources.length&&<Text style={bodyStyle}>{text('noSoilCopySources')}</Text>}
    {button(text('cancel'),()=>setChoosing(false),true)}
   </View>}
   {open && <View style={{gap:space.lg}}>
     <Text style={bodyStyle}>{text('observationHelp')}</Text>
     {draft.copiedFrom&&<View style={{gap:space.sm}}><Text style={bodyStyle}>{text('copiedSoil')} · {text('copiedFrom')}: {sourceLabel(draft.copiedFrom)}</Text>{button(text('stopCopy'),()=>{const next:Draft={observedDate:todayInKenya(),soilType:'unknown',textureNotes:'',fertilityNotes:''};try{repo!.setMeta(key,JSON.stringify(next));setDraft(next);setError(false);}catch{setMessage('error');}},true)}</View>}
     <Text style={labelStyle}>{text(draft.copiedFrom?'copyRecordedOn':'observationDate')}</Text>
     <TextInput style={controls.input} accessibilityLabel={text(draft.copiedFrom?'copyRecordedOn':'observationDate')} editable={!busy} value={draft.observedDate} onChangeText={observedDate=>update({observedDate})} placeholder="YYYY-MM-DD" maxLength={10}/>
     <Text style={labelStyle}>{text('soilType')}</Text>
     {soilTypes.map(soilType=><Pressable key={soilType} accessibilityRole="radio" accessibilityState={{checked:draft.soilType===soilType,disabled:busy}} disabled={busy} onPress={()=>update({soilType})} style={({pressed})=>[controls.choice,draft.soilType===soilType&&controls.selected,pressed&&controls.pressed]}><Text style={labelStyle}>{draft.soilType===soilType?'●  ':'○  '}{text(soilType)}</Text></Pressable>)}
     {(['textureNotes','fertilityNotes'] as const).map(field=><View key={field} style={{gap:space.sm}}><Text style={labelStyle}>{text(field)}</Text><TextInput style={[controls.input,{minHeight:90,textAlignVertical:'top'}]} accessibilityLabel={text(field)} editable={!busy} multiline maxLength={500} value={draft[field]} onChangeText={value=>update({[field]:value})}/></View>)}
     {error && <Text accessibilityRole="alert" style={{color:colors.danger,fontSize:type.body}}>{text('observationDateInvalid')}</Text>}
     {button(text('saveChanges'),()=>void action(()=>{
       if(!calendarDateSchema.safeParse(draft.observedDate).success||draft.observedDate>todayInKenya()){setError(true);return;}
       repo!.recordSoil(farmId,plotId,draft);repo!.setMeta(key,'');setOpen(false);setDraft({observedDate:todayInKenya(),soilType:'unknown',textureNotes:'',fertilityNotes:''});setMessage('saved');void sync();
     }))}
     {button(text('cancel'),()=>setOpen(false),true)}
   </View>}
   <Text style={bodyStyle}>{text('selfReported')}</Text>
   {repo!.conditions(plotId).map(record=><View key={record.id} style={{gap:space.sm,paddingVertical:space.md}}>
     <Text style={labelStyle}>{record.data.observedDate} · {text(record.data.soilType)}</Text>
     {record.data.copiedFrom&&<Text style={bodyStyle}>{text('copiedSoil')} · {text('copiedFrom')}: {sourceLabel(record.data.copiedFrom)}</Text>}
     {!!record.data.textureNotes && <Text style={bodyStyle}>{text('textureNotes')}: {record.data.textureNotes}</Text>}
     {!!record.data.fertilityNotes && <Text style={bodyStyle}>{text('fertilityNotes')}: {record.data.fertilityNotes}</Text>}
     <Text style={labelStyle}>{text(repo!.pending().some(r=>r.record_id===record.id&&r.failure)?'attention':repo!.pending().some(r=>r.record_id===record.id)?'pending':'synced')}</Text>
   </View>)}
   {!repo!.conditions(plotId).length && <Text style={bodyStyle}>{text('noSoilObservations')}</Text>}
 </View>;
}
