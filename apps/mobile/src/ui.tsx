import { Pressable, Text, View } from 'react-native';
import { useControls } from './control-styles';
import { layout, line, radius, space, type, usePalette } from './design-tokens';
export function Button({label,onPress,secondary=false,disabled=false}:{label:string;onPress:()=>void;secondary?:boolean;disabled?:boolean}) {
 const controls=useControls();
 return <Pressable accessibilityRole="button" accessibilityState={{disabled}} disabled={disabled} onPress={onPress} style={({pressed})=>[controls.button,secondary&&controls.secondary,disabled&&controls.disabled,pressed&&controls.pressed]}><Text style={[controls.buttonText,secondary&&controls.secondaryText]}>{label}</Text></Pressable>;
}
/** Static placeholders avoid motion and communicate startup to assistive technology. */
export function Skeleton({label}:{label:string}) {
 const colors=usePalette();
 return <View accessibilityRole="progressbar" accessibilityLabel={label} accessibilityState={{busy:true}} style={{gap:space.lg}}><Text style={{fontSize:type.body,lineHeight:line.body,color:colors.textSecondary}}>{label}</Text>{['100%','72%','88%'].map(width=><View key={width} accessible={false} style={{width:width as `${number}%`,height:layout.control,backgroundColor:colors.accentSoft,borderRadius:radius.field}}/>)}</View>;
}
