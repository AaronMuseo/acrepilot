import { calendarDateSchema, type AreaRevision, type FarmData, type PlotData } from '../contracts';
export const todayInKenya = () => new Date().toLocaleDateString('en-CA', {timeZone: 'Africa/Nairobi'});
const same = (a: AreaRevision[], b: AreaRevision[]) => a.length === b.length && a.every((item, index) => item.id === b[index].id && item.effectiveDate === b[index].effectiveDate && item.areaM2 === b[index].areaM2 && item.reason === b[index].reason);
/** Server-enforced append-only history; dates are local calendar dates, never UTC instants. */
export function areaChangeError(previous: FarmData | PlotData | undefined, next: FarmData | PlotData, today = todayInKenya()): string | null {
  if (!previous) return next.areaHistory || (next.kind === 'plot' && next.areaM2 !== null) ? 'AREA_HISTORY_INVALID' : null;
  if (previous.kind === 'farm' && next.kind === 'farm' && previous.plotId !== next.plotId) return 'PLOT_IMMUTABLE';
  const old = previous.areaHistory ?? []; const history = next.areaHistory ?? [];
  if (previous.areaM2 === next.areaM2) return same(old, history) ? null : 'AREA_HISTORY_INVALID';
  if (next.areaM2 === null) return 'INVALID_AREA';
  const prefixLength = old.length || 1;
  if (history.length !== prefixLength + 1) return 'AREA_HISTORY_REQUIRED';
  if (old.length && !same(old, history.slice(0, old.length))) return 'AREA_HISTORY_IMMUTABLE';
  if (!old.length) {
    const baseline = history[0];
    if (baseline.reason !== 'baseline' || baseline.effectiveDate !== null || baseline.areaM2 !== previous.areaM2) return 'AREA_HISTORY_INVALID';
  }
  if (new Set(history.map(item => item.id)).size !== history.length) return 'AREA_HISTORY_INVALID';
  const revision = history.at(-1)!;
  if (revision.reason === 'baseline' || revision.areaM2 !== next.areaM2) return 'AREA_HISTORY_INVALID';
  if (!revision.effectiveDate || !calendarDateSchema.safeParse(revision.effectiveDate).success || revision.effectiveDate > today || (old.at(-1)?.effectiveDate && revision.effectiveDate < old.at(-1)!.effectiveDate!)) return 'AREA_DATE_INVALID';
  if (revision.reason === 'expansion' && (previous.areaM2 === null || next.areaM2 <= previous.areaM2)) return 'AREA_REASON_INVALID';
  if (revision.reason === 'reduction' && (previous.areaM2 === null || next.areaM2 >= previous.areaM2)) return 'AREA_REASON_INVALID';
  return null;
}
export function reviseArea<T extends FarmData | PlotData>(previous: T, areaM2: number, effectiveDate: string, reason: Exclude<AreaRevision['reason'], 'baseline'>, uuid: () => string): T {
  if (previous.areaM2 === areaM2) throw new Error('AREA_UNCHANGED');
  const history: AreaRevision[] = previous.areaHistory ?? [{id: uuid(), areaM2: previous.areaM2, effectiveDate: null, reason: 'baseline'}];
  const next: T = {...previous, areaM2, areaHistory: [...history, {id: uuid(), areaM2, effectiveDate, reason}]};
  const error = areaChangeError(previous, next); if (error) throw new Error(error);
  return next;
}
