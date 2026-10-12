import { StyleSheet } from 'react-native';

// Actions, editable fields and selection rows deliberately have different shapes.
export const controls = StyleSheet.create({
  input: {backgroundColor: '#f2f4f5', borderWidth: 1, borderColor: '#78858d', borderBottomWidth: 3, borderRadius: 6, padding: 14, minHeight: 54, fontSize: 18, color: '#172d20'},
  button: {minHeight: 52, paddingVertical: 14, paddingHorizontal: 20, backgroundColor: '#20563a', borderRadius: 26, alignItems: 'center', justifyContent: 'center'},
  buttonText: {color: '#ffffff', fontSize: 17, fontWeight: '700', textAlign: 'center'},
  secondary: {backgroundColor: '#dcebdc', borderWidth: 2, borderColor: '#20563a'},
  secondaryText: {color: '#183e2d'},
  choice: {padding: 14, minHeight: 52, backgroundColor: '#f7faf6', borderBottomWidth: 1, borderColor: '#cbd8cc', borderLeftWidth: 4, borderLeftColor: 'transparent', borderRadius: 4, justifyContent: 'center'},
  selected: {backgroundColor: '#e0efdf', borderLeftColor: '#20563a'},
  pressed: {opacity: 0.72, transform: [{scale: 0.98}]}, disabled: {opacity: 0.45},
});
