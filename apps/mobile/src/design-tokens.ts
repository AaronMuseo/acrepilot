import { createContext, useContext } from 'react';
import { useColorScheme } from 'react-native';
export const palettes = {
 light: {background:'#F5F3EB',surface:'#FFFEF9',textPrimary:'#272D29',textSecondary:'#596159',border:'#818A7C',accent:'#45624D',onAccent:'#FFFFFF',accentSoft:'#E5EBDF',input:'#F1F1E8',success:'#38563F',warning:'#705426',warningSurface:'#F1EAD9',danger:'#913D35',overlay:'#00000066'},
 dark: {background:'#1D221F',surface:'#272E29',textPrimary:'#F4F2E8',textSecondary:'#BCC5B9',border:'#7C897C',accent:'#B1C7A7',onAccent:'#1D291F',accentSoft:'#344438',input:'#202822',success:'#B1C7A7',warning:'#E4C68F',warningSurface:'#3E3728',danger:'#F3ADA2',overlay:'#00000099'},
} as const;
export type Colors = { [K in keyof typeof palettes.light]: string };
export const space = {xs:4,sm:8,md:12,lg:16,xl:24,xxl:32,xxxl:48} as const;
export const type = {caption:14,body:16,lead:18,heading:24,title:32} as const;
export const line = {caption:20,body:24,lead:28,heading:36,title:48} as const;
export const radius = {field:8,button:12,card:16,sheet:24} as const;
export const border = {hairline:1,strong:2,indicator:4} as const;
export const layout = {target:48,control:56,navigation:64,content:640} as const;
export const feedback = {pressed:0.72,disabled:0.45} as const;
export const elevation = {flat:0} as const;
export const PaletteOverride = createContext<'light' | 'dark' | null>(null);
export function usePalette(): Colors {const system=useColorScheme();const override=useContext(PaletteOverride);return palettes[override ?? (system==='dark'?'dark':'light')];}

