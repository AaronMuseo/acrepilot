import { Button } from './ui';
import { usePalette, space, type, line, border } from './design-tokens';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { calendarDateSchema } from '../../../packages/contracts';
import { todayInKenya } from '../../../packages/domain/land';
import { useApp } from './app-state';
import { makeControls } from './control-styles';

type Draft = {observedDate:string; ph:string; reportReference:string};
const fresh = (): Draft => ({observedDate:todayInKenya(),ph:'',reportReference:''});
export function SoilTests({farmId,plotId,embedded=false}:{farmId:string;plotId:string;embedded?:boolean}) {
 const colors = usePalette(); const controls = makeControls(colors);

 const {repo,text,busy,action,sync,setMessage}=useApp();
 const [open,setOpen]=useState(false); const [error,setError]=useState<'date'|'ph'|null>(null);
 const key='draftSoilTest:'+plotId;
 const [draft,setDraft]=useState<Draft>(()=>{try{const saved=JSON.parse(repo!.meta(key)??'null');if(saved&&['observedDate','ph','reportReference'].every(k=>typeof saved[k]==='string'))return saved;}catch{}return fresh();});
 const update=(value:Partial<Draft>)=>{const next={...draft,...value};try{repo!.setMeta(key,JSON.stringify(next));setDraft(next);setError(null);}catch{setMessage('error');}};
 const label={fontSize:type.body,fontWeight:'600' as const,color:colors.textPrimary};const body={fontSize:type.body,lineHeight:line.body,color:colors.textSecondary};
 const button = (title: string, onPress: () => void, secondary = false) => <Button label={title} onPress={onPress} secondary={secondary} disabled={busy} />;
 return <View style={{gap:space.lg,paddingTop:space.xl,borderTopWidth:border.hairline,borderColor:colors.border}}>
  {!embedded && <Text style={{...label,fontSize:type.heading}}>{text('soilTests')}</Text>}
  {!open&&button(text('addSoilTest'),()=>setOpen(true),true)}
  {open&&<View style={{gap:space.lg}}>
   <Text style={body}>{text('soilTestHelp')}</Text>
   <Text style={label}>{text('testDate')}</Text><TextInput style={controls.input} accessibilityLabel={text('testDate')} value={draft.observedDate} editable={!busy} maxLength={10} placeholder="YYYY-MM-DD" onChangeText={observedDate=>update({observedDate})}/>
   <Text style={label}>{text('phLabel')}</Text><TextInput style={controls.input} accessibilityLabel={text('phLabel')} value={draft.ph} editable={!busy} keyboardType="decimal-pad" maxLength={12} onChangeText={ph=>update({ph})}/>
   <Text style={label}>{text('reportReference')}</Text><TextInput style={controls.input} accessibilityLabel={text('reportReference')} value={draft.reportReference} editable={!busy} maxLength={200} onChangeText={reportReference=>update({reportReference})}/>
   {error&&<Text accessibilityRole="alert" style={{fontSize:type.body,color:colors.danger}}>{text(error==='date'?'observationDateInvalid':'phInvalid')}</Text>}
   {button(text('saveChanges'),()=>void action(()=>{
    if(!calendarDateSchema.safeParse(draft.observedDate).success||draft.observedDate>todayInKenya()){setError('date');return;}
    const ph=Number(draft.ph.trim().replace(',','.'));
    if(!draft.ph.trim()||!Number.isFinite(ph)||ph<0||ph>14){setError('ph');return;}
    repo!.recordSoilTest(farmId,plotId,{observedDate:draft.observedDate,ph,reportReference:draft.reportReference});
    repo!.setMeta(key,'');setOpen(false);setDraft(fresh());setMessage('saved');void sync();
   }))}
   {button(text('cancel'),()=>setOpen(false),true)}
  </View>}
  <Text style={body}>{text('reportUnverified')}</Text>
  {repo!.soilTests(plotId).map(record=><View key={record.id} style={{gap:space.sm,paddingVertical:space.md}}>
   <Text style={label}>{record.data.observedDate} · pH {record.data.ph}</Text>
   {!!record.data.reportReference&&<Text style={body}>{record.data.reportReference}</Text>}
   <Text style={label}>{text(repo!.pending().some(r=>r.record_id===record.id&&r.failure)?'attention':repo!.pending().some(r=>r.record_id===record.id)?'pending':'synced')}</Text>
  </View>)}
  {!repo!.soilTests(plotId).length&&<Text style={body}>{text('noSoilTests')}</Text>}
 </View>;
}
