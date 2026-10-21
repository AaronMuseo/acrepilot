import { estimateLeaseCost } from '../domain/lease-cost';
import { z } from 'zod';

export const uuid = z.string().uuid();
export const languageSchema = z.enum(['en', 'sw']);
export type Language = z.infer<typeof languageSchema>;
export const calendarDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const parsed = new Date(value + 'T00:00:00Z');
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
});
export const areaRevisionSchema = z.object({
  id: uuid, effectiveDate: calendarDateSchema.nullable(), areaM2: z.number().positive().max(1e9).nullable(),
  reason: z.enum(['baseline', 'correction', 'expansion', 'reduction']),
}).strict();
export type AreaRevision = z.infer<typeof areaRevisionSchema>;
export const farmSchema = z.object({
  kind: z.literal('farm'), name: z.string().trim().min(1).max(100), plotId: uuid,
  areaM2: z.number().positive().max(1e9).nullable(),
  location: z.object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) }).nullable(),
  soil: z.literal('unknown'), water: z.literal('unknown'),
  areaHistory: z.array(areaRevisionSchema).min(2).max(100).optional(),
}).strict();
export type FarmData = z.infer<typeof farmSchema>;
export const taskSchema = z.object({
  kind: z.literal('task'), farmId: uuid, titleKey: z.literal('fixtureTask'), done: z.boolean(),
}).strict();
export const plotSchema = z.object({
  kind: z.literal('plot'), farmId: uuid, name: z.string().trim().min(1).max(100).nullable(),
  areaM2: z.number().positive().max(1e9).nullable(), areaHistory: z.array(areaRevisionSchema).min(2).max(100).optional(), soil: z.literal('unknown'), water: z.literal('unknown'),
}).strict();
export type PlotData = z.infer<typeof plotSchema>;
export const soilTypes = ['unknown', 'sandy', 'clay', 'silty', 'loam', 'other'] as const;
export const conditionSchema = z.object({
  kind: z.literal('condition'), farmId: uuid, plotId: uuid, observedDate: calendarDateSchema,
  soilType: z.enum(soilTypes), textureNotes: z.string().trim().max(500), fertilityNotes: z.string().trim().max(500),
  source: z.enum(['self_reported','copied_self_reported']), copiedFrom:uuid.optional(),
}).strict().refine(v=>v.source==='copied_self_reported'?!!v.copiedFrom:!v.copiedFrom,'INVALID_COPY_PROVENANCE');
export type ConditionData = z.infer<typeof conditionSchema>;
export const waterSources = ['rainfall', 'harvestedRain', 'borehole', 'river', 'pipedWater', 'other'] as const;
export const waterReliability = ['unknown', 'reliable', 'seasonal', 'unreliable'] as const;
export const waterObservationSchema = z.object({
  kind: z.literal('waterObservation'), farmId: uuid, plotId: uuid, observedDate: calendarDateSchema,
  sourceKnowledge: z.enum(['unknown', 'none', 'known']), sources: z.array(z.enum(waterSources)).max(6),
  reliability: z.enum(waterReliability), shortageNotes: z.string().trim().max(500), sourceNotes: z.string().trim().max(500),
  source: z.literal('self_reported'),
}).strict().refine(v => new Set(v.sources).size === v.sources.length && (v.sourceKnowledge === 'known' ? v.sources.length > 0 : v.sources.length === 0 && v.reliability === 'unknown'), 'INVALID_WATER_SOURCES');
export type WaterObservationData = z.infer<typeof waterObservationSchema>;
export const soilTestSchema = z.object({
  kind: z.literal('soilTest'), farmId: uuid, plotId: uuid, observedDate: calendarDateSchema,
  ph: z.number().min(0).max(14), reportReference: z.string().trim().max(200),
  source: z.literal('user_entered_report'),
}).strict();
export type SoilTestData = z.infer<typeof soilTestSchema>;
export const leaseCostSchema = z.object({
  amountMinor:z.number().int().min(0).max(999999999999), amountText:z.string().regex(/^\d{1,10}(\.\d{1,2})?$/),currency:z.literal('KES'),
  basis:z.enum(['acres','hectares','squareMetres','plot']), period:z.enum(['monthly','yearly','seasonal','wholeLease']), areaM2:z.number().positive().max(1e9).nullable(),
}).strict().refine(v=>{const [whole,fraction='']=v.amountText.split('.');return BigInt(whole)*100n+BigInt(fraction.padEnd(2,'0'))===BigInt(v.amountMinor);},'INVALID_LEASE_COST').refine(v=>{try{estimateLeaseCost(v);return true;}catch{return false;}},'LEASE_COST_TOO_LARGE');
export const tenureSchema = z.object({
  kind: z.literal('tenure'), farmId: uuid, plotId: uuid, observedDate: calendarDateSchema,
  tenureType: z.enum(['unknown','owned','leased']), leaseStart: calendarDateSchema.nullable(), leaseEnd: calendarDateSchema.nullable(),
  notes: z.string().trim().max(500), leaseCost:leaseCostSchema.nullable().optional(), source: z.literal('self_reported'),
}).strict().refine(v => v.tenureType === 'leased' ? (!v.leaseStart || !v.leaseEnd || v.leaseStart <= v.leaseEnd) : v.leaseStart === null && v.leaseEnd === null && !v.leaseCost, 'INVALID_LEASE_DATES');
export type TenureData = z.infer<typeof tenureSchema>;
export const slopeTypes = ['unknown','flat','gentle','steep'] as const;
export const drainageTypes = ['unknown','wellDrained','moderateDrainage','poorDrainage'] as const;
export const accessTypes = ['unknown','allWeather','seasonalAccess','noVehicleAccess'] as const;
export const plotConditionSchema = z.object({
  kind:z.literal('plotCondition'),farmId:uuid,plotId:uuid,observedDate:calendarDateSchema,
  slope:z.enum(slopeTypes),drainage:z.enum(drainageTypes),roadAccess:z.enum(accessTypes),notes:z.string().trim().max(500),source:z.literal('self_reported'),
}).strict();
export type PlotConditionData = z.infer<typeof plotConditionSchema>;
export const waterStorageSchema=z.object({
 kind:z.literal('waterStorage'),farmId:uuid,name:z.string().trim().min(1).max(100),
 capacity:z.object({amountText:z.string().regex(/^\d{1,12}(\.\d{1,3})?$/),unit:z.enum(['litres','cubicMetres']),litres:z.number().positive().max(1e12)}).strict().refine(v=>Number(v.amountText)*(v.unit==='cubicMetres'?1000:1)===v.litres,'INVALID_CAPACITY').nullable(),
 plotIds:z.array(uuid).max(100).refine(v=>new Set(v).size===v.length,'DUPLICATE_PLOTS'),notes:z.string().trim().max(500),source:z.literal('self_reported'),
}).strict();
export type WaterStorageData=z.infer<typeof waterStorageSchema>;
export const waterSourceSchema=z.object({
 kind:z.literal('waterSource'),farmId:uuid,name:z.string().trim().min(1).max(100),
 sourceType:z.enum(['unknown',...waterSources]),reliability:z.enum(['unknown','reliable','seasonal','unreliable']),
 plotIds:z.array(uuid).max(100).refine(v=>new Set(v).size===v.length,'DUPLICATE_PLOTS'),
 notes:z.string().trim().max(500),shortageNotes:z.string().trim().max(500),source:z.literal('self_reported'),
}).strict();
export type WaterSourceData=z.infer<typeof waterSourceSchema>;
export const irrigationMethods = ['drip','sprinkler','furrow','flood','manualWatering','other'] as const;
export const irrigationSchema = z.object({
 kind:z.literal('irrigation'),farmId:uuid,plotId:uuid,observedDate:calendarDateSchema,
 irrigationStatus:z.enum(['unknown','none','known']),methods:z.array(z.enum(irrigationMethods)).max(6),
 irrigatedAreaM2:z.number().nonnegative().max(1e9).nullable(),plotAreaM2:z.number().positive().max(1e9).nullable(),
 notes:z.string().trim().max(500),source:z.literal('self_reported'),
}).strict().refine(v=>new Set(v.methods).size===v.methods.length && (v.irrigationStatus==='known' ? v.methods.length>0 && (v.irrigatedAreaM2===null || v.irrigatedAreaM2>0) : v.methods.length===0 && v.irrigatedAreaM2===(v.irrigationStatus==='none'?0:null)), 'INVALID_IRRIGATION')
 .refine(v=>v.plotAreaM2===null || v.irrigatedAreaM2===null || v.irrigatedAreaM2<=v.plotAreaM2+1e-6,'IRRIGATION_EXCEEDS_PLOT');
export type IrrigationData=z.infer<typeof irrigationSchema>;
export const recordSchema = z.discriminatedUnion('kind', [farmSchema, taskSchema, plotSchema, conditionSchema, waterObservationSchema, soilTestSchema, tenureSchema, plotConditionSchema, waterStorageSchema, waterSourceSchema, irrigationSchema]);
export type RecordData = z.infer<typeof recordSchema>;
export const operationSchema = z.object({
  operationId: uuid, deviceId: uuid, recordId: uuid,
  baseVersion: z.number().int().nonnegative(), data: recordSchema,
}).strict();
export type Operation = z.infer<typeof operationSchema>;
export type ServerRecord = { id: string; version: number; data: RecordData; deleted: boolean };
export type Ack = { operationId: string; status: 'accepted' | 'conflict' | 'invalid'; record?: ServerRecord; code?: string };
export const pushSchema = z.object({ operations: z.array(operationSchema).min(1).max(50) }).strict();
export const identitySchema = z.string().trim().max(254).transform(v => v.toLowerCase()).refine(
  v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || /^\+254[17]\d{8}$/.test(v), 'INVALID_IDENTITY',
);
export const codeRequestSchema = z.object({ identity: identitySchema }).strict();
export const verifySchema = z.object({ challengeId: uuid, code: z.string().regex(/^\d{6}$/) }).strict();

export const passwordSchema = z.string().min(15).max(128);
export const passwordLoginSchema = z.object({identity: identitySchema, password: passwordSchema}).strict();
export const setPasswordSchema = z.object({password: passwordSchema}).strict();
export const refreshSchema = z.object({refreshToken: z.string().regex(/^[a-f0-9]{64}$/)}).strict();
export type AuthSession = {ownerId: string; token: string; refreshToken?: string; verificationKind: 'development_fixture'};
