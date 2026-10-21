import { StyleSheet } from 'react-native';
import { border, feedback, layout, line, radius, space, type, usePalette, type Colors } from './design-tokens';
export const makeControls = (colors: Colors) => StyleSheet.create({
 input:{backgroundColor:colors.input,borderWidth:border.hairline,borderColor:colors.border,borderBottomWidth:border.strong,borderRadius:radius.field,padding:space.lg,minHeight:layout.control,fontSize:type.body,lineHeight:line.body,color:colors.textPrimary},
 button:{minHeight:layout.control,paddingVertical:space.lg,paddingHorizontal:space.xl,backgroundColor:colors.accent,borderRadius:radius.button,alignItems:'center',justifyContent:'center'},
 buttonText:{color:colors.onAccent,fontSize:type.body,lineHeight:line.body,fontWeight:'700',textAlign:'center'},
 secondary:{backgroundColor:colors.accentSoft,borderWidth:border.hairline,borderColor:colors.border},secondaryText:{color:colors.textPrimary},
 choice:{padding:space.lg,minHeight:layout.control,backgroundColor:colors.surface,borderBottomWidth:border.hairline,borderColor:colors.border,borderLeftWidth:border.indicator,borderLeftColor:'transparent',borderRadius:radius.field,justifyContent:'center'},
 selected:{backgroundColor:colors.accentSoft,borderLeftColor:colors.accent},pressed:{opacity:feedback.pressed},disabled:{opacity:feedback.disabled},
});
export function useControls(){return makeControls(usePalette());}
