/* b44-full-sync 2026-06-01 */
import { useMemo, useState } from 'react';
import AgeRangeSlider from '@/components/profile/AgeRangeSlider';
import { Input } from '@/components/ui/input';
import { FILTER_CITIES, LOOKING_FOR_OPTIONS } from '@/lib/discoverFilters';

export default function SearchFilters({
  ageRange,
  cityFilter,
  lookingFor,
  onAgeChange,
  onCityChange,
  onLookingForChange,
  disabled = false,
}) {
  const [citySearch, setCitySearch] = useState('');
  const cityValue = cityFilter || 'Все города';

  const filteredCities = useMemo(() => {
    const query = citySearch.trim().toLowerCase();
    if (!query) return FILTER_CITIES;
    return FILTER_CITIES.filter((city) => city.toLowerCase().includes(query));
  }, [citySearch]);

  return (
    <div className="space-y-4">
      <div>
        <span className="text-xs text-muted-foreground block mb-2">Кого показывать</span>
        <div className="grid grid-cols-3 gap-2">
          {LOOKING_FOR_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              disabled={disabled}
              onClick={() => onLookingForChange(option.value)}
              className={`h-11 rounded-xl text-sm font-medium transition-all disabled:opacity-50 ${
                lookingFor === option.value
                  ? 'gradient-primary text-white neon-glow'
                  : 'glass text-muted-foreground hover:text-foreground'
              }`}
            >
              <span className="mr-1">{option.emoji}</span>
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <AgeRangeSlider min={18} max={65} value={ageRange} onChange={onAgeChange} />

      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">Город</span>
          <span className="text-[10px] text-muted-foreground">{FILTER_CITIES.length} городов</span>
        </div>
        <Input
          value={citySearch}
          onChange={(e) => setCitySearch(e.target.value)}
          placeholder="Найти город..."
          disabled={disabled}
          className="h-10 bg-secondary border-0 rounded-xl mb-2"
        />
        <select
          value={cityValue}
          onChange={(e) => onCityChange(e.target.value)}
          disabled={disabled}
          className="w-full h-11 bg-secondary border-0 rounded-xl px-3 text-sm text-foreground outline-none appearance-none disabled:opacity-50"
        >
          <option value="Все города">Все города</option>
          {filteredCities.map((city) => (
            <option key={city} value={city}>{city}</option>
          ))}
        </select>
        {citySearch && filteredCities.length === 0 && (
          <p className="text-xs text-muted-foreground mt-2">Город не найден — попробуй другое название</p>
        )}
      </div>
    </div>
  );
}
