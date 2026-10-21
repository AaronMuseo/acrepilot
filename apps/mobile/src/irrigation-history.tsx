import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { calendarDateSchema, irrigationMethods, type IrrigationData } from '../../../packages/contracts';
import { areaToSquareMetres, areaUnits, type AreaUnit } from '../../../packages/domain';
import { todayInKenya } from '../../../packages/domain/land';
import { useApp } from './app-state';
import { Button } from './ui';
import { DateField } from './date-field';
import { makeControls } from './control-styles';
import { usePalette, space, type, line } from './design-tokens';

type Draft = {observedDate:string; irrigationStatus:IrrigationData['irrigationStatus']; methods:IrrigationData['methods']; amount:string; unit:AreaUnit; notes:string};
const fresh = (unit:AreaUnit):Draft => ({observedDate:todayInKenya(),irrigationStatus:'unknown',methods:[],amount:'',unit,notes:''});

export function IrrigationHistory({farmId,plotId}:{farmId:string;plotId:string}) {
  const {repo,text,busy,action,sync,setMessage,areaUnit,displayArea}=useApp();
  const colors=usePalette(); const controls=makeControls(colors);
  const key='draftIrrigation:'+plotId;
  const [open,setOpen]=useState(false);
  const [error,setError]=useState<'observationDateInvalid'|'irrigationMethodRequired'|'irrigationAreaInvalid'|null>(null);
  const [draft,setDraft]=useState<Draft>(()=>{
    try {
      const saved=JSON.parse(repo!.meta(key)??'null');
      if(saved && ['observedDate','amount','notes'].every(k=>typeof saved[k]==='string') &&
        ['unknown','none','known'].includes(saved.irrigationStatus) && areaUnits.includes(saved.unit) &&
        Array.isArray(saved.methods) && saved.methods.every((v:any)=>irrigationMethods.includes(v))) return saved;
    } catch {}
    return fresh(areaUnit);
  });
  const update=(value:Partial<Draft>)=>{const next={...draft,...value};try{repo!.setMeta(key,JSON.stringify(next));setDraft(next);setError(null);}catch{setMessage('error');}};
  const plot=repo!.plots(farmId).find(r=>r.id===plotId);
  const plotArea=plot?.data.kind==='plot'?plot.data.areaM2:null;
  const label={fontSize:type.body,fontWeight:'600' as const,color:colors.textPrimary};
  const body={fontSize:type.body,lineHeight:line.body,color:colors.textSecondary};
  const coverage=(area:number|null,total:number|null)=>area===null||total===null?text('irrigationCoverageUnknown'):text('irrigationCoverage')+': '+Math.min(100,area/total*100).toFixed(1)+'%';
  const save=()=>void action(()=>{
    if(!calendarDateSchema.safeParse(draft.observedDate).success||draft.observedDate>todayInKenya()){setError('observationDateInvalid');return;}
    if(draft.irrigationStatus==='known'&&!draft.methods.length){setError('irrigationMethodRequired');return;}
    let area:number|null=draft.irrigationStatus==='none'?0:null;
    if(draft.irrigationStatus==='known'&&draft.amount.trim()) {
      try {
        if(!/^\d+(\.\d{1,6})?$/.test(draft.amount.trim()))throw new Error('INVALID_AREA');
        area=areaToSquareMetres(Number(draft.amount),draft.unit);
        if(area>1e9 || (plotArea!==null&&area>plotArea+1e-6))throw new Error('INVALID_AREA');
      } catch {setError('irrigationAreaInvalid');return;}
    }
    repo!.recordIrrigation(farmId,plotId,{observedDate:draft.observedDate,irrigationStatus:draft.irrigationStatus,methods:draft.irrigationStatus==='known'?draft.methods:[],irrigatedAreaM2:area,notes:draft.notes});
    repo!.setMeta(key,'');setDraft(fresh(areaUnit));setOpen(false);setMessage('saved');void sync();
  });
  const rows=repo!.irrigations(plotId);
  return <View style={{gap:space.lg}}>
    {!open&&<Button label={text('addIrrigation')} onPress={()=>setOpen(true)} secondary disabled={busy}/>}
    {open&&<View style={{gap:space.lg}}>
      <Text style={body}>{text('irrigationHelp')}</Text>
      <DateField label={text('conditionDate')} value={draft.observedDate} maximum={todayInKenya()} onChange={observedDate=>update({observedDate})}/>
      <Text style={label}>{text('irrigationStatus')}</Text>
      {(['unknown','none','known'] as const).map(value=>{const title=text(value==='none'?'noIrrigation':value==='known'?'irrigationKnown':'unknown');return <Pressable key={value} accessibilityRole="radio" accessibilityLabel={text('irrigationStatus')+': '+title} accessibilityState={{checked:draft.irrigationStatus===value,disabled:busy}} disabled={busy} onPress={()=>{if(draft.irrigationStatus!==value)update({irrigationStatus:value,methods:[],amount:''});}} style={({pressed})=>[controls.choice,draft.irrigationStatus===value&&controls.selected,pressed&&controls.pressed]}><Text style={label}>{draft.irrigationStatus===value?'●  ':'○  '}{title}</Text></Pressable>;})}
      {draft.irrigationStatus==='known'&&<>
        <Text style={label}>{text('irrigationMethods')}</Text>
        {irrigationMethods.map(method=><Pressable key={method} accessibilityRole="checkbox" accessibilityLabel={text(method)} accessibilityState={{checked:draft.methods.includes(method),disabled:busy}} disabled={busy} onPress={()=>update({methods:draft.methods.includes(method)?draft.methods.filter(v=>v!==method):[...draft.methods,method]})} style={({pressed})=>[controls.choice,draft.methods.includes(method)&&controls.selected,pressed&&controls.pressed]}><Text style={label}>{draft.methods.includes(method)?'☑  ':'☐  '}{text(method)}</Text></Pressable>)}
        <Text style={label}>{text('irrigatedArea')} · {text(draft.unit)}</Text>
        <TextInput accessibilityLabel={text('irrigatedArea')} style={controls.input} keyboardType="decimal-pad" editable={!busy} value={draft.amount} maxLength={30} onChangeText={amount=>update({amount})}/>
        <Text style={body}>{text('currentArea')}: {displayArea(plotArea)}</Text>
      </>}
      <Text style={label}>{text('irrigationNotes')}</Text>
      <TextInput accessibilityLabel={text('irrigationNotes')} style={[controls.input,{minHeight:90,textAlignVertical:'top'}]} multiline editable={!busy} value={draft.notes} maxLength={500} onChangeText={notes=>update({notes})}/>
      {error&&<Text accessibilityRole="alert" style={{...body,color:colors.danger}}>{text(error)}</Text>}
      <Button label={text('saveChanges')} onPress={save} disabled={busy}/>
      <Button label={text('cancel')} onPress={()=>setOpen(false)} secondary disabled={busy}/>
    </View>}
    <Text style={body}>{text('irrigationSelfReported')}</Text>
    {rows.map(record=><View key={record.id} style={{gap:space.sm,paddingVertical:space.md}}>
      <Text style={label}>{record.data.observedDate} · {text(record.data.irrigationStatus==='none'?'noIrrigation':record.data.irrigationStatus==='known'?'irrigationKnown':'unknown')}</Text>
      {!!record.data.methods.length&&<Text style={body}>{record.data.methods.map(v=>text(v)).join(', ')}</Text>}
      <Text style={body}>{text('irrigatedCoverage')}: {displayArea(record.data.irrigatedAreaM2)}</Text>
      <Text style={body}>{text('plotAreaAtSave')}: {displayArea(record.data.plotAreaM2)}</Text>
      <Text style={body}>{coverage(record.data.irrigatedAreaM2,record.data.plotAreaM2)}</Text>
      {!!record.data.notes&&<Text style={body}>{record.data.notes}</Text>}
      <Text style={label}>{text(repo!.pending().some(r=>r.record_id===record.id&&r.failure)?'attention':repo!.pending().some(r=>r.record_id===record.id)?'pending':'synced')}</Text>
    </View>)}
    {!rows.length&&<Text style={body}>{text('noIrrigationRecords')}</Text>}
  </View>;
}
