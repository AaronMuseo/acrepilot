export const SQUARE_METRES_PER_ACRE = 4046.8564224;
export function acresToSquareMetres(acres: number): number {
  if (!Number.isFinite(acres) || acres <= 0) throw new Error('INVALID_AREA');
  return acres * SQUARE_METRES_PER_ACRE;
}
// P0 contains no agronomic calculations. Unknown inputs remain null/unknown.
