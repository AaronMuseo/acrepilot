export type LeaseCost = {amountMinor:number; amountText:string; currency:'KES'; basis:'acres'|'hectares'|'squareMetres'|'plot'; period:'monthly'|'yearly'|'seasonal'|'wholeLease'; areaM2:number|null};
export function parseKes(value:string):number {
 const normalized=value.trim();
 if(!/^\d{1,10}(\.\d{1,2})?$/.test(normalized))throw new Error('INVALID_LEASE_COST');
 const [whole,fraction='']=normalized.split('.');const amount=BigInt(whole)*100n+BigInt(fraction.padEnd(2,'0'));
 if(amount>999999999999n)throw new Error('INVALID_LEASE_COST');return Number(amount);
}
function decimal(value:number):[bigint,bigint]{const text=String(value);const [mantissa,exp='0']=text.toLowerCase().split('e');const [whole,fraction='']=mantissa.split('.');const power=fraction.length-Number(exp);return power>=0?[BigInt(whole+fraction),10n**BigInt(power)]:[BigInt(whole+fraction)*10n**BigInt(-power),1n];}
/** Round once to the nearest minor unit, half up; never sum binary floating-point money. */
export function estimateLeaseCost(cost:LeaseCost):number|null {
 if(cost.basis==='plot')return cost.amountMinor;if(cost.areaM2===null)return null;
 const [areaN,areaD]=decimal(cost.areaM2);const factors={acres:[40468564224n,10000000n],hectares:[10000n,1n],squareMetres:[1n,1n]} as const;
 const [factorN,factorD]=factors[cost.basis];const n=BigInt(cost.amountMinor)*areaN*factorD,d=areaD*factorN;const result=(n+d/2n)/d;
 if(result>BigInt(Number.MAX_SAFE_INTEGER))throw new Error('LEASE_COST_TOO_LARGE');return Number(result);
}
export const formatKes=(minor:number)=>'KES '+(BigInt(minor)/100n).toLocaleString('en-KE')+'.'+String(minor%100).padStart(2,'0');
