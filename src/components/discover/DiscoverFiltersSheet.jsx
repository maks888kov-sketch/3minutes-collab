/* b44-full-sync 2026-06-01 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import { SlidersHorizontal, X, Loader2, RotateCcw } from 'lucide-react';
import SearchFilters from '@/components/discover/SearchFilters';
import { useSearchFilters } from '@/lib/useSearchFilters';
import { getFilterSummary } from '@/lib/discoverFilters';
import { getAuthErrorMessage } from '@/lib/authRedirect';

export default function DiscoverFiltersSheet({ profile, onClose }) {
  const [feedback, setFeedback] = useState('');
  const {
    ageRange,
    cityFilter,
    lookingFor,
    handleAgeChange,
    handleCityChange,
    handleLookingForChange,
    applyFilters,
    resetFilters,
    isDirty,
    isSaving,
  } = useSearchFilters(profile, { autoSave: false });

  const previewSummary = getFilterSummary({
    looking_for: lookingFor,
    min_age_filter: ageRange[0],
    max_age_filter: ageRange[1],
    city_filter: cityFilter,
  });

  const handleApply = async () => {
    setFeedback('');
    try {
      await applyFilters();
      setFeedback('Фильтры сохранены');
      setTimeout(onClose, 350);
    } catch (error) {
      setFeedback(getAuthErrorMessage(error));
    }
  };

  const handleReset = async () => {
    setFeedback('');
    try {
      await resetFilters(true);
      setFeedback('Фильтры сброшены');
    } catch (error) {
      setFeedback(getAuthErrorMessage(error));
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60]"
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-xl" onClick={onClose} />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="absolute inset-x-0 bottom-[5.25rem] mx-auto flex w-full max-w-lg flex-col glass-strong rounded-t-3xl max-h-[min(78vh,calc(100dvh-5.5rem))] safe-bottom"
      >
        <div className="flex-shrink-0 px-6 pt-6 pb-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold">Фильтры поиска</h2>
            </div>
            <button type="button" onClick={onClose} className="glass p-2 rounded-xl" aria-label="Закрыть">
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Настройте параметры и нажмите «Применить» — лента обновится сразу
          </p>
          <p className="text-xs text-primary/90 mt-2 font-medium">
            Будет показано: {previewSummary}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-4">
          <SearchFilters
            ageRange={ageRange}
            cityFilter={cityFilter}
            lookingFor={lookingFor}
            onAgeChange={handleAgeChange}
            onCityChange={handleCityChange}
            onLookingForChange={handleLookingForChange}
            disabled={isSaving}
          />
        </div>

        <div
          className="flex-shrink-0 px-6 pt-3 pb-5 border-t border-white/10 space-y-2"
          style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
        >
          {feedback && (
            <p className={`text-xs text-center ${feedback.includes('ошиб') || feedback.includes('не') ? 'text-red-400' : 'text-emerald-400'}`}>
              {feedback}
            </p>
          )}

          <button
            type="button"
            onClick={handleApply}
            disabled={isSaving || !profile?.id}
            className="w-full h-12 rounded-2xl font-semibold text-sm text-white flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, hsl(270,80%,60%), hsl(330,85%,60%))' }}
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {isDirty ? 'Применить фильтры' : 'Применить'}
          </button>

          <button
            type="button"
            onClick={handleReset}
            disabled={isSaving}
            className="w-full h-11 rounded-2xl font-medium text-sm glass text-muted-foreground hover:text-foreground flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <RotateCcw className="w-4 h-4" />
            Сбросить фильтры
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
