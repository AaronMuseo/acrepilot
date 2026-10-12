import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AreaEditor } from '../../apps/mobile/src/area-editor';
import { PreviewState } from './state';
function Preview(){const [open,setOpen]=useState(true);return <PreviewState>{open?<AreaEditor farmId="22222222-2222-4222-8222-222222222222" plotId="11111111-1111-4111-8111-111111111111" onClose={()=>setOpen(false)}/>:<button onClick={()=>setOpen(true)}>Reopen editor</button>}</PreviewState>}
createRoot(document.getElementById('root')!).render(<Preview/>);
