import { palettes, usePalette, space, type, radius, layout } from './design-tokens';
import { useState } from 'react';
import { Keyboard, Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { calendarDateSchema } from '../../../packages/contracts';
import { calendarToLocalDate, localDateToCalendar } from '../../../packages/domain/calendar';
import { todayInKenya } from '../../../packages/domain/land';
import { useApp } from './app-state';
import { makeControls } from './control-styles';
export type DateFieldProps={label:string;value:string;onChange:(value:string)=>void;optional?:boolean;maximum?:string;minimum?:string};
export function DateField({label,value,onChange,optional,maximum,minimum}:DateFieldProps){
 const colors = usePalette(); const controls = makeControls(colors);

 const {text,busy,language}=useApp();const [open,setOpen]=useState(false);const [selected,setSelected]=useState(new Date());
 const begin=()=>{Keyboard.dismiss();let initial=calendarDateSchema.safeParse(value).success?value:todayInKenya();if(maximum&&initial>maximum)initial=maximum;if(minimum&&initial<minimum)initial=minimum;setSelected(calendarToLocalDate(initial));setOpen(true);};
 const picker=<DateTimePicker value={selected} mode="date" display={Platform.OS==='ios'?'spinner':'default'} themeVariant={colors.background === palettes.dark.background ? 'dark' : 'light'} locale={Platform.OS==='ios'?(language==='sw'?'sw-KE':'en-KE'):undefined} maximumDate={maximum?calendarToLocalDate(maximum):undefined} minimumDate={minimum?calendarToLocalDate(minimum):undefined} onChange={(event,date)=>{if(Platform.OS==='android'){setOpen(false);if(event.type==='set'&&date)onChange(localDateToCalendar(date));}else if(date)setSelected(date);}} style={{width:'100%'}}/>;
 return <View style={{gap:space.sm}}><Text style={{fontSize:type.body,fontWeight:'600',color:colors.textPrimary}}>{label}</Text>
  <Pressable accessibilityRole="button" accessibilityLabel={label+': '+(value||text('unknown'))} disabled={busy} onPress={begin} style={({pressed})=>[controls.input,{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},pressed&&controls.pressed,busy&&controls.disabled]}><Text style={{fontSize:type.lead,color:colors.textPrimary,flexShrink:1}}>{calendarDateSchema.safeParse(value).success?calendarToLocalDate(value).toLocaleDateString(language==='sw'?'sw-KE':'en-KE',{day:'numeric',month:'short',year:'numeric'}):text('chooseDate')}</Text><Text style={{fontSize:type.heading,color:colors.accent}}>▦</Text></Pressable>
  {optional&&!!value&&<Pressable accessibilityRole="button" disabled={busy} onPress={()=>onChange('')} style={{minHeight:layout.target,justifyContent:'center'}}><Text style={{color:colors.accent,fontSize:type.body}}>{text('clearDate')}</Text></Pressable>}
  {open&&Platform.OS==='android'&&picker}
  <Modal visible={open&&Platform.OS==='ios'} transparent animationType="none" onRequestClose={()=>setOpen(false)}><View style={{flex:1,justifyContent:'flex-end',backgroundColor:colors.overlay}}><ScrollView style={{maxHeight:'85%',backgroundColor:colors.surface,borderTopLeftRadius:radius.sheet,borderTopRightRadius:radius.sheet}} contentContainerStyle={{padding:space.xl,paddingBottom:space.xxxl,gap:space.lg}}><Text style={{fontSize:type.heading,fontWeight:'700',color:colors.textPrimary}}>{label}</Text>{picker}<Pressable accessibilityRole="button" onPress={()=>{onChange(localDateToCalendar(selected));setOpen(false);}} style={controls.button}><Text style={controls.buttonText}>{text('done')}</Text></Pressable><Pressable accessibilityRole="button" onPress={()=>setOpen(false)} style={[controls.button,controls.secondary]}><Text style={[controls.buttonText,controls.secondaryText]}>{text('cancel')}</Text></Pressable></ScrollView></View></Modal>
 </View>;
}
