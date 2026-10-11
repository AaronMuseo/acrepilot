export type AreaUnit = 'acres' | 'hectares' | 'squareMetres';
export const areaUnits: AreaUnit[] = ['acres', 'hectares', 'squareMetres'];
export const SQUARE_METRES_PER_ACRE = 4046.8564224;
const factors: Record<AreaUnit, number> = {acres: SQUARE_METRES_PER_ACRE, hectares: 10000, squareMetres: 1};
export const validAreaUnit = (value: unknown): AreaUnit => areaUnits.includes(value as AreaUnit) ? value as AreaUnit : 'acres';
export function areaToSquareMetres(value: number, unit: AreaUnit): number {
  const result = value * factors[unit];
  if (!Number.isFinite(result) || result <= 0) throw new Error('INVALID_AREA');
  return result;
}
export const squareMetresToArea = (value: number, unit: AreaUnit) => value / factors[unit];
export const acresToSquareMetres = (value: number) => areaToSquareMetres(value, 'acres');
// No agronomic calculations. Unknown inputs remain null/unknown.
