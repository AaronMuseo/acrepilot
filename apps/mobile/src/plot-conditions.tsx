import { Button } from './ui';
import { usePalette, space, type, line, border } from './design-tokens';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { plotConditionSchema, slopeTypes, drainageTypes, accessTypes, type PlotConditionData } from '../../../packages/contracts';
import { todayInKenya } from '../../../packages/domain/land';
import { DateField } from './date-field';
import { useApp } from './app-state';
import { makeControls } from './control-styles';
type Draft=Pick<PlotConditionData,'observedDate'|'slope'|'drainage'|'roadAccess'|'notes'>;
const draftSchema=plotConditionSchema.pick({observedDate:true,slope:true,drainage:true,roadAccess:true,notes:true});
const fresh=():Draft=>({observedDate:todayInKenya(),slope:'unknown',drainage:'unknown',roadAccess:'unknown',notes:''});
const groups=[{field:'slope',options:slopeTypes},{field:'drainage',options:drainageTypes},{field:'roadAccess',options:accessTypes}] as const;
export function PlotConditions({farmId,plotId,embedded=false}:{farmId:string;plotId:string;embedded?:boolean}){
 const colors = usePalette(); const controls = makeControls(colors);

 const {repo,text,busy,action,sync,setMessage}=useApp();const key='draftPlotCondition:'+plotId;
 const [open,setOpen]=useState(false);const [invalid,setInvalid]=useState(false);
 const [draft,setDraft]=useState<Draft>(()=>{try{const saved=draftSchema.safeParse(JSON.parse(repo!.meta(key)??'null'));if(saved.success)return saved.data;}catch{}return fresh();});
 const update=(value:Partial<Draft>)=>{const next={...draft,...value};try{repo!.setMeta(key,JSON.stringify(next));setDraft(next);setInvalid(false);}catch{setMessage('error');}};
 const label={fontSize:type.body,fontWeight:'600' as const,color:colors.textPrimary};const body={fontSize:type.body,lineHeight:line.body,color:colors.textSecondary};
 const button = (title: string, onPress: () => void, secondary = false) => <Button label={title} onPress={onPress} secondary={secondary} disabled={busy} />;
 const rows=repo!.plotConditions(plotId);
 return <View style={{gap:space.lg,paddingTop:space.xl,borderTopWidth:border.hairline,borderColor:colors.border}}>
  {!embedded && <Text style={{...label,fontSize:type.heading}}>{text('plotConditions')}</Text>}
  {!open&&button(text('addPlotCondition'),()=>setOpen(true),true)}
  {open&&<View style={{gap:space.lg}}>
   <Text style={body}>{text('plotConditionHelp')}</Text>
   <DateField label={text('conditionDate')} value={draft.observedDate} maximum={todayInKenya()} onChange={observedDate=>update({observedDate})}/>
   {groups.map(group=><View key={group.field} style={{gap:space.md}}><Text style={label}>{text(group.field)}</Text>
    {group.options.map(value=><Pressable key={value} accessibilityRole="radio" accessibilityLabel={text(group.field)+': '+text(value)} accessibilityState={{checked:draft[group.field]===value,disabled:busy}} disabled={busy} onPress={()=>update({[group.field]:value})} style={({pressed})=>[controls.choice,draft[group.field]===value&&controls.selected,pressed&&controls.pressed]}><Text style={label}>{draft[group.field]===value?'●  ':'○  '}{text(value)}</Text></Pressable>)}
   </View>)}
   <Text style={label}>{text('plotConditionNotes')}</Text><TextInput style={[controls.input,{minHeight:90,textAlignVertical:'top'}]} accessibilityLabel={text('plotConditionNotes')} multiline editable={!busy} value={draft.notes} maxLength={500} onChangeText={notes=>update({notes})}/>
   {invalid&&<Text accessibilityRole="alert" style={{fontSize:type.body,color:colors.danger}}>{text('observationDateInvalid')}</Text>}
   {button(text('saveChanges'),()=>void action(()=>{
    if(!draftSchema.safeParse(draft).success||draft.observedDate>todayInKenya()){setInvalid(true);return;}
    repo!.recordPlotCondition(farmId,plotId,draft);repo!.setMeta(key,'');setDraft(fresh());setOpen(false);setMessage('saved');void sync();
   }))}
   {button(text('cancel'),()=>setOpen(false),true)}
  </View>}
  <Text style={body}>{text('conditionSelfReported')}</Text>
  {rows.map(record=><View key={record.id} style={{gap:space.sm,paddingVertical:space.md}}><Text style={label}>{record.data.observedDate}</Text>
   {groups.map(group=><Text key={group.field} style={body}>{text(group.field)}: {text(record.data[group.field])}</Text>)}
   {!!record.data.notes&&<Text style={body}>{record.data.notes}</Text>}
   <Text style={label}>{text(repo!.pending().some(r=>r.record_id===record.id&&r.failure)?'attention':repo!.pending().some(r=>r.record_id===record.id)?'pending':'synced')}</Text>
  </View>)}
  {!rows.length&&<Text style={body}>{text('noPlotConditions')}</Text>}
 </View>;
}
