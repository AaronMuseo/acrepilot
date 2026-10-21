import { Button } from './ui';
import { usePalette, space, type, line, radius, border } from './design-tokens';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { waterSourceSchema, waterSources, type WaterSourceData } from '../../../packages/contracts';
import { useApp } from './app-state';
import { makeControls } from './control-styles';
type Draft=Pick<WaterSourceData,'name'|'sourceType'|'reliability'|'plotIds'|'notes'|'shortageNotes'>;
const draftSchema=waterSourceSchema.pick({name:true,sourceType:true,reliability:true,plotIds:true,notes:true,shortageNotes:true}).extend({name:waterSourceSchema.shape.name.min(0)});
const fresh=():Draft=>({name:'',sourceType:'unknown',reliability:'unknown',plotIds:[],notes:'',shortageNotes:''});
export function WaterSourceManager({farmId}:{farmId:string}){
 const colors = usePalette(); const controls = makeControls(colors);

 const {repo,text,busy,action,sync,setMessage}=useApp();const [editing,setEditing]=useState<string|null>(null);const [draft,setDraft]=useState<Draft>(fresh);const [error,setError]=useState<boolean>(false);
 const key=(id:string)=>'draftWaterSource:'+farmId+':'+id;
 const begin=(id:string,data?:WaterSourceData)=>{let next:Draft=data?{name:data.name,sourceType:data.sourceType,reliability:data.reliability,plotIds:data.plotIds,notes:data.notes,shortageNotes:data.shortageNotes}:fresh();try{const saved=draftSchema.safeParse(JSON.parse(repo!.meta(key(id))??'null'));if(saved.success)next=saved.data;}catch{}setDraft(next);setEditing(id);setError(false);};
 const update=(values:Partial<Draft>)=>{const next={...draft,...values};try{repo!.setMeta(key(editing!),JSON.stringify(next));setDraft(next);setError(false);}catch{setMessage('error');}};
 const label={fontSize:type.body,fontWeight:'600' as const,color:colors.textPrimary};const body={fontSize:type.body,lineHeight:line.body,color:colors.textSecondary};
 const button = (title: string, onPress: () => void, secondary = false) => <Button label={title} onPress={onPress} secondary={secondary} disabled={busy} />;
 const plots=repo!.plots(farmId),rows=repo!.waterSources(farmId);
 const plotName=(id:string)=>{const plot=plots.find(r=>r.id===id);return plot?.data.kind==='plot'?plot.data.name??text('defaultPlot'):text('unknown');};
 return <View style={{padding:space.xl,borderRadius:radius.card,backgroundColor:colors.surface,gap:space.lg,borderWidth:border.hairline,borderColor:colors.border}}>
  <Text style={{...label,fontSize:type.heading}}>{text('sharedWaterSources')}</Text>
  {button(text('addWaterSource'),()=>begin('new'))}
  {editing&&<View style={{gap:space.lg}}>
   <Text style={body}>{text('waterSourceHelp')}</Text>
   <Text style={label}>{text('waterSourceName')}</Text><TextInput style={controls.input} accessibilityLabel={text('waterSourceName')} editable={!busy} maxLength={100} value={draft.name} onChangeText={name=>update({name})}/>
   {([{field:'sourceType',label:'waterSourceType',options:['unknown',...waterSources]},{field:'reliability',label:'sourceReliability',options:['unknown','reliable','seasonal','unreliable']}] as const).map(group=><View key={group.field} style={{gap:space.sm}}><Text style={label}>{text(group.label)}</Text>{group.options.map(value=><Pressable key={value} accessibilityRole="radio" accessibilityLabel={text(group.label)+': '+text(value)} accessibilityState={{checked:draft[group.field]===value,disabled:busy}} disabled={busy} onPress={()=>update({[group.field]:value})} style={({pressed})=>[controls.choice,draft[group.field]===value&&controls.selected,pressed&&controls.pressed]}><Text style={label}>{draft[group.field]===value?'●  ':'○  '}{text(value)}</Text></Pressable>)}</View>)}
   <Text style={label}>{text('storagePlots')}</Text>{plots.map(plot=><Pressable key={plot.id} accessibilityRole="checkbox" accessibilityLabel={plotName(plot.id)} accessibilityState={{checked:draft.plotIds.includes(plot.id),disabled:busy}} disabled={busy} onPress={()=>update({plotIds:draft.plotIds.includes(plot.id)?draft.plotIds.filter(id=>id!==plot.id):[...draft.plotIds,plot.id]})} style={({pressed})=>[controls.choice,draft.plotIds.includes(plot.id)&&controls.selected,pressed&&controls.pressed]}><Text style={label}>{draft.plotIds.includes(plot.id)?'☑  ':'☐  '}{plotName(plot.id)}</Text></Pressable>)}
   <Text style={label}>{text('sourceNotes')}</Text><TextInput style={[controls.input,{minHeight:90,textAlignVertical:'top'}]} accessibilityLabel={text('sourceNotes')} multiline editable={!busy} maxLength={500} value={draft.notes} onChangeText={notes=>update({notes})}/>
   <Text style={label}>{text('shortageNotes')}</Text><TextInput style={[controls.input,{minHeight:90,textAlignVertical:'top'}]} accessibilityLabel={text('shortageNotes')} multiline editable={!busy} maxLength={500} value={draft.shortageNotes} onChangeText={shortageNotes=>update({shortageNotes})}/>
   {error&&<Text accessibilityRole="alert" style={{fontSize:type.body,color:colors.danger}}>{text('waterSourceNameInvalid')}</Text>}
   {button(text('saveChanges'),()=>void action(()=>{if(!draft.name.trim()){setError(true);return;}repo!.saveWaterSource(farmId,draft,editing==='new'?undefined:editing);repo!.setMeta(key(editing),'');setEditing(null);setMessage('saved');void sync();}))}
   {button(text('cancel'),()=>setEditing(null),true)}
  </View>}
  {(editing || rows.length > 0) && <Text style={body}>{text('waterSourceSelfReported')}</Text>}
  {rows.map(record=><View key={record.id} style={{gap:space.sm,paddingVertical:space.md,borderTopWidth:border.hairline,borderColor:colors.border}}><Text style={label}>{record.data.name}</Text><Text style={body}>{text(record.data.sourceType)} · {text(record.data.reliability)}</Text>
   <Text style={body}>{record.data.plotIds.length?text('storagePlots')+': '+record.data.plotIds.map(plotName).join(', '):text('storageUnlinked')}</Text>{!!record.data.notes&&<Text style={body}>{record.data.notes}</Text>}{!!record.data.shortageNotes&&<Text style={body}>{text('shortageNotes')}: {record.data.shortageNotes}</Text>}
   <Text style={label}>{text(repo!.pending().some(r=>r.record_id===record.id&&r.failure)?'attention':repo!.pending().some(r=>r.record_id===record.id)?'pending':'synced')}</Text>
   {button(text('editWaterSource')+' · '+record.data.name,()=>begin(record.id,record.data),true)}
  </View>)}
  {!rows.length&&<Text style={body}>{text('noSharedWaterSources')}</Text>}
 </View>;
}
