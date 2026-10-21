import { reviseArea, todayInKenya } from '../../../packages/domain/land';
import { irrigationSchema, type IrrigationData, waterSourceSchema, type WaterSourceData, waterStorageSchema, type WaterStorageData, plotConditionSchema, type PlotConditionData, tenureSchema, type TenureData, soilTestSchema, type SoilTestData, waterObservationSchema, type WaterObservationData, conditionSchema, type ConditionData, recordSchema, type Ack, type Operation, type RecordData, type ServerRecord } from '../../../packages/contracts';

export interface LocalDatabase {
  execSync(sql: string): void;
  runSync(sql: string, ...params: any[]): unknown;
  getAllSync<T>(sql: string, ...params: any[]): T[];
  getFirstSync<T>(sql: string, ...params: any[]): T | null;
}
export type LocalRecord = ServerRecord;
type OutboxRow = { sequence: number; record_id: string; operation: string; failure: string | null };
export class Repository {
  constructor(readonly db: LocalDatabase, readonly ownerId: string, readonly deviceId: string, readonly uuid: () => string) {
    const version = db.getFirstSync<{user_version: number}>('PRAGMA user_version')?.user_version ?? 0;
    if (version > 1) throw new Error('NEWER_DATABASE_REQUIRES_APP_UPDATE');
    db.execSync(`PRAGMA journal_mode=WAL;
      CREATE TABLE IF NOT EXISTS metadata(key TEXT PRIMARY KEY,value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS records(id TEXT PRIMARY KEY,version INTEGER NOT NULL,data TEXT NOT NULL,deleted INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE IF NOT EXISTS outbox(sequence INTEGER PRIMARY KEY AUTOINCREMENT,record_id TEXT NOT NULL,operation TEXT NOT NULL,failure TEXT);
      CREATE TABLE IF NOT EXISTS resolutions(id INTEGER PRIMARY KEY AUTOINCREMENT,record_id TEXT NOT NULL,local_data TEXT NOT NULL,server_data TEXT NOT NULL,choice TEXT NOT NULL,created_at TEXT NOT NULL);
      PRAGMA user_version=1;`);
    const owner = this.meta('owner');
    if (owner && owner !== ownerId) throw new Error('ACCOUNT_ISOLATION');
    this.setMeta('owner', ownerId);
  }
  transaction<T>(fn: () => T): T {
    this.db.execSync('BEGIN IMMEDIATE');
    try { const result = fn(); this.db.execSync('COMMIT'); return result; }
    catch (error) { this.db.execSync('ROLLBACK'); throw error; }
  }
  meta(key: string) { return this.db.getFirstSync<{value: string}>('SELECT value FROM metadata WHERE key=?', key)?.value; }
  setMeta(key: string, value: string) { this.db.runSync('INSERT OR REPLACE INTO metadata(key,value) VALUES (?,?)', key, value); }
  list(): LocalRecord[] {
    return this.db.getAllSync<any>('SELECT * FROM records ORDER BY rowid').map(r => ({ id: r.id, version: r.version, data: JSON.parse(r.data), deleted: Boolean(r.deleted) }));
  }
  get(id: string) { return this.list().find(r => r.id === id); }
  private put(record: ServerRecord) {
    this.db.runSync('INSERT OR REPLACE INTO records(id,version,data,deleted) VALUES (?,?,?,?)', record.id, record.version, JSON.stringify(record.data), Number(record.deleted));
  }
  private enqueue(id: string, data: RecordData) {
    const existing = this.get(id);
    const op: Operation = { operationId: this.uuid(), deviceId: this.deviceId, recordId: id, baseVersion: existing?.version ?? 0, data: recordSchema.parse(data) };
    this.put({ id, data: op.data, version: op.baseVersion + 1, deleted: false });
    this.db.runSync('INSERT INTO outbox(record_id,operation) VALUES (?,?)', id, JSON.stringify(op));
    return op;
  }
  save(id: string, data: RecordData) { return this.transaction(() => this.enqueue(id, data)); }
  createFarm(name: string, areaM2: number | null) {
    return this.transaction(() => {
      const farmId = this.uuid(); const taskId = this.uuid(); const plotId = this.uuid();
      this.enqueue(farmId, { kind: 'farm', name, plotId, areaM2, location: null, soil: 'unknown', water: 'unknown' });
      this.enqueue(plotId, {kind: 'plot', farmId, name: null, areaM2: null, soil: 'unknown', water: 'unknown'});
      this.enqueue(taskId, { kind: 'task', farmId, titleKey: 'fixtureTask', done: false });
      return farmId;
    });
  }
  farms() { return this.list().filter(record => !record.deleted && record.data.kind === 'farm'); }
  selectedFarm() {
    const farms = this.farms();
    return farms.find(record => record.id === this.meta('selectedFarmId')) ?? farms[0];
  }
  selectFarm(id: string) {
    if (!this.farms().some(record => record.id === id)) throw new Error('FARM_NOT_FOUND');
    this.setMeta('selectedFarmId', id);
  }
  renameFarm(id: string, name: string) {
    const record = this.get(id);
    if (!record || record.deleted || record.data.kind !== 'farm') throw new Error('FARM_NOT_FOUND');
    return this.save(id, {...record.data, name});
  }
  reviseFarmArea(id: string, areaM2: number, effectiveDate: string, reason: 'correction' | 'expansion' | 'reduction') {
    const record = this.get(id);
    if (!record || record.deleted || record.data.kind !== 'farm') throw new Error('FARM_NOT_FOUND');
    this.checkPlotCapacity(id, areaM2);
    return this.save(id, reviseArea(record.data, areaM2, effectiveDate, reason, this.uuid));
  }
  plots(farmId: string): LocalRecord[] {
    const farm = this.get(farmId);
    if (!farm || farm.deleted || farm.data.kind !== 'farm') return [];
    const plots = this.list().filter(r => !r.deleted && r.data.kind === 'plot' && r.data.farmId === farmId);
    // Older farms already reserved this ID. Display it without inventing an area or writing during render.
    if (!this.get(farm.data.plotId)) plots.unshift({id: farm.data.plotId, version: 0, deleted: false,
      data: {kind: 'plot', farmId, name: null, areaM2: null, soil: 'unknown', water: 'unknown'}});
    return plots;
  }
  selectedPlot(farmId: string) {
    const plots = this.plots(farmId);
    return plots.find(r => r.id === this.meta('selectedPlot:' + farmId)) ?? plots[0];
  }
  selectPlot(farmId: string, id: string) {
    if (!this.plots(farmId).some(r => r.id === id)) throw new Error('PLOT_NOT_FOUND');
    this.setMeta('selectedPlot:' + farmId, id);
  }
  createPlot(farmId: string, name: string) {
    const farm = this.get(farmId);
    if (!farm || farm.deleted || farm.data.kind !== 'farm') throw new Error('FARM_NOT_FOUND');
    return this.transaction(() => {
      const id = this.uuid();
      this.enqueue(id, {kind: 'plot', farmId, name, areaM2: null, soil: 'unknown', water: 'unknown'});
      this.selectPlot(farmId, id); return id;
    });
  }
  renamePlot(farmId: string, id: string, name: string) {
    const plot = this.plots(farmId).find(r => r.id === id);
    if (!plot || plot.data.kind !== 'plot') throw new Error('PLOT_NOT_FOUND');
    return this.save(id, {...plot.data, name});
  }
  checkPlotCapacity(id: string, areaM2: number) {
    const record = this.get(id);
    if (!record || (record.data.kind !== 'farm' && record.data.kind !== 'plot')) return;
    const farmId = record.data.kind === 'farm' ? id : record.data.farmId;
    const farm = this.get(farmId)!;
    const total = record.data.kind === 'farm' ? areaM2 : farm.data.kind === 'farm' ? farm.data.areaM2 : null;
    const known = this.plots(farmId).reduce((sum, plot) => sum + (plot.id === id ? areaM2 : plot.data.kind === 'plot' ? plot.data.areaM2 ?? 0 : 0), 0);
    if (total !== null && known > total + 0.000001) throw new Error('PLOT_AREA_EXCEEDS_FARM');
  }
  revisePlotArea(farmId: string, id: string, areaM2: number, date: string, reason: 'correction' | 'expansion' | 'reduction') {
    const plot = this.plots(farmId).find(r => r.id === id);
    if (!plot || plot.data.kind !== 'plot') throw new Error('PLOT_NOT_FOUND');
    const next = reviseArea(plot.data, areaM2, date, reason, this.uuid);
    return this.transaction(() => {
      if (!this.get(id)) this.enqueue(id, plot.data);
      this.checkPlotCapacity(id, areaM2);
      return this.enqueue(id, next);
    });
  }
  conditions(plotId: string) {
    return this.list().filter((r): r is LocalRecord & {data: ConditionData} => !r.deleted && r.data.kind === 'condition' && r.data.plotId === plotId)
      .sort((a,b) => b.data.observedDate.localeCompare(a.data.observedDate));
  }
  recordSoil(farmId: string, plotId: string, values: Pick<ConditionData, 'observedDate' | 'soilType' | 'textureNotes' | 'fertilityNotes' | 'copiedFrom'>) {
    const plot = this.plots(farmId).find(r => r.id === plotId);
    if (!plot || plot.data.kind !== 'plot') throw new Error('PLOT_NOT_FOUND');
    if(values.copiedFrom){const original=this.get(values.copiedFrom);if(!original||original.deleted||original.data.kind!=='condition'||original.data.farmId!==farmId||original.data.plotId===plotId)throw new Error('COPY_SOURCE_NOT_FOUND');}
    const data = conditionSchema.parse({kind: 'condition', farmId, plotId, ...values, source: values.copiedFrom?'copied_self_reported':'self_reported'});
    if (data.observedDate > todayInKenya()) throw new Error('OBSERVATION_DATE_INVALID');
    return this.transaction(() => {
      if (!this.get(plotId)) this.enqueue(plotId, plot.data);
      const id = this.uuid(); this.enqueue(id, data); return id;
    });
  }
  waterObservations(plotId: string) {
    return this.list().filter((r): r is LocalRecord & {data: WaterObservationData} => !r.deleted && r.data.kind === 'waterObservation' && r.data.plotId === plotId)
      .sort((a,b) => b.data.observedDate.localeCompare(a.data.observedDate));
  }
  recordWater(farmId: string, plotId: string, values: Pick<WaterObservationData, 'observedDate' | 'sourceKnowledge' | 'sources' | 'reliability' | 'shortageNotes' | 'sourceNotes'>) {
    const plot = this.plots(farmId).find(r => r.id === plotId);
    if (!plot || plot.data.kind !== 'plot') throw new Error('PLOT_NOT_FOUND');
    const data = waterObservationSchema.parse({kind: 'waterObservation', farmId, plotId, ...values, source: 'self_reported'});
    if (data.observedDate > todayInKenya()) throw new Error('OBSERVATION_DATE_INVALID');
    return this.transaction(() => {
      if (!this.get(plotId)) this.enqueue(plotId, plot.data);
      const id = this.uuid(); this.enqueue(id, data); return id;
    });
  }
  soilTests(plotId: string) {
    return this.list().filter((r): r is LocalRecord & {data: SoilTestData} => !r.deleted && r.data.kind === 'soilTest' && r.data.plotId === plotId)
      .sort((a,b) => b.data.observedDate.localeCompare(a.data.observedDate));
  }
  recordSoilTest(farmId: string, plotId: string, values: Pick<SoilTestData, 'observedDate' | 'ph' | 'reportReference'>) {
    const plot = this.plots(farmId).find(r => r.id === plotId);
    if (!plot || plot.data.kind !== 'plot') throw new Error('PLOT_NOT_FOUND');
    const data = soilTestSchema.parse({kind: 'soilTest', farmId, plotId, ...values, source: 'user_entered_report'});
    if (data.observedDate > todayInKenya()) throw new Error('OBSERVATION_DATE_INVALID');
    return this.transaction(() => {
      if (!this.get(plotId)) this.enqueue(plotId, plot.data);
      const id = this.uuid(); this.enqueue(id, data); return id;
    });
  }
  tenures(plotId: string) {
    return this.list().filter((r): r is LocalRecord & {data: TenureData} => !r.deleted && r.data.kind === 'tenure' && r.data.plotId === plotId)
      .sort((a,b) => b.data.observedDate.localeCompare(a.data.observedDate));
  }
  recordTenure(farmId: string, plotId: string, values: Pick<TenureData, 'observedDate' | 'tenureType' | 'leaseStart' | 'leaseEnd' | 'notes' | 'leaseCost'>) {
    const plot = this.plots(farmId).find(r => r.id === plotId);
    if (!plot || plot.data.kind !== 'plot') throw new Error('PLOT_NOT_FOUND');
    const data = tenureSchema.parse({kind: 'tenure', farmId, plotId, ...values, source: 'self_reported'});
    if (data.observedDate > todayInKenya()) throw new Error('OBSERVATION_DATE_INVALID');
    return this.transaction(() => {
      if (!this.get(plotId)) this.enqueue(plotId, plot.data);
      const id = this.uuid(); this.enqueue(id, data); return id;
    });
  }
  plotConditions(plotId:string){
    return this.list().filter((r):r is LocalRecord & {data:PlotConditionData}=>!r.deleted&&r.data.kind==='plotCondition'&&r.data.plotId===plotId).sort((a,b)=>b.data.observedDate.localeCompare(a.data.observedDate));
  }
  recordPlotCondition(farmId:string,plotId:string,values:Pick<PlotConditionData,'observedDate'|'slope'|'drainage'|'roadAccess'|'notes'>){
    const plot=this.plots(farmId).find(r=>r.id===plotId);if(!plot||plot.data.kind!=='plot')throw new Error('PLOT_NOT_FOUND');
    const data=plotConditionSchema.parse({kind:'plotCondition',farmId,plotId,...values,source:'self_reported'});
    if(data.observedDate>todayInKenya())throw new Error('OBSERVATION_DATE_INVALID');
    return this.transaction(()=>{if(!this.get(plotId))this.enqueue(plotId,plot.data);const id=this.uuid();this.enqueue(id,data);return id;});
  }
  waterStorage(farmId:string){
    return this.list().filter((r):r is LocalRecord & {data:WaterStorageData}=>!r.deleted&&r.data.kind==='waterStorage'&&r.data.farmId===farmId);
  }
  saveWaterStorage(farmId:string,values:Pick<WaterStorageData,'name'|'capacity'|'plotIds'|'notes'>,id?:string){
    const farm=this.get(farmId);if(!farm||farm.deleted||farm.data.kind!=='farm')throw new Error('FARM_NOT_FOUND');
    if(id){const old=this.get(id);if(!old||old.deleted||old.data.kind!=='waterStorage'||old.data.farmId!==farmId)throw new Error('RESOURCE_NOT_FOUND');}
    const data=waterStorageSchema.parse({kind:'waterStorage',farmId,...values,source:'self_reported'});
    const plots=this.plots(farmId);for(const selected of data.plotIds)if(!plots.some(r=>r.id===selected))throw new Error('PLOT_NOT_FOUND');
    return this.transaction(()=>{for(const selected of data.plotIds){const plot=plots.find(r=>r.id===selected)!;if(!this.get(selected))this.enqueue(selected,plot.data);}const recordId=id??this.uuid();this.enqueue(recordId,data);return recordId;});
  }
  waterSources(farmId:string){
    return this.list().filter((r):r is LocalRecord & {data:WaterSourceData}=>!r.deleted&&r.data.kind==='waterSource'&&r.data.farmId===farmId);
  }
  saveWaterSource(farmId:string,values:Pick<WaterSourceData,'name'|'sourceType'|'reliability'|'plotIds'|'notes'|'shortageNotes'>,id?:string){
    const farm=this.get(farmId);if(!farm||farm.deleted||farm.data.kind!=='farm')throw new Error('FARM_NOT_FOUND');
    if(id){const old=this.get(id);if(!old||old.deleted||old.data.kind!=='waterSource'||old.data.farmId!==farmId)throw new Error('RESOURCE_NOT_FOUND');}
    const data=waterSourceSchema.parse({kind:'waterSource',farmId,...values,source:'self_reported'});
    const plots=this.plots(farmId);for(const selected of data.plotIds)if(!plots.some(r=>r.id===selected))throw new Error('PLOT_NOT_FOUND');
    return this.transaction(()=>{for(const selected of data.plotIds){const plot=plots.find(r=>r.id===selected)!;if(!this.get(selected))this.enqueue(selected,plot.data);}const recordId=id??this.uuid();this.enqueue(recordId,data);return recordId;});
  }
  irrigations(plotId:string){
    return this.list().filter((r):r is LocalRecord & {data:IrrigationData}=>!r.deleted&&r.data.kind==='irrigation'&&r.data.plotId===plotId).sort((a,b)=>b.data.observedDate.localeCompare(a.data.observedDate));
  }
  recordIrrigation(farmId:string,plotId:string,values:Pick<IrrigationData,'observedDate'|'irrigationStatus'|'methods'|'irrigatedAreaM2'|'notes'>){
    const plot=this.plots(farmId).find(r=>r.id===plotId);if(!plot||plot.data.kind!=='plot')throw new Error('PLOT_NOT_FOUND');
    const data=irrigationSchema.parse({...values,kind:'irrigation',farmId,plotId,plotAreaM2:plot.data.areaM2,source:'self_reported'});
    if(data.observedDate>todayInKenya())throw new Error('OBSERVATION_DATE_INVALID');
    return this.transaction(()=>{if(!this.get(plotId))this.enqueue(plotId,plot.data);const id=this.uuid();this.enqueue(id,data);return id;});
  }
  pending() { return this.db.getAllSync<OutboxRow>('SELECT * FROM outbox ORDER BY sequence'); }
  // Stop at a failure so dependent task/farm writes cannot overtake it.
  batch(): Operation[] {
    const pending = this.pending(); const failure = pending.findIndex(r => r.failure);
    return pending.slice(0, failure < 0 ? 50 : Math.min(failure, 50)).map(r => JSON.parse(r.operation));
  }
  acknowledge(ack: Ack) {
    this.transaction(() => {
      const row = this.pending().find(r => JSON.parse(r.operation).operationId === ack.operationId);
      if (!row) return;
      if (ack.status !== 'accepted' || !ack.record) {
        this.db.runSync('UPDATE outbox SET failure=? WHERE sequence=?', JSON.stringify(ack), row.sequence); return;
      }
      this.db.runSync('DELETE FROM outbox WHERE sequence=?', row.sequence);
      if (!this.pending().some(r => r.record_id === row.record_id)) this.put(ack.record);
    });
  }
  pull(records: ServerRecord[], cursor: string) {
    this.transaction(() => {
      const pending = new Set(this.pending().map(r => r.record_id));
      for (const record of records) {
        if (pending.has(record.id)) continue;
        const local = this.get(record.id);
        if (!local || local.version <= record.version) this.put(record);
      }
      this.setMeta('cursor', cursor);
    });
  }
  resolve(id: string, choice: 'mine' | 'server') {
    this.transaction(() => {
      const row = this.pending().find(r => r.record_id === id && r.failure);
      if (!row) throw new Error('NO_CONFLICT');
      const ack = JSON.parse(row.failure!) as Ack;
      if (ack.status !== 'conflict' || !ack.record || ack.record.deleted) throw new Error('RECOVERY_REQUIRED');
      const local = this.get(id)!;
      this.db.runSync('INSERT INTO resolutions(record_id,local_data,server_data,choice,created_at) VALUES (?,?,?,?,?)', id, JSON.stringify(local), JSON.stringify(ack.record), choice, new Date().toISOString());
      this.db.runSync('DELETE FROM outbox WHERE record_id=?', id);
      this.put(ack.record);
      if (choice === 'mine') {
        let data = local.data;
        if ((data.kind === 'farm' && ack.record.data.kind === 'farm') || (data.kind === 'plot' && ack.record.data.kind === 'plot')) {
          const server = ack.record.data;
          const area = data.areaM2;
          if (area !== null && area !== server.areaM2) {
            const revised = reviseArea(server, area, todayInKenya(), 'correction', this.uuid);
            data = revised.kind === 'farm' ? {...revised, name: data.name ?? revised.name} : {...revised, name: data.name};
          } else {
            // Keep the accepted area history when resolving a name-only edit.
            data = server.kind === 'farm' ? {...server, name: data.name ?? server.name} : {...server, name: data.name};
          }
        }
        if ((data.kind === 'farm' || data.kind === 'plot') && data.areaM2 !== null) this.checkPlotCapacity(id, data.areaM2);
        this.enqueue(id, data);
      }
    });
  }
}
