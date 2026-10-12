import { createContext, useContext, useState } from 'react';
import { t } from '../../packages/translations';
import { reviseArea } from '../../packages/domain/land';
const Context = createContext<any>(null);
export const useApp = () => useContext(Context);
const initial = {id:'11111111-1111-4111-8111-111111111111', data:{kind:'plot', farmId:'22222222-2222-4222-8222-222222222222', name:'Preview plot', areaM2:null, soil:'unknown', water:'unknown'}};
export function PreviewState({children}: any) {
 const [record,setRecord]=useState<any>(initial); const [message,setMessage]=useState(''); const [busy,setBusy]=useState(false);
 const repo={get:()=>record, plots:()=>[record], meta:(key:string)=>sessionStorage.getItem(key), setMeta:(key:string,value:string)=>sessionStorage.setItem(key,value),
 revisePlotArea:(_farm:string,_id:string,area:number,date:string,reason:any)=>{if(area>10000)throw new Error('PLOT_AREA_EXCEEDS_FARM');setRecord({...record,data:reviseArea(record.data,area,date,reason,()=>crypto.randomUUID())});}};
 const value={repo,areaUnit:'squareMetres',busy,text:(key:any)=>t('en',key),action:async(fn:any)=>{setBusy(true);try{await fn();}finally{setBusy(false);}},sync:async()=>{},setMessage,displayArea:(n:number|null)=>n===null?'Unknown':n+' m²'};
 return <Context.Provider value={value}><p>Component preview · fake data · farm limit 10,000 m²</p>{children}<p role="status">{message === 'saved' ? 'Saved in preview' : message} · Saved area: {record.data.areaM2 ?? 'Unknown'}</p></Context.Provider>;
}
