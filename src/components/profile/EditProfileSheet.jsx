/* b44-full-sync 2026-06-01 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { getAuthErrorMessage, isAppUnavailableError } from '@/lib/authRedirect';
import AppPublishRequired from '@/components/AppPublishRequired';

import { INTEREST_OPTIONS } from '@/lib/profileUtils';
import { RUSSIAN_CITIES } from '@/lib/russianCities';

export default function EditProfileSheet({
  profile,
  onSave,
  onClose,
  isSaving,
  saveError,
  onClearError,
}) {
  const [form, setForm] = useState({
    name: profile?.name || '',
    age: profile?.age || '',
    city: profile?.city || '',
    bio: profile?.bio || '',
    interests: profile?.interests || [],
  });
  const [localError, setLocalError] = useState('');
  const [showPublishHelp, setShowPublishHelp] = useState(false);

  useEffect(() => {
    if (profile) {
      setForm({
        name: profile.name || '',
        age: profile.age || '',
        city: profile.city || '',
        bio: profile.bio || '',
        interests: profile.interests || [],
      });
    }
  }, [profile]);

  const toggleInterest = (interest) => {
    setForm((prev) => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter((i) => i !== interest)
        : [...prev.interests, interest],
    }));
  };

  const displayError = saveError || localError;

  const handleSubmit = async () => {
    setLocalError('');
    onClearError?.();

    if (!form.name?.trim()) {
      setLocalError('Укажите имя');
      return;
    }

    try {
      await onSave({
        ...form,
        name: form.name.trim(),
        age: parseInt(form.age, 10) || profile?.age || 25,
      });
    } catch (err) {
      setLocalError(getAuthErrorMessage(err));
      setShowPublishHelp(isAppUnavailableError(err));
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[200] flex items-center justify-center px-4"
        style={{ paddingBottom: '90px' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

        <motion.div
          className="relative w-full max-w-md rounded-3xl z-10 flex flex-col"
          style={{
            background: 'hsl(250,15%,10%)',
            border: '1px solid rgba(255,255,255,0.1)',
            maxHeight: '70vh',
            boxShadow: '0 0 60px rgba(0,0,0,0.6)',
          }}
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          <div className="flex items-center justify-between px-6 pt-5 pb-4 flex-shrink-0">
            <h3 className="text-lg font-bold">Редактировать профиль</h3>
            <button onClick={onClose} className="p-1.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="overflow-y-auto flex-1 px-6 pb-2">
            <div className="space-y-3">
              <Input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Имя *"
                className="h-11 bg-secondary border-0 rounded-xl"
                disabled={isSaving}
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="number"
                  value={form.age}
                  onChange={(e) => setForm((p) => ({ ...p, age: e.target.value }))}
                  placeholder="Возраст"
                  className="h-11 bg-secondary border-0 rounded-xl"
                  disabled={isSaving}
                />
                <select
                  value={form.city}
                  onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                  className="h-11 bg-secondary border-0 rounded-xl px-3 text-sm text-foreground outline-none"
                  disabled={isSaving}
                >
                  <option value="">Выберите город</option>
                  {RUSSIAN_CITIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <textarea
                value={form.bio}
                onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
                placeholder="О себе..."
                rows={3}
                className="w-full bg-secondary border-0 rounded-xl px-3 py-3 text-sm text-foreground outline-none resize-none placeholder:text-muted-foreground"
                disabled={isSaving}
              />
              <div>
                <p className="text-xs text-muted-foreground mb-2">Интересы</p>
                <div className="flex flex-wrap gap-1.5">
                  {INTEREST_OPTIONS.map((interest) => (
                    <button
                      key={interest}
                      type="button"
                      onClick={() => toggleInterest(interest)}
                      disabled={isSaving}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                        form.interests.includes(interest)
                          ? 'gradient-primary text-white'
                          : 'bg-secondary text-foreground/70 hover:text-foreground'
                      }`}
                    >
                      {interest}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {displayError && (
              <p className="mt-3 text-sm text-destructive bg-destructive/10 rounded-xl px-3 py-2">
                {displayError}
              </p>
            )}
            {showPublishHelp && <AppPublishRequired compact />}
          </div>

          <div className="flex gap-3 px-6 py-4 flex-shrink-0 border-t border-white/5">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={isSaving}
              className="flex-1 rounded-xl border border-white/10"
            >
              Отмена
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSaving}
              className="flex-1 rounded-xl border-0"
              style={{ background: 'linear-gradient(135deg, hsl(270,80%,60%), hsl(330,85%,60%))' }}
            >
              {isSaving ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
