import { palettes, usePalette, space, type, radius, border, layout } from './design-tokens';
import { makeControls } from './control-styles';
import { createElement } from 'react';
import { Pressable,Text,View } from 'react-native';
import type { DateFieldProps } from './date-field';
import { useApp } from './app-state';
export function DateField({label,value,onChange,optional,maximum,minimum}:DateFieldProps){
 const colors = usePalette(); const controls = makeControls(colors);
const {text,busy}=useApp();return <View style={{gap:space.sm}}><Text style={{fontSize:type.body,fontWeight:'600',color:colors.textPrimary}}>{label}</Text>{createElement('input',{type:'date','aria-label':label,value,max:maximum,min:minimum,disabled:busy,onInput:(event:any)=>onChange(event.currentTarget.value),onChange:(event:any)=>onChange(event.currentTarget.value),style:{boxSizing:'border-box',width:'100%',minHeight:layout.control,padding:space.lg,fontSize:type.lead,color:colors.textPrimary,background:colors.input,borderWidth:border.hairline,borderStyle:'solid',borderColor:colors.border,colorScheme:colors.background===palettes.dark.background?'dark':'light',borderBottomWidth:border.strong,borderRadius:radius.field}})}{optional&&!!value&&<Pressable accessibilityRole="button" disabled={busy} onPress={()=>onChange('')} style={{minHeight:layout.target,justifyContent:'center'}}><Text style={{fontSize:type.body,color:colors.accent}}>{text('clearDate')}</Text></Pressable>}</View>;}
