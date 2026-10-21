import { Button } from './ui';
import { usePalette, space, type, line, radius, border } from './design-tokens';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import type { WaterStorageData } from '../../../packages/contracts';
import { storageCapacity } from '../../../packages/domain/volume';
import { useApp } from './app-state';
import { makeControls } from './control-styles';
type Draft={name:string;amount:string;unit:'litres'|'cubicMetres';plotIds:string[];notes:string};
const fresh=():Draft=>({name:'',amount:'',unit:'litres',plotIds:[],notes:''});
export function WaterStorageManager({farmId}:{farmId:string}){
 const colors = usePalette(); const controls = makeControls(colors);

 const {repo,text,busy,action,sync,setMessage}=useApp();const [editing,setEditing]=useState<string|null>(null);const [draft,setDraft]=useState<Draft>(fresh);const [error,setError]=useState<'name'|'capacity'|null>(null);
 const key=(id:string)=>'draftWaterStorage:'+farmId+':'+id;
 const begin=(id:string,data?:WaterStorageData)=>{let next:Draft=data?{name:data.name,amount:data.capacity?.amountText??'',unit:data.capacity?.unit??'litres',plotIds:data.plotIds,notes:data.notes}:fresh();try{const saved=JSON.parse(repo!.meta(key(id))??'null');if(saved&&['name','amount','notes'].every(k=>typeof saved[k]==='string')&&['litres','cubicMetres'].includes(saved.unit)&&Array.isArray(saved.plotIds)&&saved.plotIds.every((v:any)=>typeof v==='string'))next=saved;}catch{}setDraft(next);setEditing(id);setError(null);};
 const update=(values:Partial<Draft>)=>{const next={...draft,...values};try{repo!.setMeta(key(editing!),JSON.stringify(next));setDraft(next);setError(null);}catch{setMessage('error');}};
 const label={fontSize:type.body,fontWeight:'600' as const,color:colors.textPrimary};const body={fontSize:type.body,lineHeight:line.body,color:colors.textSecondary};
 const button = (title: string, onPress: () => void, secondary = false) => <Button label={title} onPress={onPress} secondary={secondary} disabled={busy} />;
 const plots=repo!.plots(farmId),rows=repo!.waterStorage(farmId);
 const plotName=(id:string)=>{const plot=plots.find(r=>r.id===id);return plot?.data.kind==='plot'?plot.data.name??text('defaultPlot'):text('unknown');};
 const preview=()=>{try{const value=storageCapacity(draft.amount,draft.unit);return value?value.litres.toLocaleString()+' '+text('litres'):text('unknown');}catch{return text('storageInvalidCapacity');}};
 return <View style={{padding:space.xl,borderRadius:radius.card,backgroundColor:colors.surface,gap:space.lg,borderWidth:border.hairline,borderColor:colors.border}}>
  <Text style={{...label,fontSize:type.heading}}>{text('waterStorage')}</Text>
  {button(text('addWaterStorage'),()=>begin('new'))}
  {editing&&<View style={{gap:space.lg}}>
   <Text style={body}>{text('storageHelp')}</Text>
   <Text style={label}>{text('storageName')}</Text><TextInput style={controls.input} accessibilityLabel={text('storageName')} editable={!busy} maxLength={100} value={draft.name} onChangeText={name=>update({name})}/>
   <Text style={label}>{text('storageCapacity')}</Text><TextInput style={controls.input} accessibilityLabel={text('storageCapacity')} editable={!busy} keyboardType="decimal-pad" maxLength={16} value={draft.amount} onChangeText={amount=>update({amount})}/>
   <Text style={label}>{text('storageUnit')}</Text>{(['litres','cubicMetres'] as const).map(unit=><Pressable key={unit} accessibilityRole="radio" accessibilityLabel={text('storageUnit')+': '+text(unit)} accessibilityState={{checked:draft.unit===unit,disabled:busy}} disabled={busy} onPress={()=>update({unit})} style={({pressed})=>[controls.choice,draft.unit===unit&&controls.selected,pressed&&controls.pressed]}><Text style={label}>{draft.unit===unit?'●  ':'○  '}{text(unit)}</Text></Pressable>)}
   <Text style={body}>{text('storageCapacity')}: {preview()}</Text>
   <Text style={label}>{text('storagePlots')}</Text>{plots.map(plot=><Pressable key={plot.id} accessibilityRole="checkbox" accessibilityLabel={plotName(plot.id)} accessibilityState={{checked:draft.plotIds.includes(plot.id),disabled:busy}} disabled={busy} onPress={()=>update({plotIds:draft.plotIds.includes(plot.id)?draft.plotIds.filter(id=>id!==plot.id):[...draft.plotIds,plot.id]})} style={({pressed})=>[controls.choice,draft.plotIds.includes(plot.id)&&controls.selected,pressed&&controls.pressed]}><Text style={label}>{draft.plotIds.includes(plot.id)?'☑  ':'☐  '}{plotName(plot.id)}</Text></Pressable>)}
   <Text style={label}>{text('storageNotes')}</Text><TextInput style={[controls.input,{minHeight:90,textAlignVertical:'top'}]} accessibilityLabel={text('storageNotes')} multiline editable={!busy} maxLength={500} value={draft.notes} onChangeText={notes=>update({notes})}/>
   {error&&<Text accessibilityRole="alert" style={{fontSize:type.body,color:colors.danger}}>{text(error==='name'?'storageInvalidName':'storageInvalidCapacity')}</Text>}
   {button(text('saveChanges'),()=>void action(()=>{if(!draft.name.trim()){setError('name');return;}let capacity;try{capacity=storageCapacity(draft.amount,draft.unit);}catch{setError('capacity');return;}repo!.saveWaterStorage(farmId,{name:draft.name,capacity,plotIds:draft.plotIds,notes:draft.notes},editing==='new'?undefined:editing);repo!.setMeta(key(editing),'');setEditing(null);setMessage('saved');void sync();}))}
   {button(text('cancel'),()=>setEditing(null),true)}
  </View>}
  {(editing || rows.length > 0) && <Text style={body}>{text('storageSelfReported')}</Text>}
  {rows.map(record=><View key={record.id} style={{gap:space.sm,paddingVertical:space.md,borderTopWidth:border.hairline,borderColor:colors.border}}><Text style={label}>{record.data.name}</Text><Text style={body}>{text('storageCapacity')}: {record.data.capacity?record.data.capacity.amountText+' '+text(record.data.capacity.unit):text('unknown')}</Text>
   <Text style={body}>{record.data.plotIds.length?text('storagePlots')+': '+record.data.plotIds.map(plotName).join(', '):text('storageUnlinked')}</Text>{!!record.data.notes&&<Text style={body}>{record.data.notes}</Text>}
   <Text style={label}>{text(repo!.pending().some(r=>r.record_id===record.id&&r.failure)?'attention':repo!.pending().some(r=>r.record_id===record.id)?'pending':'synced')}</Text>
   {button(text('editWaterStorage')+' · '+record.data.name,()=>begin(record.id,record.data),true)}
  </View>)}
  {!rows.length&&<Text style={body}>{text('noWaterStorage')}</Text>}
 </View>;
}
