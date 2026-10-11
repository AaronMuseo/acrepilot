import { validAreaUnit, type AreaUnit } from '../../../packages/domain';
import type { Repository } from './repository';
export function readPreferences(repo: Repository) {
  return {areaUnit: validAreaUnit(repo.meta('areaUnit'))};
}
export function readFarmDraft(repo: Repository) {
  const area = repo.meta('draftArea') ?? '';
  return {name: repo.meta('draftFarmName') ?? '', area,
    // Earlier versions saved drafts in acres without a unit tag.
    unit: area ? validAreaUnit(repo.meta('draftAreaUnit')) : readPreferences(repo).areaUnit};
}
export function saveDraftArea(repo: Repository, area: string, unit: AreaUnit) {
  repo.transaction(() => { repo.setMeta('draftArea', area); repo.setMeta('draftAreaUnit', unit); });
}
export function saveAreaUnit(repo: Repository, unit: AreaUnit) {
  repo.setMeta('areaUnit', validAreaUnit(unit));
}
