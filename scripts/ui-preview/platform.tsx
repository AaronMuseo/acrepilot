export const isExpoGo=true;
export const request=async()=>{throw new Error('Preview only');};
export const router={replace:(route:string)=>window.dispatchEvent(new CustomEvent('preview-route',{detail:route}))};
export { View as SafeAreaView } from 'react-native';
