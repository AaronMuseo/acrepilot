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
export const recordSchema = z.discriminatedUnion('kind', [farmSchema, taskSchema, plotSchema]);
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
