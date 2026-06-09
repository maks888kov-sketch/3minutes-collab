/* b44-full-sync 2026-06-01 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useUpdateProfile } from '@/lib/useProfile';
import { buildFilterPatch, DEFAULT_MAX_AGE, DEFAULT_MIN_AGE } from '@/lib/discoverFilters';

const DEFAULT_FILTERS = {
  ageRange: [DEFAULT_MIN_AGE, DEFAULT_MAX_AGE],
  cityFilter: '',
  lookingFor: 'everyone',
};

function filtersFromProfile(profile) {
  if (!profile) return { ...DEFAULT_FILTERS };
  return {
    ageRange: [profile.min_age_filter || DEFAULT_MIN_AGE, profile.max_age_filter || DEFAULT_MAX_AGE],
    cityFilter: profile.city_filter || '',
    lookingFor: profile.looking_for || 'everyone',
  };
}

function filtersEqual(a, b) {
  return (
    a.lookingFor === b.lookingFor
    && a.cityFilter === b.cityFilter
    && a.ageRange[0] === b.ageRange[0]
    && a.ageRange[1] === b.ageRange[1]
  );
}

export function useSearchFilters(profile, { autoSave = true } = {}) {
  const updateProfile = useUpdateProfile();
  const queryClient = useQueryClient();

  const saved = useMemo(() => filtersFromProfile(profile), [profile]);
  const [ageRange, setAgeRange] = useState(saved.ageRange);
  const [cityFilter, setCityFilter] = useState(saved.cityFilter);
  const [lookingFor, setLookingFor] = useState(saved.lookingFor);

  useEffect(() => {
    setAgeRange(saved.ageRange);
    setCityFilter(saved.cityFilter);
    setLookingFor(saved.lookingFor);
  }, [saved.ageRange, saved.cityFilter, saved.lookingFor]);

  const isDirty = !filtersEqual(
    { ageRange, cityFilter, lookingFor },
    saved
  );

  const persistFilters = useCallback((patch) => {
    if (!profile?.id) {
      return Promise.reject(new Error('Профиль не загружен — обновите страницу'));
    }

    return new Promise((resolve, reject) => {
      updateProfile.mutate(
        { id: profile.id, data: patch },
        {
          onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['discover'] });
            resolve(data);
          },
          onError: (error) => reject(error),
        }
      );
    });
  }, [profile?.id, updateProfile, queryClient]);

  const buildCurrentPatch = useCallback(() => buildFilterPatch({
    ageRange,
    cityFilter,
    lookingFor,
  }), [ageRange, cityFilter, lookingFor]);

  const handleAgeChange = useCallback((range) => {
    setAgeRange(range);
    if (autoSave) {
      persistFilters(buildFilterPatch({ ageRange: range, cityFilter, lookingFor }));
    }
  }, [autoSave, cityFilter, lookingFor, persistFilters]);

  const handleCityChange = useCallback((val) => {
    const nextCity = val === 'Все города' ? '' : val;
    setCityFilter(nextCity);
    if (autoSave) {
      persistFilters(buildFilterPatch({
        ageRange,
        cityFilter: val,
        lookingFor,
      }));
    }
  }, [autoSave, ageRange, lookingFor, persistFilters]);

  const handleLookingForChange = useCallback((val) => {
    setLookingFor(val);
    if (autoSave) {
      persistFilters(buildFilterPatch({ ageRange, cityFilter, lookingFor: val }));
    }
  }, [autoSave, ageRange, cityFilter, persistFilters]);

  const applyFilters = useCallback(() => {
    return persistFilters(buildCurrentPatch());
  }, [buildCurrentPatch, persistFilters]);

  const resetFilters = useCallback((saveNow = autoSave) => {
    setAgeRange(DEFAULT_FILTERS.ageRange);
    setCityFilter(DEFAULT_FILTERS.cityFilter);
    setLookingFor(DEFAULT_FILTERS.lookingFor);
    if (saveNow) {
      return persistFilters(buildFilterPatch(DEFAULT_FILTERS));
    }
    return Promise.resolve();
  }, [autoSave, persistFilters]);

  return {
    ageRange,
    cityFilter,
    lookingFor,
    handleAgeChange,
    handleCityChange,
    handleLookingForChange,
    applyFilters,
    resetFilters,
    isDirty,
    isSaving: updateProfile.isPending,
    saveError: updateProfile.error,
  };
}
