import { todayInKenya } from '../packages/domain/land';
import { parseKes, estimateLeaseCost, type LeaseCost } from '../packages/domain/lease-cost';
import { calendarToLocalDate, localDateToCalendar } from '../packages/domain/calendar';
import { storageCapacity } from '../packages/domain/volume';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { createApp } from '../apps/api/src/app';
import { migration, type Database } from '../apps/api/src/database';
import { Repository, type LocalDatabase } from '../apps/mobile/src/repository';
import { SyncEngine, type SyncTransport } from '../apps/mobile/src/sync';
import { SliceService } from '../apps/api/src/service';
import { areaUnits, validAreaUnit, areaToSquareMetres, squareMetresToArea, acresToSquareMetres } from '../packages/domain';
import { messages } from '../packages/translations';
import { readPreferences, readFarmDraft, saveAreaUnit, saveDraftArea } from '../apps/mobile/src/preferences';
import { storagePolicy } from '../apps/mobile/src/storage-policy';
import type { Operation } from '../packages/contracts';

test('irrigation snapshots retain coverage and plot area through restart, retry and land changes',async()=>{
 const user=await account();const file=join(work,'irrigation.db');let phone=local(user.ownerId,file);const farm=phone.repo.createFarm('Irrigation',10000);const plot=phone.repo.selectedPlot(farm)!.id;
 phone.repo.revisePlotArea(farm,plot,4000,todayInKenya(),'correction');
 const values={observedDate:todayInKenya(),irrigationStatus:'known' as const,methods:['drip','sprinkler'] as ('drip'|'sprinkler')[],irrigatedAreaM2:2000,notes:'Count overlapping area once'};
 const id=phone.repo.recordIrrigation(farm,plot,values);assert.throws(()=>phone.repo.recordIrrigation(farm,plot,{...values,irrigatedAreaM2:4001}));
 phone.close();phone=local(user.ownerId,file);await request('sync/push',{operations:phone.repo.batch()},user.token);await new SyncEngine(phone.repo,transport(user.token)).run();assert.equal(phone.repo.pending().length,0);
 phone.repo.revisePlotArea(farm,plot,1000,todayInKenya(),'reduction');await new SyncEngine(phone.repo,transport(user.token)).run();const data=phone.repo.get(id)!.data;assert.ok(data.kind==='irrigation');assert.equal(data.plotAreaM2,4000);assert.equal(data.irrigatedAreaM2,2000);assert.equal(data.methods.length,2);assert.equal(phone.repo.irrigations(plot).length,1);phone.close();
});

test('irrigation unknown, none and known coverage validate independently',async()=>{
 const user=await account();const phone=local(user.ownerId);const farm=phone.repo.createFarm('Unknown size',null);const plot=phone.repo.selectedPlot(farm)!.id;
 const base={observedDate:todayInKenya(),irrigationStatus:'unknown' as const,methods:[],irrigatedAreaM2:null,notes:''};
 phone.repo.recordIrrigation(farm,plot,base);phone.repo.recordIrrigation(farm,plot,{...base,irrigationStatus:'none',irrigatedAreaM2:0});phone.repo.recordIrrigation(farm,plot,{...base,irrigationStatus:'known',methods:['manualWatering'],irrigatedAreaM2:20});
 for(const bad of [{...base,irrigationStatus:'known' as const},{...base,irrigatedAreaM2:0},{...base,irrigationStatus:'none' as const,methods:['drip' as const],irrigatedAreaM2:0},{...base,irrigationStatus:'known' as const,methods:['drip' as const,'drip' as const]}, {...base,observedDate:'2999-01-01'}])assert.throws(()=>phone.repo.recordIrrigation(farm,plot,bad));
 await new SyncEngine(phone.repo,transport(user.token)).run();assert.equal(phone.repo.pending().length,0);assert.equal(phone.repo.irrigations(plot).length,3);assert.ok(phone.repo.irrigations(plot).every(r=>r.data.plotAreaM2===null));phone.close();
});

test('irrigation API protects parents, history, snapshot bounds and offline historical areas',async()=>{
 const user=await account();const stranger=await account();const a=local(user.ownerId),b=local(user.ownerId);const farm=a.repo.createFarm('Owned irrigation',10000);const plot=a.repo.selectedPlot(farm)!.id;const other=a.repo.createFarm('Other',null);
 a.repo.revisePlotArea(farm,plot,4000,todayInKenya(),'correction');await new SyncEngine(a.repo,transport(user.token)).run();await new SyncEngine(b.repo,transport(user.token)).run();
 const id=b.repo.recordIrrigation(farm,plot,{observedDate:todayInKenya(),irrigationStatus:'known',methods:['drip'],irrigatedAreaM2:2000,notes:''});a.repo.revisePlotArea(farm,plot,1000,todayInKenya(),'reduction');await new SyncEngine(a.repo,transport(user.token)).run();await new SyncEngine(b.repo,transport(user.token)).run();assert.equal(b.repo.pending().length,0);
 const record=b.repo.get(id)!;assert.ok(record.data.kind==='irrigation');const push=async(data:any,recordId:string=randomUUID(),baseVersion=0,token=user.token)=>request('sync/push',{operations:[{operationId:randomUUID(),deviceId:randomUUID(),recordId,baseVersion,data}]},token);
 assert.equal((await push({...record.data,notes:'rewrite'},id,record.version)).body.acknowledgements[0].code,'OBSERVATION_IMMUTABLE');assert.equal((await push({...record.data,farmId:other})).body.acknowledgements[0].code,'PARENT_NOT_FOUND');assert.equal((await push(record.data,randomUUID(),0,stranger.token)).body.acknowledgements[0].code,'PARENT_NOT_FOUND');
 assert.equal((await push({...record.data,plotAreaM2:9000})).body.acknowledgements[0].code,'IRRIGATION_AREA_SNAPSHOT_INVALID');assert.equal((await push({...record.data,irrigatedAreaM2:4001})).status,400);assert.equal((await push({...record.data,observedDate:'2999-01-01'})).body.acknowledgements[0].code,'OBSERVATION_DATE_INVALID');a.close();b.close();
});

test('shared water sources retain unknowns and plot links through offline restart and retry',async()=>{
 const user=await account();const file=join(work,'water-sources.db');let phone=local(user.ownerId,file);
 const farm=phone.repo.createFarm('Sources',null);const first=phone.repo.selectedPlot(farm)!.id;const second=phone.repo.createPlot(farm,'Second');
 const id=phone.repo.saveWaterSource(farm,{name:'Borehole',sourceType:'borehole',reliability:'unknown',plotIds:[first,second],notes:'Shared supply',shortageNotes:'Dry months'});
 phone.close();phone=local(user.ownerId,file);await request('sync/push',{operations:phone.repo.batch()},user.token);await new SyncEngine(phone.repo,transport(user.token)).run();
 assert.equal(phone.repo.pending().length,0);const data=phone.repo.waterSources(farm)[0].data;assert.equal(data.reliability,'unknown');assert.equal(data.plotIds.length,2);assert.equal(data.shortageNotes,'Dry months');
 phone.repo.saveWaterSource(farm,{...data,name:'Updated source',sourceType:'unknown',reliability:'seasonal',plotIds:[]},id);await new SyncEngine(phone.repo,transport(user.token)).run();assert.equal(phone.repo.waterSources(farm)[0].data.name,'Updated source');assert.equal(phone.repo.waterObservations(first).length,0);assert.equal(phone.repo.waterStorage(farm).length,0);
 assert.throws(()=>phone.repo.saveWaterSource(farm,{...data,plotIds:[randomUUID()]}),/PLOT_NOT_FOUND/);assert.throws(()=>phone.repo.saveWaterSource(farm,{...data,name:' '}));phone.close();
});

test('water source parent and plot links are checked by the API',async()=>{
 const user=await account();const stranger=await account();const phone=local(user.ownerId);const farm=phone.repo.createFarm('Storage owned',null);const other=phone.repo.createFarm('Other',null);
 const plot=phone.repo.selectedPlot(farm)!.id;const foreignPlot=phone.repo.selectedPlot(other)!.id;
 const id=phone.repo.saveWaterSource(farm,{name:'Tank',sourceType:'unknown',reliability:'unknown',shortageNotes:'',plotIds:[plot],notes:''});await new SyncEngine(phone.repo,transport(user.token)).run();
 const record=phone.repo.get(id)!;assert.ok(record.data.kind==='waterSource');
 const push=async(data:any,recordId:string=randomUUID(),baseVersion=0,token=user.token)=>request('sync/push',{operations:[{operationId:randomUUID(),deviceId:randomUUID(),recordId,baseVersion,data}]},token);
 assert.equal((await push({...record.data,farmId:other,plotIds:[]},id,record.version)).body.acknowledgements[0].code,'PARENT_IMMUTABLE');
 assert.equal((await push({...record.data,plotIds:[foreignPlot]})).body.acknowledgements[0].code,'PARENT_NOT_FOUND');
 assert.equal((await push(record.data,randomUUID(),0,stranger.token)).body.acknowledgements[0].code,'PARENT_NOT_FOUND');
 assert.equal((await push({...record.data,plotIds:[plot,plot]})).status,400);
 assert.equal((await push({...record.data,sourceType:'invented'})).status,400);phone.close();
});

test('water-source edits from two devices retain both values for explicit conflict recovery',async()=>{
 const user=await account();const a=local(user.ownerId);const b=local(user.ownerId);const farm=a.repo.createFarm('Shared resources',null);
 const id=a.repo.saveWaterSource(farm,{name:'Tank',sourceType:'borehole',reliability:'unknown',shortageNotes:'',plotIds:[],notes:''});
 await new SyncEngine(a.repo,transport(user.token)).run();await new SyncEngine(b.repo,transport(user.token)).run();
 const values={name:'Source',plotIds:[],notes:'',sourceType:'borehole' as const,shortageNotes:''};a.repo.saveWaterSource(farm,{...values,reliability:'reliable'},id);b.repo.saveWaterSource(farm,{...values,reliability:'seasonal'},id);
 await new SyncEngine(a.repo,transport(user.token)).run();await new SyncEngine(b.repo,transport(user.token)).run();assert.ok(b.repo.pending()[0].failure);
 b.repo.resolve(id,'mine');await new SyncEngine(b.repo,transport(user.token)).run();assert.equal(b.repo.pending().length,0);assert.equal((b.repo.get(id)!.data as any).reliability,'seasonal');assert.equal(b.repo.db.getAllSync('SELECT * FROM resolutions').length,1);a.close();b.close();
});

test('water storage retains capacity units, shared plot links and edits through offline retry',async()=>{
 assert.equal(storageCapacity('2.500','cubicMetres')!.litres,2500);assert.equal(storageCapacity('','litres'),null);
 for(const value of ['0','-1','1.0001','NaN','1e3'])assert.throws(()=>storageCapacity(value,'litres'));
 const user=await account();const file=join(work,'water-storage.db');let phone=local(user.ownerId,file);
 const farm=phone.repo.createFarm('Storage farm',null);const first=phone.repo.selectedPlot(farm)!.id;const second=phone.repo.createPlot(farm,'Second');
 const id=phone.repo.saveWaterStorage(farm,{name:'Tank',capacity:storageCapacity('2.500','cubicMetres'),plotIds:[first,second],notes:'Shared tank'});
 phone.close();phone=local(user.ownerId,file);
 await request('sync/push',{operations:phone.repo.batch()},user.token);await new SyncEngine(phone.repo,transport(user.token)).run();
 assert.equal(phone.repo.pending().length,0);let record=phone.repo.get(id)!;assert.ok(record.data.kind==='waterStorage');
 assert.equal(record.data.capacity!.litres,2500);assert.equal(record.data.capacity!.amountText,'2.500');assert.equal(record.data.plotIds.length,2);
 phone.repo.saveWaterStorage(farm,{...record.data,name:'Updated tank',capacity:null,plotIds:[second]},id);
 await new SyncEngine(phone.repo,transport(user.token)).run();record=phone.repo.get(id)!;assert.ok(record.data.kind==='waterStorage');assert.equal(record.data.capacity,null);assert.equal(record.data.name,'Updated tank');
 assert.throws(()=>phone.repo.saveWaterStorage(farm,{name:'Bad',capacity:null,plotIds:[randomUUID()],notes:''}),/PLOT_NOT_FOUND/);phone.close();
});

test('storage resource parent and plot links are checked by the API',async()=>{
 const user=await account();const stranger=await account();const phone=local(user.ownerId);const farm=phone.repo.createFarm('Storage owned',null);const other=phone.repo.createFarm('Other',null);
 const plot=phone.repo.selectedPlot(farm)!.id;const foreignPlot=phone.repo.selectedPlot(other)!.id;
 const id=phone.repo.saveWaterStorage(farm,{name:'Tank',capacity:null,plotIds:[plot],notes:''});await new SyncEngine(phone.repo,transport(user.token)).run();
 const record=phone.repo.get(id)!;assert.ok(record.data.kind==='waterStorage');
 const push=async(data:any,recordId:string=randomUUID(),baseVersion=0,token=user.token)=>request('sync/push',{operations:[{operationId:randomUUID(),deviceId:randomUUID(),recordId,baseVersion,data}]},token);
 assert.equal((await push({...record.data,farmId:other,plotIds:[]},id,record.version)).body.acknowledgements[0].code,'PARENT_IMMUTABLE');
 assert.equal((await push({...record.data,plotIds:[foreignPlot]})).body.acknowledgements[0].code,'PARENT_NOT_FOUND');
 assert.equal((await push(record.data,randomUUID(),0,stranger.token)).body.acknowledgements[0].code,'PARENT_NOT_FOUND');
 assert.equal((await push({...record.data,plotIds:[plot,plot]})).status,400);
 assert.equal((await push({...record.data,capacity:{amountText:'2.5',unit:'cubicMetres',litres:2.5}})).status,400);phone.close();
});

test('storage edits from two devices retain both values for explicit conflict recovery',async()=>{
 const user=await account();const a=local(user.ownerId);const b=local(user.ownerId);const farm=a.repo.createFarm('Shared resources',null);
 const id=a.repo.saveWaterStorage(farm,{name:'Tank',capacity:storageCapacity('1000','litres'),plotIds:[],notes:''});
 await new SyncEngine(a.repo,transport(user.token)).run();await new SyncEngine(b.repo,transport(user.token)).run();
 const values={name:'Tank',plotIds:[],notes:''};a.repo.saveWaterStorage(farm,{...values,capacity:storageCapacity('2000','litres')},id);b.repo.saveWaterStorage(farm,{...values,capacity:storageCapacity('3000','litres')},id);
 await new SyncEngine(a.repo,transport(user.token)).run();await new SyncEngine(b.repo,transport(user.token)).run();assert.ok(b.repo.pending()[0].failure);
 b.repo.resolve(id,'mine');await new SyncEngine(b.repo,transport(user.token)).run();assert.equal(b.repo.pending().length,0);assert.equal((b.repo.get(id)!.data as any).capacity.litres,3000);assert.equal(b.repo.db.getAllSync('SELECT * FROM resolutions').length,1);a.close();b.close();
});

test('plot slope drainage and access snapshots survive offline restart and retry with unknowns explicit',async()=>{
 const user=await account();const file=join(work,'plot-conditions.db');let phone=local(user.ownerId,file);
 const farm=phone.repo.createFarm('Conditions',null);const plot=phone.repo.selectedPlot(farm)!.id;
 const values={observedDate:todayInKenya(),slope:'gentle' as const,drainage:'poorDrainage' as const,roadAccess:'seasonalAccess' as const,notes:'Test observation'};
 phone.repo.recordPlotCondition(farm,plot,values);
 phone.repo.recordPlotCondition(farm,plot,{...values,slope:'unknown',drainage:'unknown',roadAccess:'unknown',notes:''});
 assert.throws(()=>phone.repo.recordPlotCondition(farm,plot,{...values,observedDate:'2999-01-01'}));
 assert.throws(()=>phone.repo.recordPlotCondition(farm,plot,{...values,notes:'x'.repeat(501)}));
 phone.close();phone=local(user.ownerId,file);
 await request('sync/push',{operations:phone.repo.batch()},user.token);
 await new SyncEngine(phone.repo,transport(user.token)).run();
 assert.equal(phone.repo.pending().length,0);assert.equal(phone.repo.plotConditions(plot).length,2);
 assert.ok(phone.repo.plotConditions(plot).some(r=>r.data.drainage==='poorDrainage'));
 assert.ok(phone.repo.plotConditions(plot).some(r=>r.data.slope==='unknown'));
 assert.equal(phone.repo.conditions(plot).length,0);phone.close();
});

test('physical condition history is immutable and requires matching owned farm and plot',async()=>{
 const user=await account();const stranger=await account();const phone=local(user.ownerId);
 const farm=phone.repo.createFarm('Owned conditions',null);const plot=phone.repo.selectedPlot(farm)!.id;
 const other=phone.repo.createFarm('Other',null);
 const id=phone.repo.recordPlotCondition(farm,plot,{observedDate:todayInKenya(),slope:'flat',drainage:'wellDrained',roadAccess:'allWeather',notes:''});
 await new SyncEngine(phone.repo,transport(user.token)).run();const record=phone.repo.get(id)!;assert.ok(record.data.kind==='plotCondition');
 const push=async(data:any,recordId:string=randomUUID(),baseVersion=0,token=user.token)=>request('sync/push',{operations:[{operationId:randomUUID(),deviceId:randomUUID(),recordId,baseVersion,data}]},token);
 assert.equal((await push({...record.data,notes:'Rewrite'},id,record.version)).body.acknowledgements[0].code,'OBSERVATION_IMMUTABLE');
 assert.equal((await push({...record.data,farmId:other})).body.acknowledgements[0].code,'PARENT_NOT_FOUND');
 assert.equal((await push(record.data,randomUUID(),0,stranger.token)).body.acknowledgements[0].code,'PARENT_NOT_FOUND');
 assert.equal((await push({...record.data,slope:'assumed'})).status,400);
 assert.equal((await push({...record.data,observedDate:'2999-01-01'})).body.acknowledgements[0].code,'OBSERVATION_DATE_INVALID');phone.close();
});

test('explicit soil copies keep editable independent values and provenance through offline retry',async()=>{
 const user=await account();const file=join(work,'soil-copy.db');let phone=local(user.ownerId,file);
 const farm=phone.repo.createFarm('Copy farm',null);const sourcePlot=phone.repo.selectedPlot(farm)!.id;const target=phone.repo.createPlot(farm,'Target');
 const values={observedDate:todayInKenya(),soilType:'clay' as const,textureNotes:'Source texture',fertilityNotes:'Source notes'};
 const source=phone.repo.recordSoil(farm,sourcePlot,values);
 const copied=phone.repo.recordSoil(farm,target,{...values,soilType:'loam',textureNotes:'Edited for target',copiedFrom:source});
 assert.throws(()=>phone.repo.recordSoil(farm,sourcePlot,{...values,copiedFrom:source}),/COPY_SOURCE_NOT_FOUND/);
 assert.throws(()=>phone.repo.recordSoil(farm,target,{...values,copiedFrom:randomUUID()}),/COPY_SOURCE_NOT_FOUND/);
 phone.close();phone=local(user.ownerId,file);
 await request('sync/push',{operations:phone.repo.batch()},user.token);await new SyncEngine(phone.repo,transport(user.token)).run();
 assert.equal(phone.repo.pending().length,0);
 const data=phone.repo.get(copied)!.data;assert.ok(data.kind==='condition');assert.equal(data.source,'copied_self_reported');assert.equal(data.copiedFrom,source);assert.equal(data.soilType,'loam');
 assert.equal((phone.repo.get(source)!.data as any).textureNotes,'Source texture');
 const other=phone.repo.createFarm('Other',null);const otherPlot=phone.repo.selectedPlot(other)!.id;
 assert.throws(()=>phone.repo.recordSoil(other,otherPlot,{...values,copiedFrom:source}),/COPY_SOURCE_NOT_FOUND/);phone.close();
});

test('server validates soil copy ownership and rejects fabricated or missing provenance',async()=>{
 const user=await account();const other=await account();const phone=local(user.ownerId);const farm=phone.repo.createFarm('Source',null);const sourcePlot=phone.repo.selectedPlot(farm)!.id;const target=phone.repo.createPlot(farm,'Target');
 const source=phone.repo.recordSoil(farm,sourcePlot,{observedDate:todayInKenya(),soilType:'sandy',textureNotes:'',fertilityNotes:''});
 await new SyncEngine(phone.repo,transport(user.token)).run();
 const data={kind:'condition',farmId:farm,plotId:target,observedDate:todayInKenya(),soilType:'clay',textureNotes:'Edited',fertilityNotes:'',source:'copied_self_reported',copiedFrom:source};
 const push=async(value:any,token=user.token)=>request('sync/push',{operations:[{operationId:randomUUID(),deviceId:randomUUID(),recordId:randomUUID(),baseVersion:0,data:value}]},token);
 assert.equal((await push(data)).body.acknowledgements[0].status,'accepted');
 assert.equal((await push({...data,copiedFrom:randomUUID()})).body.acknowledgements[0].code,'COPY_SOURCE_NOT_FOUND');
 assert.equal((await push(data,other.token)).body.acknowledgements[0].code,'COPY_SOURCE_NOT_FOUND');
 assert.equal((await push({...data,plotId:sourcePlot})).body.acknowledgements[0].code,'COPY_SOURCE_NOT_FOUND');
 assert.equal((await push({...data,copiedFrom:undefined})).status,400);
 assert.equal((await push({...data,source:'self_reported'})).status,400);phone.close();
});

test('lease money uses exact minor units and rounds once across area bases',()=>{
 assert.equal(parseKes('1234.50'),123450);assert.equal(parseKes('0'),0);assert.equal(parseKes('001.20'),120);
 for(const value of ['', '-1','1.001','1,000','1e3','10000000000.00'])assert.throws(()=>parseKes(value));
 const base:LeaseCost={amountMinor:100000,amountText:'1000',currency:'KES',basis:'acres',period:'yearly',areaM2:4046.8564224};
 assert.equal(estimateLeaseCost(base),100000);
 assert.equal(estimateLeaseCost({...base,areaM2:8093.7128448}),200000);
 assert.equal(estimateLeaseCost({...base,basis:'hectares',areaM2:25000}),250000);
 assert.equal(estimateLeaseCost({...base,basis:'plot',areaM2:null}),100000);
 assert.equal(estimateLeaseCost({...base,areaM2:null}),null);
 assert.equal(estimateLeaseCost({...base,basis:'squareMetres',amountMinor:1,areaM2:0.5}),1);
 assert.throws(()=>estimateLeaseCost({...base,basis:'squareMetres',amountMinor:999999999999,areaM2:1e9}));
 for(const value of ['2026-01-01','2026-10-18','2028-02-29'])assert.equal(localDateToCalendar(calendarToLocalDate(value)),value);
});

test('lease rates retain original precision and area snapshot through restart and retries',async()=>{
 const user=await account();const file=join(work,'lease-cost.db');let phone=local(user.ownerId,file);
 const farm=phone.repo.createFarm('Priced',10000);const plot=phone.repo.selectedPlot(farm)!.id;
 phone.repo.revisePlotArea(farm,plot,4046.8564224,todayInKenya(),'correction');
 const leaseCost:LeaseCost={amountMinor:125050,amountText:'1250.50',currency:'KES',basis:'acres',period:'yearly',areaM2:4046.8564224};
 const values={observedDate:todayInKenya(),tenureType:'leased' as const,leaseStart:null,leaseEnd:null,notes:'Test cost',leaseCost};
 const id=phone.repo.recordTenure(farm,plot,values);
 phone.close();phone=local(user.ownerId,file);
 await request('sync/push',{operations:phone.repo.batch()},user.token);
 await new SyncEngine(phone.repo,transport(user.token)).run();assert.equal(phone.repo.pending().length,0);
 phone.repo.revisePlotArea(farm,plot,8093.7128448,todayInKenya(),'correction');
 await new SyncEngine(phone.repo,transport(user.token)).run();
 const data=phone.repo.get(id)!.data;assert.ok(data.kind==='tenure');assert.equal(data.leaseCost!.amountText,'1250.50');
 assert.equal(estimateLeaseCost(data.leaseCost!),125050);
 assert.throws(()=>phone.repo.recordTenure(farm,plot,{...values,tenureType:'owned'}));
 assert.throws(()=>phone.repo.recordTenure(farm,plot,{...values,leaseCost:{...leaseCost,amountMinor:1}}));
 const result=await request('sync/push',{operations:[{operationId:randomUUID(),deviceId:randomUUID(),recordId:randomUUID(),baseVersion:0,data:{...data,leaseCost:{...leaseCost,amountMinor:0.5}}}]},user.token);
 assert.equal(result.status,400);phone.close();
});

test('tenure history persists offline, validates leases and preserves immutable owned snapshots',async()=>{
 const user=await account();const stranger=await account();const file=join(work,'tenure.db');let phone=local(user.ownerId,file);
 const farm=phone.repo.createFarm('Tenure farm',null);const plot=phone.repo.selectedPlot(farm)!.id;
 const values={observedDate:todayInKenya(),tenureType:'leased' as const,leaseStart:'2026-01-01',leaseEnd:'2027-01-01',notes:'Test agreement'};
 const id=phone.repo.recordTenure(farm,plot,values);
 phone.repo.recordTenure(farm,plot,{...values,tenureType:'unknown',leaseStart:null,leaseEnd:null});
 assert.throws(()=>phone.repo.recordTenure(farm,plot,{...values,leaseEnd:'2025-01-01'}));
 assert.throws(()=>phone.repo.recordTenure(farm,plot,{...values,tenureType:'owned'}));
 assert.throws(()=>phone.repo.recordTenure(farm,plot,{...values,observedDate:'2999-01-01'}));
 phone.close();phone=local(user.ownerId,file);
 await request('sync/push',{operations:phone.repo.batch()},user.token);
 await new SyncEngine(phone.repo,transport(user.token)).run();
 assert.equal(phone.repo.pending().length,0);assert.equal(phone.repo.tenures(plot).length,2);
 const record=phone.repo.get(id)!;assert.ok(record.data.kind==='tenure');assert.equal(record.data.leaseEnd,'2027-01-01');
 const push=async(data:any,recordId:string=randomUUID(),baseVersion=0,token=user.token)=>request('sync/push',{operations:[{operationId:randomUUID(),deviceId:randomUUID(),recordId,baseVersion,data}]},token);
 assert.equal((await push({...record.data,notes:'Rewrite'},id,record.version)).body.acknowledgements[0].code,'OBSERVATION_IMMUTABLE');
 assert.equal((await push(record.data,randomUUID(),0,stranger.token)).body.acknowledgements[0].code,'PARENT_NOT_FOUND');
 assert.equal((await push({...record.data,plotId:randomUUID()})).body.acknowledgements[0].code,'PARENT_NOT_FOUND');
 assert.equal((await push({...record.data,leaseStart:'2026-02-30'})).status,400);
 phone.close();
});

test('soil report pH records persist offline with immutable history and owned plot links',async()=>{
  const user=await account();const stranger=await account();const file=join(work,'soil-tests.db');let phone=local(user.ownerId,file);
  const farm=phone.repo.createFarm('Report farm',null);const plot=phone.repo.selectedPlot(farm)!.id;
  const values={observedDate:todayInKenya(),ph:6.5,reportReference:'Test report ABC'};
  const id=phone.repo.recordSoilTest(farm,plot,values);phone.repo.recordSoilTest(farm,plot,{...values,ph:7});
  assert.throws(()=>phone.repo.recordSoilTest(farm,plot,{...values,ph:14.1}));
  assert.throws(()=>phone.repo.recordSoilTest(farm,plot,{...values,ph:-1}));
  assert.throws(()=>phone.repo.recordSoilTest(farm,plot,{...values,ph:NaN}));
  assert.throws(()=>phone.repo.recordSoilTest(farm,plot,{...values,observedDate:'2999-01-01'}));
  phone.close();phone=local(user.ownerId,file);
  await request('sync/push',{operations:phone.repo.batch()},user.token);
  await new SyncEngine(phone.repo,transport(user.token)).run();
  assert.equal(phone.repo.pending().length,0);assert.equal(phone.repo.soilTests(plot).length,2);
  const record=phone.repo.get(id)!;assert.ok(record.data.kind==='soilTest');assert.equal(record.data.ph,6.5);
  const push=async(data:any,recordId:string=randomUUID(),baseVersion=0,token=user.token)=>request('sync/push',{operations:[{operationId:randomUUID(),deviceId:randomUUID(),recordId,baseVersion,data}]},token);
  assert.equal((await push({...record.data,ph:8},id,record.version)).body.acknowledgements[0].code,'OBSERVATION_IMMUTABLE');
  assert.equal((await push(record.data,randomUUID(),0,stranger.token)).body.acknowledgements[0].code,'PARENT_NOT_FOUND');
  assert.equal((await push({...record.data,plotId:randomUUID()})).body.acknowledgements[0].code,'PARENT_NOT_FOUND');
  assert.equal((await push({...record.data,ph:15})).status,400);
  assert.equal((await push({...record.data,reportReference:'x'.repeat(201)})).status,400);
  phone.close();
});

test('water observations preserve multiple sources and unknown/none through offline restart and sync', async () => {
  const user=await account(); const file=join(work,'water.db'); let phone=local(user.ownerId,file);
  const farm=phone.repo.createFarm('Water farm',null); const plot=phone.repo.selectedPlot(farm)!.id;
  const base={observedDate:todayInKenya(),sourceKnowledge:'known' as const,sources:['rainfall','borehole'] as ('rainfall'|'borehole')[],reliability:'seasonal' as const,shortageNotes:'Dry months',sourceNotes:'Shared borehole'};
  phone.repo.recordWater(farm,plot,base);
  phone.repo.recordWater(farm,plot,{...base,sourceKnowledge:'unknown',sources:[],reliability:'unknown'});
  phone.repo.recordWater(farm,plot,{...base,sourceKnowledge:'none',sources:[],reliability:'unknown'});
  assert.throws(()=>phone.repo.recordWater(farm,plot,{...base,sources:[]}));
  assert.throws(()=>phone.repo.recordWater(farm,plot,{...base,sources:['rainfall','rainfall']}));
  assert.throws(()=>phone.repo.recordWater(farm,plot,{...base,sourceKnowledge:'unknown'}));
  assert.throws(()=>phone.repo.recordWater(farm,plot,{...base,observedDate:'2999-01-01'}),/OBSERVATION_DATE_INVALID/);
  phone.close();phone=local(user.ownerId,file);
  await request('sync/push',{operations:phone.repo.batch()},user.token);
  await new SyncEngine(phone.repo,transport(user.token)).run();
  assert.equal(phone.repo.pending().length,0);assert.equal(phone.repo.waterObservations(plot).length,3);
  assert.deepEqual(phone.repo.waterObservations(plot).find(r=>r.data.sourceKnowledge==='known')!.data.sources,['rainfall','borehole']);
  assert.equal(phone.repo.conditions(plot).length,0);phone.close();
});

test('water observation API enforces immutable history, source validity and matching owned parents', async()=>{
  const user=await account();const stranger=await account();const phone=local(user.ownerId);
  const farm=phone.repo.createFarm('Owned',null);const plot=phone.repo.selectedPlot(farm)!.id;const other=phone.repo.createFarm('Other',null);
  const id=phone.repo.recordWater(farm,plot,{observedDate:todayInKenya(),sourceKnowledge:'known',sources:['rainfall'],reliability:'unknown',shortageNotes:'',sourceNotes:''});
  await new SyncEngine(phone.repo,transport(user.token)).run();const record=phone.repo.get(id)!;assert.ok(record.data.kind==='waterObservation');
  const push=async(data:any,recordId:string=randomUUID(),baseVersion=0,token=user.token)=>request('sync/push',{operations:[{operationId:randomUUID(),deviceId:randomUUID(),recordId,baseVersion,data}]},token);
  assert.equal((await push({...record.data,shortageNotes:'Rewrite'},id,record.version)).body.acknowledgements[0].code,'OBSERVATION_IMMUTABLE');
  assert.equal((await push({...record.data,farmId:other})).body.acknowledgements[0].code,'PARENT_NOT_FOUND');
  assert.equal((await push(record.data,randomUUID(),0,stranger.token)).body.acknowledgements[0].code,'PARENT_NOT_FOUND');
  assert.equal((await push({...record.data,sources:[]})).status,400);
  assert.equal((await push({...record.data,sourceNotes:'x'.repeat(501)})).status,400);
  phone.close();
});

test('soil observations retain distinct offline history through restart and lost acknowledgements', async () => {
  const user = await account(); const file = join(work,'soil.db'); let phone = local(user.ownerId,file);
  const farm = phone.repo.createFarm('Soil test farm',null); const plot = phone.repo.selectedPlot(farm)!.id;
  const values = {observedDate:todayInKenya(),soilType:'clay' as const,textureNotes:'Sticky when wet',fertilityNotes:''};
  phone.repo.recordSoil(farm,plot,values);
  phone.repo.recordSoil(farm,plot,{...values,soilType:'unknown',textureNotes:'Needs another observation'});
  phone.close(); phone=local(user.ownerId,file);
  assert.equal(phone.repo.conditions(plot).length,2);
  await request('sync/push',{operations:phone.repo.batch()},user.token);
  await new SyncEngine(phone.repo,transport(user.token)).run();
  assert.equal(phone.repo.pending().length,0); assert.equal(phone.repo.conditions(plot).length,2);
  assert.ok(phone.repo.conditions(plot).some(r=>r.data.textureNotes==='Sticky when wet'));
  const other = phone.repo.createFarm('Other',null);
  assert.throws(()=>phone.repo.recordSoil(other,plot,values),/PLOT_NOT_FOUND/);
  assert.throws(()=>phone.repo.recordSoil(farm,plot,{...values,observedDate:'2999-01-01'}),/OBSERVATION_DATE_INVALID/);
  assert.throws(()=>phone.repo.recordSoil(farm,plot,{...values,observedDate:'2026-02-30'}));
  phone.close();
});

test('soil snapshots are immutable and require matching owned farm and plot parents', async () => {
  const user=await account(); const stranger=await account(); const phone=local(user.ownerId);
  const farm=phone.repo.createFarm('Owned',null); const plot=phone.repo.selectedPlot(farm)!.id;
  const other=phone.repo.createFarm('Other',null);
  const id=phone.repo.recordSoil(farm,plot,{observedDate:todayInKenya(),soilType:'loam',textureNotes:'',fertilityNotes:''});
  await new SyncEngine(phone.repo,transport(user.token)).run();
  const record=phone.repo.get(id)!; assert.ok(record.data.kind==='condition');
  const push=async(data:any,recordId:string=randomUUID(),baseVersion=0,token=user.token)=>
    (await request('sync/push',{operations:[{operationId:randomUUID(),deviceId:randomUUID(),recordId,baseVersion,data}]},token)).body;
  assert.equal((await push({...record.data,textureNotes:'Rewrite'},id,record.version)).acknowledgements[0].code,'OBSERVATION_IMMUTABLE');
  assert.equal((await push({...record.data,farmId:other})).acknowledgements[0].code,'PARENT_NOT_FOUND');
  assert.equal((await push(record.data,randomUUID(),0,stranger.token)).acknowledgements[0].code,'PARENT_NOT_FOUND');
  assert.equal((await push({...record.data,observedDate:'2999-01-01'})).acknowledgements[0].code,'OBSERVATION_DATE_INVALID');
  assert.equal((await request('sync/push',{operations:[{operationId:randomUUID(),deviceId:randomUUID(),recordId:randomUUID(),baseVersion:0,data:{...record.data,textureNotes:'x'.repeat(501)}}]},user.token)).status,400);
  phone.close();
});

test('plot measurement history persists offline and enforces local farm capacity', async () => {
  const user = await account(); const file = join(work, 'plot-areas.db'); let phone = local(user.ownerId, file);
  const farm = phone.repo.createFarm('Measured', 10000); const first = phone.repo.selectedPlot(farm)!.id;
  const second = phone.repo.createPlot(farm, 'Second');
  phone.repo.revisePlotArea(farm, first, 6000, todayInKenya(), 'correction');
  assert.throws(() => phone.repo.revisePlotArea(farm, second, 5000, todayInKenya(), 'correction'), /PLOT_AREA_EXCEEDS_FARM/);
  phone.repo.revisePlotArea(farm, second, 4000, todayInKenya(), 'correction');
  assert.throws(() => phone.repo.reviseFarmArea(farm, 9000, todayInKenya(), 'reduction'), /PLOT_AREA_EXCEEDS_FARM/);
  phone.close(); phone = local(user.ownerId, file);
  await new SyncEngine(phone.repo, transport(user.token)).run();
  assert.equal(phone.repo.pending().length, 0);
  const data = phone.repo.get(first)!.data; assert.ok(data.kind === 'plot');
  assert.deepEqual(data.areaHistory!.map(r => r.areaM2), [null, 6000]);
  phone.repo.revisePlotArea(farm, first, 5000, todayInKenya(), 'reduction');
  phone.repo.reviseFarmArea(farm, 9000, todayInKenya(), 'reduction');
  await new SyncEngine(phone.repo, transport(user.token)).run();
  assert.equal(phone.repo.pending().length, 0); phone.close();
});

test('concurrent plot allocations cannot overfill a farm and can recover using server values', async () => {
  const user = await account(); const a = local(user.ownerId); const b = local(user.ownerId);
  const farm = a.repo.createFarm('Shared', 10000); const first = a.repo.selectedPlot(farm)!.id;
  const second = a.repo.createPlot(farm, 'Second');
  await new SyncEngine(a.repo, transport(user.token)).run(); await new SyncEngine(b.repo, transport(user.token)).run();
  a.repo.revisePlotArea(farm, first, 7000, todayInKenya(), 'correction');
  b.repo.revisePlotArea(farm, second, 6000, todayInKenya(), 'correction');
  await Promise.all([new SyncEngine(a.repo, transport(user.token)).run(), new SyncEngine(b.repo, transport(user.token)).run()]);
  const loser = a.repo.pending().length ? a : b; const id = loser === a ? first : second;
  const failure = JSON.parse(loser.repo.pending()[0].failure!);
  assert.equal(failure.code, 'PLOT_AREA_EXCEEDS_FARM'); assert.equal(failure.status, 'conflict');
  loser.repo.resolve(id, 'server'); await new SyncEngine(loser.repo, transport(user.token)).run();
  loser.repo.revisePlotArea(farm, id, 3000, todayInKenya(), 'correction');
  await new SyncEngine(loser.repo, transport(user.token)).run(); assert.equal(loser.repo.pending().length, 0);
  const row = loser.repo.get(id)!; assert.ok(row.data.kind === 'plot');
  const forged = {...row.data, areaM2: 1000, areaHistory: undefined};
  const result = await request('sync/push', {operations:[{operationId:randomUUID(), deviceId:randomUUID(), recordId:id, baseVersion:row.version, data:forged}]}, user.token);
  assert.equal(result.body.acknowledgements[0].code, 'AREA_HISTORY_REQUIRED');
  a.close(); b.close();
});

test('legacy plot measurements materialize atomically and unknown farm totals remain unknown', async () => {
  const user = await account(); const phone = local(user.ownerId); const farm = randomUUID(); const plotId = randomUUID();
  phone.repo.save(farm, {kind:'farm', name:'Legacy', plotId, areaM2:null, location:null, soil:'unknown', water:'unknown'});
  phone.repo.revisePlotArea(farm, plotId, 5000, todayInKenya(), 'correction');
  await new SyncEngine(phone.repo, transport(user.token)).run();
  assert.equal(phone.repo.pending().length,0); assert.equal((phone.repo.get(farm)!.data as any).areaM2,null);
  assert.throws(() => phone.repo.reviseFarmArea(farm,4000,todayInKenya(),'correction'), /PLOT_AREA_EXCEEDS_FARM/);
  phone.close();
});

test('plots retain per-farm selection, names and links across offline restart and retry', async () => {
  const user = await account(); const file = join(work, 'plots.db'); let phone = local(user.ownerId, file);
  const farm = phone.repo.createFarm('Main', 10000); const other = phone.repo.createFarm('Other', null);
  const original = phone.repo.selectedPlot(farm)!;
  const added = phone.repo.createPlot(farm, 'North'); phone.repo.renamePlot(farm, added, 'North field');
  const otherPlot = phone.repo.createPlot(other, 'Garden');
  assert.equal(phone.repo.selectedPlot(farm)!.id, added);
  assert.equal(phone.repo.selectedPlot(other)!.id, otherPlot);
  assert.throws(() => phone.repo.selectPlot(other, added), /PLOT_NOT_FOUND/);
  assert.throws(() => phone.repo.renamePlot(other, added, 'Wrong farm'), /PLOT_NOT_FOUND/);
  assert.throws(() => phone.repo.createPlot(farm, '  '));
  phone.close(); phone = local(user.ownerId, file);
  assert.equal(phone.repo.selectedPlot(farm)!.id, added);
  const batch = phone.repo.batch(); await request('sync/push', {operations: batch}, user.token); // Lost response.
  await new SyncEngine(phone.repo, transport(user.token)).run();
  assert.equal(phone.repo.pending().length, 0); assert.equal(phone.repo.plots(farm).length, 2);
  assert.equal(phone.repo.get(added)!.data.kind, 'plot');
  assert.equal((phone.repo.get(added)!.data as any).name, 'North field');
  assert.equal((phone.repo.get(farm)!.data as any).areaM2, 10000);
  assert.equal((phone.repo.get(original.id)!.data as any).areaM2, null);
  phone.repo.selectPlot(farm, original.id); phone.close();
});

test('plot parent ownership, kind and immutability are enforced by the server', async () => {
  const user = await account(); const stranger = await account(); const phone = local(user.ownerId);
  const farm = phone.repo.createFarm('Owned', null); const other = phone.repo.createFarm('Other', null);
  await new SyncEngine(phone.repo, transport(user.token)).run();
  const plot = phone.repo.selectedPlot(farm)!; assert.ok(plot.data.kind === 'plot');
  const operation = (farmId: string, recordId: string = randomUUID(), baseVersion = 0): Operation => ({
    operationId: randomUUID(), deviceId: randomUUID(), recordId, baseVersion,
    data: {kind: 'plot', farmId, name: 'Plot', areaM2: null, soil: 'unknown', water: 'unknown'},
  });
  const push = async (op: Operation, token = user.token) => (await request('sync/push', {operations:[op]}, token)).body.acknowledgements[0];
  assert.equal((await push(operation(farm), stranger.token)).code, 'PARENT_NOT_FOUND');
  assert.equal((await push(operation(plot.id))).code, 'PARENT_NOT_FOUND');
  assert.equal((await push(operation(randomUUID()))).code, 'PARENT_NOT_FOUND');
  assert.equal((await push(operation(other, plot.id, plot.version))).code, 'PARENT_IMMUTABLE');
  phone.close();
});

test('legacy default plot keeps its reserved ID and concurrent names require explicit resolution', async () => {
  const user = await account(); const a = local(user.ownerId); const b = local(user.ownerId);
  const farm = randomUUID(); const plotId = randomUUID();
  a.repo.save(farm, {kind: 'farm', name: 'Legacy', plotId, areaM2: 10000, location: null, soil: 'unknown', water: 'unknown'});
  await new SyncEngine(a.repo, transport(user.token)).run(); await new SyncEngine(b.repo, transport(user.token)).run();
  assert.equal(a.repo.selectedPlot(farm)!.id, plotId); assert.equal(a.repo.pending().length, 0);
  a.repo.renamePlot(farm, plotId, 'First name'); b.repo.renamePlot(farm, plotId, 'Second name');
  await new SyncEngine(a.repo, transport(user.token)).run(); await new SyncEngine(b.repo, transport(user.token)).run();
  assert.ok(b.repo.pending()[0].failure); b.repo.resolve(plotId, 'mine');
  await new SyncEngine(b.repo, transport(user.token)).run();
  assert.equal(b.repo.pending().length, 0); assert.equal(b.repo.plots(farm).length, 1);
  assert.equal((b.repo.get(plotId)!.data as any).name, 'Second name');
  assert.equal(b.repo.db.getAllSync('SELECT * FROM resolutions').length, 1);
  a.close(); b.close();
});

let pg: PGlite; let db: Database; let app: Awaited<ReturnType<typeof createApp>>; let url: string;
const work = mkdtempSync(join(tmpdir(), 'acrepilot-test-'));
before(async () => {
  pg = new PGlite(); await pg.exec(migration()); await pg.exec(migration());
  db = { query: (sql, params) => pg.query(sql, params), transaction: fn => pg.transaction(tx => fn(tx)) };
  app = await createApp(db, true); await app.listen(0, '127.0.0.1'); url = await app.getUrl();
});
after(async () => { await app?.close(); await pg?.close(); rmSync(work, { recursive: true, force: true }); });
async function request(path: string, body?: unknown, token?: string) {
  const response = await fetch(`${url}/v1/${path}`, {method: body === undefined ? 'GET' : 'POST', headers: {'Content-Type': 'application/json', ...(token ? {Authorization: `Bearer ${token}`} : {})}, ...(body === undefined ? {} : {body: JSON.stringify(body)})});
  return {status: response.status, body: await response.json() as any};
}
async function account() {
  const challenge = await request('auth/codes', {identity: `${randomUUID()}@example.test`});
  assert.equal(challenge.status, 201);
  const response = await request('auth/verify', {challengeId: challenge.body.challengeId, code: challenge.body.developmentCode});
  assert.equal(response.status, 201); return response.body as {ownerId: string; token: string; refreshToken: string};
}
function local(ownerId: string, file = ':memory:', deviceId = randomUUID()) {
  const sqlite = new DatabaseSync(file);
  const adapter: LocalDatabase = {
    execSync: sql => sqlite.exec(sql), runSync: (sql, ...args) => sqlite.prepare(sql).run(...args),
    getAllSync: <T>(sql: string, ...args: any[]) => sqlite.prepare(sql).all(...args) as T[],
    getFirstSync: <T>(sql: string, ...args: any[]) => sqlite.prepare(sql).get(...args) as T ?? null,
  };
  return { repo: new Repository(adapter, ownerId, deviceId, randomUUID), close: () => sqlite.close() };
}
function transport(token: string): SyncTransport {
  return { push: async operations => {const r = await request('sync/push', {operations}, token); assert.equal(r.status, 201); return r.body;}, pull: async cursor => {const r = await request(`sync/pull?cursor=${cursor}`, undefined, token); assert.equal(r.status, 200); return r.body;} };
}
test('offline farm/task survive restart; lost acknowledgement is retried once without duplicate server update', async () => {
  const user = await account(); const file = join(work, 'restart.db'); const device = randomUUID();
  let phone = local(user.ownerId, file, device); phone.repo.createFarm('Mwangaza', null);
  await new SyncEngine(phone.repo, transport(user.token)).run();
  const task = phone.repo.list().find(r => r.data.kind === 'task')!;
  assert.equal(task.data.kind, 'task');
  if (task.data.kind !== 'task') return;
  phone.repo.save(task.id, {...task.data, done: true}); phone.close();
  phone = local(user.ownerId, file, device);
  assert.equal((phone.repo.get(task.id)!.data as any).done, true);
  const pendingOperation = phone.repo.batch()[0]; const network = transport(user.token);
  await assert.rejects(new SyncEngine(phone.repo, {...network, push: async ops => {await network.push(ops); throw new Error('NETWORK_LOST_AFTER_COMMIT');}}).run());
  assert.equal(phone.repo.pending().length, 1);
  phone.close(); phone = local(user.ownerId, file, device);
  await new SyncEngine(phone.repo, network).run();
  assert.equal(phone.repo.pending().length, 0); assert.equal(phone.repo.get(task.id)!.version, 2);
  const count = await db.query("SELECT count(*)::int AS n FROM changes WHERE record->>'id'=$1", [task.id]);
  assert.equal(count.rows[0].n, 2); // create + exactly one accepted edit
  const retry = await network.push([pendingOperation]); assert.equal(retry.acknowledgements[0].record!.version, 2);
  phone.close();
});
test('owner checks block guessed record IDs and cross-owner parents; pull is private', async () => {
  const a = await account(); const b = await account(); const phone = local(a.ownerId); const farm = phone.repo.createFarm('A', 100);
  await new SyncEngine(phone.repo, transport(a.token)).run();
  const forged: Operation = { operationId: randomUUID(), deviceId: randomUUID(), recordId: farm, baseVersion: 1, data: phone.repo.get(farm)!.data };
  assert.equal((await transport(b.token).push([forged])).acknowledgements[0].code, 'NOT_FOUND');
  const child: Operation = {...forged, operationId: randomUUID(), recordId: randomUUID(), baseVersion: 0, data: {kind: 'task', farmId: farm, titleKey: 'fixtureTask', done: false}};
  assert.equal((await transport(b.token).push([child])).acknowledgements[0].code, 'PARENT_NOT_FOUND');
  assert.deepEqual((await transport(b.token).pull('0')).records, []);
  assert.throws(() => new Repository(phone.repo.db, b.ownerId, randomUUID(), randomUUID), /ACCOUNT_ISOLATION/);
  phone.close();
});
test('two-device conflict keeps both values; explicit resolution retains audit history', async () => {
  const user = await account(); const a = local(user.ownerId); const b = local(user.ownerId);
  const farm = a.repo.createFarm('Original', 100); const network = transport(user.token);
  await new SyncEngine(a.repo, network).run(); await new SyncEngine(b.repo, network).run();
  const original = a.repo.get(farm)!.data; if (original.kind !== 'farm') return;
  a.repo.save(farm, {...original, name: 'Device A'}); b.repo.save(farm, {...original, name: 'Device B'});
  await new SyncEngine(a.repo, network).run(); await new SyncEngine(b.repo, network).run();
  assert.equal((b.repo.get(farm)!.data as any).name, 'Device B');
  assert.equal(JSON.parse(b.repo.pending()[0].failure!).record.data.name, 'Device A');
  b.repo.resolve(farm, 'mine'); await new SyncEngine(b.repo, network).run();
  assert.equal(b.repo.pending().length, 0); assert.equal(b.repo.get(farm)!.version, 3);
  assert.equal(b.repo.db.getAllSync('SELECT * FROM resolutions').length, 1); a.close(); b.close();
});
test('acknowledging an older edit cannot overwrite a newer local edit', async () => {
  const user = await account(); const phone = local(user.ownerId); const farm = phone.repo.createFarm('First', null);
  const op = phone.repo.batch()[0]; const data = phone.repo.get(farm)!.data; if (data.kind !== 'farm') return;
  phone.repo.save(farm, {...data, name: 'Newer'});
  const ack = (await transport(user.token).push([op])).acknowledgements[0]; phone.repo.acknowledge(ack);
  assert.equal((phone.repo.get(farm)!.data as any).name, 'Newer');
  await new SyncEngine(phone.repo, transport(user.token)).run(); assert.equal(phone.repo.pending().length, 0); phone.close();
});
test('local write/outbox and pull/cursor transactions roll back on storage errors', () => {
  const phone = local(randomUUID());
  phone.repo.db.execSync("CREATE TRIGGER fail_outbox BEFORE INSERT ON outbox BEGIN SELECT RAISE(ABORT,'full disk'); END;");
  assert.throws(() => phone.repo.createFarm('Test', 1), /full disk/); assert.equal(phone.repo.list().length, 0);
  phone.repo.db.execSync("CREATE TRIGGER fail_records BEFORE INSERT ON records BEGIN SELECT RAISE(ABORT,'full disk'); END;");
  assert.throws(() => phone.repo.pull([{id: randomUUID(), version: 1, deleted: false, data: {kind:'farm',name:'Test',plotId:randomUUID(),areaM2:null,location:null,soil:'unknown',water:'unknown'}}], '22'));
  assert.equal(phone.repo.meta('cursor'), undefined); phone.close();
});
test('OTP expiry, attempt limit, single use, resend cooldown and session revocation', async () => {
  const identity = `${randomUUID()}@example.test`;
  const c = (await request('auth/codes', {identity})).body;
  assert.equal((await request('auth/codes', {identity})).status, 429);
  for (let i = 0; i < 5; i++) assert.equal((await request('auth/verify', {challengeId: c.challengeId, code:'000000'})).status, 401);
  assert.equal((await request('auth/verify', {challengeId: c.challengeId, code:c.developmentCode})).status, 401);
  const expired = (await request('auth/codes', {identity: `${randomUUID()}@example.test`})).body;
  await db.query("UPDATE challenges SET expires_at=now()-interval '1 second' WHERE id=$1", [expired.challengeId]);
  assert.equal((await request('auth/verify', {challengeId:expired.challengeId, code:expired.developmentCode})).status, 401);
  const valid = (await request('auth/codes', {identity: '+254712345678'})).body;
  const credentials = {challengeId: valid.challengeId, code: valid.developmentCode};
  const verified = (await request('auth/verify', credentials)).body;
  assert.equal((await request('auth/verify', credentials)).status, 401);
  await request('sessions/revoke', {}, verified.token);
  assert.equal((await request('sync/pull', undefined, verified.token)).status, 401);
  await assert.rejects(new SliceService(db, false).requestCode({identity}), /Http Exception/);
});
test('input validation, bounded batches, idempotency-key misuse, units, translations', async () => {
  const user = await account(); const phone = local(user.ownerId); const farm = phone.repo.createFarm('Test', null); const op = phone.repo.batch()[0];
  const network = transport(user.token); await network.push([op]);
  const changed = {...op, baseVersion: 3};
  assert.equal((await network.push([changed])).acknowledgements[0].code, 'OPERATION_ID_REUSED');
  assert.equal((await request('sync/push', {operations: Array(51).fill(op)}, user.token)).status, 400);
  assert.equal((await request('sync/push', {operations: [{...op, ownerId: randomUUID()}]}, user.token)).status, 400);
  assert.equal((await request('sync/pull?cursor=-1', undefined, user.token)).status, 400);
  assert.equal(phone.repo.get(farm)!.data.kind, 'farm');
  assert.equal(acresToSquareMetres(1), 4046.8564224); assert.throws(() => acresToSquareMetres(0));
  assert.deepEqual(Object.keys(messages.en).sort(), Object.keys(messages.sw).sort()); phone.close();
});
test('simultaneous retries share one acknowledgement and tombstones reject stale reactivation', async () => {
  const user = await account(); const phone = local(user.ownerId); const farm = phone.repo.createFarm('Concurrent', 10);
  const op = phone.repo.batch()[0]; const network = transport(user.token);
  const [first, second] = await Promise.all([network.push([op]), network.push([op])]);
  assert.deepEqual(first, second);
  assert.equal((await db.query("SELECT count(*)::int AS n FROM changes WHERE record->>'id'=$1", [farm])).rows[0].n, 1);
  await db.query('UPDATE records SET deleted=true WHERE id=$1', [farm]);
  const stale = {...op, operationId: randomUUID(), baseVersion: 1};
  const ack = (await network.push([stale])).acknowledgements[0];
  assert.equal(ack.status, 'conflict'); assert.equal(ack.record!.deleted, true);
  assert.equal((await db.query('SELECT deleted FROM records WHERE id=$1', [farm])).rows[0].deleted, true); phone.close();
});
test('future local schema fails closed instead of resetting migration version', () => {
  const phone = local(randomUUID()); phone.repo.db.execSync('PRAGMA user_version=2');
  assert.throws(() => new Repository(phone.repo.db, phone.repo.ownerId, randomUUID(), randomUUID), /NEWER_DATABASE/);
  assert.equal(phone.repo.db.getFirstSync<{user_version:number}>('PRAGMA user_version')!.user_version, 2); phone.close();
});
test('Expo Go permits only isolated fixture storage; native builds always require encryption', () => {
  const owner = randomUUID();
  const native = storagePolicy(owner, false, 'development_fixture');
  const preview = storagePolicy(owner, true, 'development_fixture');
  assert.equal(native.encrypted, true); assert.equal(preview.encrypted, false);
  assert.notEqual(native.filename, preview.filename);
  assert.throws(() => storagePolicy(owner, true, 'verified_email'), /REQUIRES_FIXTURE_ACCOUNT/);
});

test('area preferences survive reopening without rewriting farm records or outbox', () => {
  const owner = randomUUID(); const file = join(work, 'preferences.db');
  let phone = local(owner, file);
  phone.repo.createFarm('Units test', 10000);
  const beforeRecords = phone.repo.list(); const beforeOperations = phone.repo.pending();
  saveAreaUnit(phone.repo, 'hectares');
  phone.close(); phone = local(owner, file);
  assert.equal(readPreferences(phone.repo).areaUnit, 'hectares');
  assert.equal(squareMetresToArea(10000, readPreferences(phone.repo).areaUnit), 1);
  assert.deepEqual(phone.repo.list(), beforeRecords);
  assert.deepEqual(phone.repo.pending(), beforeOperations);
  const other = local(randomUUID());
  assert.equal(readPreferences(other.repo).areaUnit, 'acres');
  other.close(); phone.close();
});

test('legacy and new draft areas keep their unit when settings change and database reopens', () => {
  const owner = randomUUID(); const file = join(work, 'draft-units.db');
  let phone = local(owner, file);
  phone.repo.setMeta('draftFarmName', 'Unfinished farm');
  phone.repo.setMeta('draftArea', '2'); // Older releases stored acres with no unit tag.
  saveAreaUnit(phone.repo, 'hectares');
  assert.equal(readFarmDraft(phone.repo).unit, 'acres');
  saveDraftArea(phone.repo, '3', 'hectares');
  saveAreaUnit(phone.repo, 'squareMetres');
  phone.close(); phone = local(owner, file);
  const draft = readFarmDraft(phone.repo);
  assert.deepEqual(draft, {name: 'Unfinished farm', area: '3', unit: 'hectares'});
  phone.repo.createFarm(draft.name, areaToSquareMetres(Number(draft.area), draft.unit));
  const farmData = phone.repo.list().find(r => r.data.kind === 'farm')!.data;
  assert.ok(farmData.kind === 'farm'); assert.equal(farmData.areaM2, 30000);
  saveDraftArea(phone.repo, '', draft.unit);
  assert.equal(readFarmDraft(phone.repo).unit, 'squareMetres');
  phone.close();
});

test('area conversions preserve physical area and reject invalid input', () => {
  for (const unit of areaUnits) {
    const original = 12345.6789;
    assert.ok(Math.abs(areaToSquareMetres(squareMetresToArea(original, unit), unit) - original) < 1e-8);
    for (const invalid of [0, -1, NaN, Infinity]) assert.throws(() => areaToSquareMetres(invalid, unit), /INVALID_AREA/);
  }
  assert.equal(areaToSquareMetres(1, 'hectares'), 10000);
  assert.equal(validAreaUnit('damaged-setting'), 'acres');
});

test('rotating sessions renew expired access and replay revokes only that session family', async () => {
  const user = await account();
  const other = await account();
  await pg.query("UPDATE sessions SET expires_at=now()-interval '1 second' WHERE owner_id=$1", [user.ownerId]);
  assert.equal((await request('sync/pull', undefined, user.token)).status, 401);
  const renewed = await request('sessions/refresh', {refreshToken: user.refreshToken});
  assert.equal(renewed.status, 201);
  assert.notEqual(renewed.body.refreshToken, user.refreshToken);
  assert.equal((await request('sync/pull', undefined, renewed.body.token)).status, 200);
  assert.equal((await request('sessions/refresh', {refreshToken: user.refreshToken})).status, 401);
  assert.equal((await request('sync/pull', undefined, renewed.body.token)).status, 401);
  assert.equal((await request('sessions/refresh', {refreshToken: renewed.body.refreshToken})).status, 401);
  assert.equal((await request('sync/pull', undefined, other.token)).status, 200);
});

test('refresh expiry and sign-out prevent future renewal', async () => {
  const expired = await account();
  await pg.query("UPDATE sessions SET refresh_expires_at=now()-interval '1 second' WHERE owner_id=$1", [expired.ownerId]);
  assert.equal((await request('sessions/refresh', {refreshToken: expired.refreshToken})).status, 401);
  const user = await account();
  const next = await request('sessions/refresh', {refreshToken: user.refreshToken});
  assert.equal((await request('sessions/revoke', {}, next.body.token)).status, 201);
  assert.equal((await request('sessions/refresh', {refreshToken: next.body.refreshToken})).status, 401);
});

test('password setup needs recent authentication, hashes passwords and revokes older sessions', async () => {
  const user = await account(); const password = 'test-only passphrase 2026';
  const identity = (await pg.query<{identity: string}>('SELECT identity FROM accounts WHERE id=$1', [user.ownerId])).rows[0].identity;
  assert.equal((await request('auth/password', {password: 'short'}, user.token)).status, 400);
  await pg.query("UPDATE sessions SET authenticated_at=now()-interval '11 minutes' WHERE owner_id=$1", [user.ownerId]);
  assert.equal((await request('auth/password', {password}, user.token)).body.code, 'REAUTH_REQUIRED');
  await pg.query('UPDATE sessions SET authenticated_at=now() WHERE owner_id=$1', [user.ownerId]);
  const changed = await request('auth/password', {password}, user.token);
  assert.equal(changed.status, 201);
  assert.equal((await request('sync/pull', undefined, user.token)).status, 401);
  assert.equal((await request('sessions/refresh', {refreshToken: user.refreshToken})).status, 401);
  const stored = (await pg.query<{password_hash: string}>('SELECT password_hash FROM accounts WHERE id=$1', [user.ownerId])).rows[0].password_hash;
  assert.ok(stored.startsWith('scrypt$')); assert.ok(!stored.includes(password));
  const login = await request('auth/password/login', {identity: identity.toUpperCase(), password});
  assert.equal(login.status, 201); assert.equal(login.body.ownerId, user.ownerId);
  assert.equal((await request('sync/pull', undefined, login.body.token)).status, 200);
  for (let i = 0; i < 4; i++) assert.equal((await request('auth/password/login', {identity, password: 'incorrect test password'})).body.code, 'INVALID_LOGIN');
  assert.equal((await request('auth/password/login', {identity, password})).status, 429);
});

test('unknown password identities and unavailable delivery do not create accounts', async () => {
  const identity = `${randomUUID()}@example.test`;
  assert.equal((await request('auth/password/login', {identity, password: 'unknown test passphrase'})).body.code, 'INVALID_LOGIN');
  assert.equal((await pg.query('SELECT id FROM accounts WHERE identity=$1', [identity])).rows.length, 0);
  const disabled = new SliceService(db, false);
  await assert.rejects(() => disabled.passwordLogin({identity, password: 'unknown test passphrase'}), /DELIVERY_NOT_CONFIGURED|Http Exception/);
  await assert.rejects(() => disabled.refresh({refreshToken: 'a'.repeat(64)}));
});

test('concurrent refresh reuse leaves no active child session', async () => {
  const user = await account();
  const results = await Promise.all([request('sessions/refresh', {refreshToken: user.refreshToken}), request('sessions/refresh', {refreshToken: user.refreshToken})]);
  assert.deepEqual(results.map(r => r.status).sort(), [201, 401]);
  const success = results.find(r => r.status === 201)!;
  assert.equal((await request('sync/pull', undefined, success.body.token)).status, 401);
});

test('P1 migration preserves legacy accounts, sessions and farm records when reapplied', async () => {
  const legacy = new PGlite();
  try {
    await legacy.exec(readFileSync('apps/api/migrations/001_initial.sql', 'utf8'));
    const owner = randomUUID(); const record = randomUUID();
    await legacy.query("INSERT INTO accounts(id,identity,verification_kind) VALUES ($1,$2,'development_fixture')", [owner, 'migration@example.test']);
    await legacy.query("INSERT INTO sessions(token_hash,owner_id,expires_at) VALUES ($1,$2,now()+interval '7 days')", ['legacy-hash', owner]);
    await legacy.query('INSERT INTO records(id,owner_id,version,data) VALUES ($1,$2,1,$3)', [record, owner, {kind:'farm',name:'Retained'}]);
    await legacy.exec(migration()); await legacy.exec(migration());
    assert.equal((await legacy.query('SELECT id FROM accounts WHERE id=$1', [owner])).rows.length, 1);
    assert.deepEqual((await legacy.query<{data: unknown}>('SELECT data FROM records WHERE id=$1', [record])).rows[0].data, {kind:'farm',name:'Retained'});
    const row = (await legacy.query<{refresh_hash: string | null; revoked: boolean}>('SELECT refresh_hash,revoked FROM sessions WHERE token_hash=$1', ['legacy-hash'])).rows[0];
    assert.equal(row.refresh_hash, null); assert.equal(row.revoked, false);
  } finally { await legacy.close(); }
});

test('multiple farms retain selected farm and pair tasks after offline restart and sync', async () => {
  const user = await account(); const file = join(work, 'multiple-farms.db');
  let phone = local(user.ownerId, file);
  const first = phone.repo.createFarm('First farm', null); const second = phone.repo.createFarm('Second farm', 10000);
  phone.repo.selectFarm(second);
  const task = phone.repo.list().find(r => r.data.kind === 'task' && r.data.farmId === second)!;
  assert.ok(task.data.kind === 'task'); phone.repo.save(task.id, {...task.data, done:true});
  phone.repo.renameFarm(first, 'Renamed first farm');
  phone.close(); phone = local(user.ownerId, file);
  assert.equal(phone.repo.farms().length, 2); assert.equal(phone.repo.selectedFarm()!.id, second);
  await new SyncEngine(phone.repo, transport(user.token)).run();
  assert.equal(phone.repo.pending().length, 0);
  const remote = (await request('sync/pull', undefined, user.token)).body.records;
  assert.ok(remote.some((r: any) => r.id === first && r.data.name === 'Renamed first farm'));
  assert.ok(remote.some((r: any) => r.id === task.id && r.data.done === true && r.data.farmId === second));
  assert.equal(phone.repo.get(second)!.data.kind, 'farm');
  const secondData = phone.repo.get(second)!.data; assert.ok(secondData.kind === 'farm'); assert.equal(secondData.areaM2,10000);
  assert.throws(() => phone.repo.selectFarm(randomUUID()), /FARM_NOT_FOUND/);
  assert.throws(() => phone.repo.renameFarm(task.id, 'Not a farm'), /FARM_NOT_FOUND/);
  phone.close();
});

test('dated area changes survive restart and lost acknowledgement without duplicate history', async () => {
  const user = await account(); const file = join(work, 'area-history.db');
  let phone = local(user.ownerId, file); const farmId = phone.repo.createFarm('Area farm', 10000);
  await new SyncEngine(phone.repo, transport(user.token)).run();
  phone.repo.reviseFarmArea(farmId, 20000, todayInKenya(), 'expansion');
  phone.close(); phone = local(user.ownerId, file);
  const operation = phone.repo.batch()[0];
  const accepted = await request('sync/push', {operations:[operation]}, user.token);
  assert.equal(accepted.body.acknowledgements[0].status, 'accepted'); // Response lost before local acknowledgement.
  await new SyncEngine(phone.repo, transport(user.token)).run();
  let data = phone.repo.get(farmId)!.data; assert.ok(data.kind === 'farm');
  assert.equal(data.areaM2,20000); assert.equal(data.areaHistory!.length,2); assert.equal(data.areaHistory![0].areaM2,10000);
  assert.equal(data.areaHistory![0].effectiveDate,null);
  phone.repo.reviseFarmArea(farmId, 15000, todayInKenya(), 'reduction');
  await new SyncEngine(phone.repo, transport(user.token)).run();
  data = phone.repo.get(farmId)!.data; assert.ok(data.kind === 'farm'); assert.equal(data.areaHistory!.length,3);
  assert.equal(phone.repo.pending().length,0);
  assert.throws(() => phone.repo.reviseFarmArea(farmId, 16000, '2999-01-01','correction'), /AREA_DATE_INVALID/);
  assert.throws(() => phone.repo.reviseFarmArea(farmId, 16000, '2000-01-01','correction'), /AREA_DATE_INVALID/);
  assert.throws(() => phone.repo.reviseFarmArea(farmId, 16000, '2026-02-30','correction'), /AREA_DATE_INVALID/);
  assert.throws(() => phone.repo.reviseFarmArea(farmId, 10000, todayInKenya(),'expansion'), /AREA_REASON_INVALID/);
  assert.equal(phone.repo.pending().length,0); phone.close();
});

test('server rejects area changes without history and protects accepted history from rewriting', async () => {
  const user = await account(); const phone = local(user.ownerId); const id = phone.repo.createFarm('Protected', null);
  await new SyncEngine(phone.repo, transport(user.token)).run();
  assert.throws(() => phone.repo.reviseFarmArea(id, 20000, todayInKenya(), 'expansion'), /AREA_REASON_INVALID/);
  phone.repo.reviseFarmArea(id, 10000, todayInKenya(), 'correction'); await new SyncEngine(phone.repo, transport(user.token)).run();
  const record = phone.repo.get(id)!; assert.ok(record.data.kind === 'farm');
  const forged = {...record.data, areaM2:20000, areaHistory:undefined};
  const operation = {operationId:randomUUID(), deviceId:randomUUID(), recordId:id, baseVersion:record.version, data:forged};
  let result = await request('sync/push', {operations:[operation]}, user.token);
  assert.equal(result.body.acknowledgements[0].status,'invalid');
  result = await request('sync/push', {operations:[{...operation, operationId:randomUUID(), data:{...record.data, areaHistory:record.data.areaHistory!.map((r,i) => i === 0 ? {...r, areaM2:999} : r)}}]}, user.token);
  assert.equal(result.body.acknowledgements[0].status,'invalid');
  const remote = await request('sync/pull', undefined, user.token);
  assert.equal(remote.body.records.filter((r:any)=>r.id===id).at(-1).data.areaM2,10000); phone.close();
});

test('keeping an area conflict appends a correction after server history and retains both versions', async () => {
  const user = await account(); const first = local(user.ownerId); const second = local(user.ownerId);
  const id = first.repo.createFarm('Shared area',10000);
  await new SyncEngine(first.repo,transport(user.token)).run(); await new SyncEngine(second.repo,transport(user.token)).run();
  first.repo.reviseFarmArea(id,20000,todayInKenya(),'expansion');
  second.repo.reviseFarmArea(id,5000,todayInKenya(),'reduction');
  await new SyncEngine(first.repo,transport(user.token)).run(); await new SyncEngine(second.repo,transport(user.token)).run();
  assert.ok(second.repo.pending()[0].failure);
  second.repo.resolve(id,'mine'); await new SyncEngine(second.repo,transport(user.token)).run();
  const result = second.repo.get(id)!.data; assert.ok(result.kind === 'farm');
  assert.equal(result.areaM2,5000); assert.deepEqual(result.areaHistory!.map(r=>r.areaM2),[10000,20000,5000]);
  assert.equal(result.areaHistory!.at(-1)!.reason,'correction');
  assert.equal(second.repo.db.getAllSync('SELECT * FROM resolutions').length,1);
  assert.equal(second.repo.pending().length,0); first.close(); second.close();
});
