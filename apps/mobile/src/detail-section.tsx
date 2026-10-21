import { usePalette, space, type, line, border, layout, type Colors } from './design-tokens';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { makeControls } from './control-styles';

/** Keep opened content mounted so collapsing a section never clears a draft. */
export function DetailSection({title, children}: {title: string; children: ReactNode}) {
 const colors = usePalette(); const controls = makeControls(colors); const styles = makeStyles(colors, controls);

  const [open, setOpen] = useState(false);
  const [visited, setVisited] = useState(false);
  return <View style={styles.section}>
    <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{expanded: open}}
      onPress={() => {setVisited(true); setOpen(value => !value);}}
      style={({pressed}) => [styles.toggle, pressed && controls.pressed]}>
      <Text style={styles.title}>{title}</Text><Text accessible={false} style={styles.icon}>{open ? '−' : '+'}</Text>
    </Pressable>
    {visited && <View style={[styles.content, !open && {display: 'none'}]}>{children}</View>}
  </View>;
}
const makeStyles = (colors: Colors, controls: ReturnType<typeof makeControls>) => StyleSheet.create({
  section: {borderTopWidth: border.hairline, borderColor: colors.border},
  toggle: {minHeight: layout.control, flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md},
  title: {flex: 1, fontSize: type.body, lineHeight: line.body, fontWeight: '600', color: colors.textPrimary},
  icon: {fontSize: type.heading, color: colors.accent}, content: {gap: space.md, paddingBottom: space.lg},
});
