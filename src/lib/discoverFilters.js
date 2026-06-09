/* b44-full-sync 2026-06-01 */
import { RUSSIAN_CITIES } from './russianCities';

export const FILTER_CITIES = RUSSIAN_CITIES;

export const LOOKING_FOR_OPTIONS = [
  { value: 'everyone', label: 'Все', emoji: '👥' },
  { value: 'male', label: 'Мужчин', emoji: '👨' },
  { value: 'female', label: 'Женщин', emoji: '👩' },
];

export const DEFAULT_MIN_AGE = 18;
export const DEFAULT_MAX_AGE = 45;

export function getSearchFilters(profile) {
  return {
    min_age_filter: profile?.min_age_filter ?? DEFAULT_MIN_AGE,
    max_age_filter: profile?.max_age_filter ?? DEFAULT_MAX_AGE,
    city_filter: profile?.city_filter || '',
    looking_for: profile?.looking_for || 'everyone',
  };
}

export function profileMatchesFilters(candidate, filters) {
  if (!candidate || !filters) return false;
  if (filters.looking_for !== 'everyone' && candidate.gender !== filters.looking_for) return false;
  if (candidate.age != null && candidate.age < filters.min_age_filter) return false;
  if (candidate.age != null && candidate.age > filters.max_age_filter) return false;
  if (filters.city_filter && candidate.city !== filters.city_filter) return false;
  return true;
}

export function countActiveFilters(profile) {
  const filters = getSearchFilters(profile);
  let count = 0;
  if (filters.looking_for !== 'everyone') count += 1;
  if (filters.min_age_filter !== DEFAULT_MIN_AGE || filters.max_age_filter !== DEFAULT_MAX_AGE) count += 1;
  if (filters.city_filter) count += 1;
  return count;
}

export function getFilterSummary(profile) {
  const filters = getSearchFilters(profile);
  const parts = [];

  if (filters.looking_for !== 'everyone') {
    parts.push(filters.looking_for === 'male' ? 'мужчины' : 'женщины');
  }
  parts.push(`${filters.min_age_filter}–${filters.max_age_filter} лет`);
  if (filters.city_filter) {
    parts.push(filters.city_filter);
  }

  return parts.join(' · ');
}

export function buildFilterPatch({ ageRange, cityFilter, lookingFor }) {
  return {
    min_age_filter: ageRange[0],
    max_age_filter: ageRange[1],
    city_filter: cityFilter === 'Все города' || !cityFilter ? '' : cityFilter,
    looking_for: lookingFor,
  };
}
