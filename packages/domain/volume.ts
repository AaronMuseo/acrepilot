export type StorageCapacity={amountText:string;unit:'litres'|'cubicMetres';litres:number};
export function storageCapacity(amountText:string,unit:StorageCapacity['unit']):StorageCapacity|null{
 if(!amountText.trim())return null;
 const normalized=amountText.trim();if(!/^\d{1,12}(\.\d{1,3})?$/.test(normalized))throw new Error('INVALID_CAPACITY');
 const litres=Number(normalized)*(unit==='cubicMetres'?1000:1);
 if(!Number.isFinite(litres)||litres<=0||litres>1e12)throw new Error('INVALID_CAPACITY');return{amountText:normalized,unit,litres};
}
