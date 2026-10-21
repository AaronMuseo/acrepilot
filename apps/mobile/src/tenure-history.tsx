import { Button } from './ui';
import { usePalette, space, type, line, border } from './design-tokens';
import { DateField } from './date-field';
import { estimateLeaseCost, formatKes, parseKes, type LeaseCost } from '../../../packages/domain/lease-cost';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { calendarDateSchema, tenureSchema } from '../../../packages/contracts';
import { todayInKenya } from '../../../packages/domain/land';
import { useApp } from './app-state';
import { makeControls } from './control-styles';
type Draft={observedDate:string;tenureType:'unknown'|'owned'|'leased';leaseStart:string;leaseEnd:string;notes:string;amount:string;basis:LeaseCost['basis'];period:LeaseCost['period']};
const fresh=():Draft=>({observedDate:todayInKenya(),tenureType:'unknown',leaseStart:'',leaseEnd:'',notes:'',amount:'',basis:'acres',period:'yearly'});
export function TenureHistory({farmId,plotId,embedded=false}:{farmId:string;plotId:string;embedded?:boolean}){
 const colors = usePalette(); const controls = makeControls(colors);

 const {repo,text,busy,action,sync,setMessage,displayArea}=useApp();const key='draftTenure:'+plotId;
 const [open,setOpen]=useState(false);const [error,setError]=useState<'date'|'lease'|'cost'|null>(null);
 const [draft,setDraft]=useState<Draft>(()=>{try{const saved=JSON.parse(repo!.meta(key)??'null');if(saved&&['unknown','owned','leased'].includes(saved.tenureType)&&['observedDate','leaseStart','leaseEnd','notes'].every(k=>typeof saved[k]==='string'))return {...fresh(),...saved,amount:typeof saved.amount==='string'?saved.amount:'',basis:['acres','hectares','squareMetres','plot'].includes(saved.basis)?saved.basis:'acres',period:['monthly','yearly','seasonal','wholeLease'].includes(saved.period)?saved.period:'yearly'};}catch{}return fresh();});
 const update=(values:Partial<Draft>)=>{const next={...draft,...values};try{repo!.setMeta(key,JSON.stringify(next));setDraft(next);setError(null);}catch{setMessage('error');}};
 const label={fontSize:type.body,fontWeight:'600' as const,color:colors.textPrimary};const body={fontSize:type.body,lineHeight:line.body,color:colors.textSecondary};
 const button = (title: string, onPress: () => void, secondary = false) => <Button label={title} onPress={onPress} secondary={secondary} disabled={busy} />;
 const rows=repo!.tenures(plotId);
 const basisLabels={acres:'perAcre',hectares:'perHectare',squareMetres:'perSquareMetre',plot:'wholePlot'} as const;
 const buildCost=():LeaseCost=>{const plot=repo!.plots(farmId).find(r=>r.id===plotId);return {amountMinor:parseKes(draft.amount),amountText:draft.amount.trim(),currency:'KES',basis:draft.basis,period:draft.period,areaM2:plot?.data.kind==='plot'?plot.data.areaM2:null};};
 const previewCost=()=>{try{const cost=buildCost(),estimate=estimateLeaseCost(cost);return estimate===null?text('leaseAreaUnknown'):text('leaseEstimate')+': '+formatKes(estimate)+' · '+text(cost.period==='seasonal'?'perSeason':cost.period);}catch{return text('leaseCostInvalid');}};

 return <View style={{gap:space.lg,paddingTop:space.xl,borderTopWidth:border.hairline,borderColor:colors.border}}>
  {!embedded && <Text style={{...label,fontSize:type.heading}}>{text('tenure')}</Text>}
  {!open&&button(text('addTenure'),()=>setOpen(true),true)}
  {open&&<View style={{gap:space.lg}}>
   <Text style={body}>{text('tenureHelp')}</Text>
   <DateField label={text('tenureDate')} value={draft.observedDate} maximum={todayInKenya()} onChange={observedDate=>update({observedDate})}/>
   <Text style={label}>{text('tenureType')}</Text>
   {(['unknown','owned','leased'] as const).map(tenureType=><Pressable key={tenureType} accessibilityRole="radio" accessibilityState={{checked:draft.tenureType===tenureType,disabled:busy}} disabled={busy} onPress={()=>update({tenureType,leaseStart:tenureType==='leased'?draft.leaseStart:'',leaseEnd:tenureType==='leased'?draft.leaseEnd:''})} style={({pressed})=>[controls.choice,draft.tenureType===tenureType&&controls.selected,pressed&&controls.pressed]}><Text style={label}>{draft.tenureType===tenureType?'●  ':'○  '}{text(tenureType)}</Text></Pressable>)}
   {draft.tenureType==='leased'&&<View style={{gap:space.lg}}>
    <DateField label={text('leaseStart')} value={draft.leaseStart} optional onChange={leaseStart=>update({leaseStart})}/>
    <DateField label={text('leaseEnd')} value={draft.leaseEnd} optional minimum={calendarDateSchema.safeParse(draft.leaseStart).success?draft.leaseStart:undefined} onChange={leaseEnd=>update({leaseEnd})}/>
    <Text style={{...label,fontSize:type.heading}}>{text('leasePricing')}</Text><Text style={body}>{text('costHelp')}</Text>
    <Text style={label}>{text('leaseAmount')}</Text><TextInput style={controls.input} accessibilityLabel={text('leaseAmount')} keyboardType="decimal-pad" editable={!busy} maxLength={14} value={draft.amount} onChangeText={amount=>update({amount})}/>
    <Text style={label}>{text('rateBasis')}</Text><View style={{gap:space.sm}}>{(['acres','hectares','squareMetres','plot'] as const).map(basis=><Pressable key={basis} accessibilityRole="radio" accessibilityState={{checked:draft.basis===basis,disabled:busy}} disabled={busy} onPress={()=>update({basis})} style={({pressed})=>[controls.choice,draft.basis===basis&&controls.selected,pressed&&controls.pressed]}><Text style={label}>{draft.basis===basis?'●  ':'○  '}{text(basisLabels[basis])}</Text></Pressable>)}</View>
    <Text style={label}>{text('paymentPeriod')}</Text><View style={{gap:space.sm}}>{(['monthly','yearly','seasonal','wholeLease'] as const).map(period=><Pressable key={period} accessibilityRole="radio" accessibilityState={{checked:draft.period===period,disabled:busy}} disabled={busy} onPress={()=>update({period})} style={({pressed})=>[controls.choice,draft.period===period&&controls.selected,pressed&&controls.pressed]}><Text style={label}>{draft.period===period?'●  ':'○  '}{text(period==='seasonal'?'perSeason':period)}</Text></Pressable>)}</View>
    {draft.amount.trim()&&<Text style={body}>{previewCost()}</Text>}
   </View>}
   <Text style={label}>{text('tenureNotes')}</Text><TextInput style={[controls.input,{minHeight:90,textAlignVertical:'top'}]} accessibilityLabel={text('tenureNotes')} multiline editable={!busy} maxLength={500} value={draft.notes} onChangeText={notes=>update({notes})}/>
   {error&&<Text accessibilityRole="alert" style={{fontSize:type.body,color:colors.danger}}>{text(error==='date'?'observationDateInvalid':error==='cost'?'leaseCostInvalid':'leaseDatesInvalid')}</Text>}
   {button(text('saveChanges'),()=>void action(()=>{
    if(!calendarDateSchema.safeParse(draft.observedDate).success||draft.observedDate>todayInKenya()){setError('date');return;}
    let leaseCost:LeaseCost|null=null;
    if(draft.tenureType==='leased'&&draft.amount.trim()){try{leaseCost=buildCost();estimateLeaseCost(leaseCost);}catch{setError('cost');return;}}
    const values={leaseCost,observedDate:draft.observedDate,tenureType:draft.tenureType,leaseStart:draft.leaseStart.trim()||null,leaseEnd:draft.leaseEnd.trim()||null,notes:draft.notes};
    if(!tenureSchema.safeParse({kind:'tenure',farmId,plotId,...values,source:'self_reported'}).success){setError('lease');return;}
    repo!.recordTenure(farmId,plotId,values);repo!.setMeta(key,'');setOpen(false);setDraft(fresh());setMessage('saved');void sync();
   }))}
   {button(text('cancel'),()=>setOpen(false),true)}
  </View>}
  <Text style={body}>{text('tenureSelfReported')}</Text>
  {rows.map(record=><View key={record.id} style={{gap:space.sm,paddingVertical:space.md}}><Text style={label}>{record.data.observedDate} · {text(record.data.tenureType)}</Text>
   {record.data.tenureType==='leased'&&<><Text style={body}>{text('leaseStart')}: {record.data.leaseStart??text('unknown')}</Text><Text style={body}>{text('leaseEnd')}: {record.data.leaseEnd??text('unknown')}</Text></>}
   {record.id===rows[0]?.id&&record.data.leaseEnd&&record.data.leaseEnd<todayInKenya()&&<Text style={{...body,color:colors.warning}}>{text('leaseExpired')}</Text>}
   {record.data.tenureType==='leased'&&(record.data.leaseCost?<View style={{gap:space.sm}}><Text style={label}>{formatKes(record.data.leaseCost.amountMinor)} · {text(basisLabels[record.data.leaseCost.basis])} · {text(record.data.leaseCost.period==='seasonal'?'perSeason':record.data.leaseCost.period)}</Text><Text style={body}>{text('leaseEstimate')}: {estimateLeaseCost(record.data.leaseCost)===null?text('unknown'):formatKes(estimateLeaseCost(record.data.leaseCost)!)}</Text>{record.data.leaseCost.basis!=='plot'&&<Text style={body}>{text('savedCostArea')}: {displayArea(record.data.leaseCost.areaM2)}</Text>}</View>:<Text style={body}>{text('noLeaseCost')}</Text>)}
   {!!record.data.notes&&<Text style={body}>{record.data.notes}</Text>}
   <Text style={label}>{text(repo!.pending().some(r=>r.record_id===record.id&&r.failure)?'attention':repo!.pending().some(r=>r.record_id===record.id)?'pending':'synced')}</Text>
  </View>)}
  {!rows.length&&<Text style={body}>{text('noTenures')}</Text>}
 </View>;
}
