import { PaletteOverride } from '../../apps/mobile/src/design-tokens';
import { createRoot } from 'react-dom/client';
import { useEffect, useState } from 'react';
import AppScreen, {type Section} from '../../apps/mobile/src/app-screen';
import { PreviewState } from './state';
function Preview(){
 const [scenario,setScenario]=useState('normal');
 const [theme,setTheme]=useState<'light'|'dark'>('light');
 const [section,setSection]=useState<Section>('farm');
 useEffect(()=>{const listener=(event:Event)=>setSection(((event as CustomEvent).detail.slice(1)||'home') as Section);window.addEventListener('preview-route',listener);return()=>window.removeEventListener('preview-route',listener);},[]);
 return <PaletteOverride.Provider value={theme}><div style={{textAlign:'center'}}><button onClick={()=>setTheme(theme==='light'?'dark':'light')}>Preview {theme==='light'?'dark':'light'} mode</button><select aria-label="Preview state" value={scenario} onChange={event=>setScenario(event.target.value)}>{["normal","loading","offline","error","empty"].map(value=><option key={value}>{value}</option>)}</select></div><PreviewState scenario={scenario}><AppScreen section={section}/></PreviewState></PaletteOverride.Provider>;
}
createRoot(document.getElementById('root')!).render(<Preview/>);
