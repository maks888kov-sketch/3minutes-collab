/* b44-full-sync 2026-06-01 */
import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/lib/AuthContext';
import { useCurrentProfile, useUpdateProfile } from '@/lib/useProfile';
import { getAuthErrorMessage } from '@/lib/authRedirect';
import { getUploadErrorMessage, uploadPublicFile } from '@/lib/uploadFile';
import { PROFILE_GOALS, INTEREST_OPTIONS } from '@/lib/profileUtils';
import { RUSSIAN_CITIES } from '@/lib/russianCities';
import { Camera, ArrowRight, ArrowLeft, Sparkles, MapPin, User, Target, Loader2 } from 'lucide-react';

const goals = PROFILE_GOALS;

const steps = ['photos', 'basics', 'about', 'interests', 'goal'];

function guessNameFromUser(user) {
  if (!user) return '';
  const full = user.full_name?.trim() || user.name?.trim();
  if (full) return full;
  const email = user.email?.trim();
  if (!email) return '';
  const local = email.split('@')[0]?.replace(/[._-]+/g, ' ').trim();
  if (!local) return '';
  return local.charAt(0).toUpperCase() + local.slice(1);
}

export default function ProfileSetup() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoadingAuth, authChecked, user } = useAuth();
  const { data: existingProfile } = useCurrentProfile();
  const updateProfile = useUpdateProfile();
  const userPrefilledRef = useRef(false);
  const profilePrefilledRef = useRef(false);
  const [step, setStep] = useState(0);
  const [photoSlots, setPhotoSlots] = useState(Array(6).fill(null));
  const [uploadingIndex, setUploadingIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [photoError, setPhotoError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [stepError, setStepError] = useState('');
  const [form, setForm] = useState({
    name: '',
    age: '',
    city: '',
    bio: '',
    gender: 'male',
    looking_for: 'everyone',
    interests: [],
    goal: 'relationship',
  });

  useEffect(() => {
    if (userPrefilledRef.current || !user) return;
    userPrefilledRef.current = true;
    const fromUser = guessNameFromUser(user);
    if (fromUser) {
      setForm((prev) => ({ ...prev, name: prev.name.trim() ? prev.name : fromUser }));
    }
  }, [user]);

  useEffect(() => {
    if (profilePrefilledRef.current || !existingProfile) return;
    profilePrefilledRef.current = true;

    setForm((prev) => ({
      ...prev,
      name: existingProfile.name?.trim() || prev.name,
      age: existingProfile.age ? String(existingProfile.age) : prev.age,
      city: existingProfile.city || prev.city,
      bio: existingProfile.bio || prev.bio,
      gender: existingProfile.gender || prev.gender,
      looking_for: existingProfile.looking_for || prev.looking_for,
      interests: existingProfile.interests?.length ? existingProfile.interests : prev.interests,
      goal: existingProfile.goal || prev.goal,
    }));

    if (existingProfile.photos?.length) {
      setPhotoSlots((prev) => {
        const next = [...prev];
        existingProfile.photos.forEach((url, i) => {
          if (i < 6) next[i] = url;
        });
        return next;
      });
    }
  }, [existingProfile]);

  useEffect(() => {
    if (existingProfile?.profile_complete) {
      navigate('/discover', { replace: true });
    }
  }, [existingProfile?.profile_complete, navigate]);

  const uploadedPhotos = photoSlots.filter((url) => url && !url.startsWith('blob:'));

  const processFile = async (slotIndex, file) => {
    if (!file) return;
    if (uploadingIndex !== null) return;

    if (!file.type.startsWith('image/')) {
      setPhotoError('Выберите изображение (JPG, PNG и т.д.)');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setPhotoError('Файл слишком большой. Максимум 10 МБ');
      return;
    }

    setPhotoError('');
    setUploadingIndex(slotIndex);

    const previewUrl = URL.createObjectURL(file);
    setPhotoSlots((prev) => {
      const next = [...prev];
      if (next[slotIndex]?.startsWith('blob:')) {
        URL.revokeObjectURL(next[slotIndex]);
      }
      next[slotIndex] = previewUrl;
      return next;
    });

    try {
      const file_url = await uploadPublicFile(file);
      setPhotoSlots((prev) => {
        const next = [...prev];
        if (next[slotIndex]?.startsWith('blob:')) {
          URL.revokeObjectURL(next[slotIndex]);
        }
        next[slotIndex] = file_url;
        return next;
      });
    } catch (error) {
      setPhotoSlots((prev) => {
        const next = [...prev];
        if (next[slotIndex]?.startsWith('blob:')) {
          URL.revokeObjectURL(next[slotIndex]);
        }
        next[slotIndex] = null;
        return next;
      });
      setPhotoError(getUploadErrorMessage(error));
      if (error?.code === 'NOT_AUTHENTICATED' || error?.status === 401 || error?.status === 403) {
        setTimeout(() => navigate('/login', { replace: true, state: { from: '/profile-setup' } }), 2000);
      }
    } finally {
      setUploadingIndex(null);
    }
  };

  const handlePhotoUpload = (slotIndex, e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    processFile(slotIndex, file);
  };

  const handleDrop = (slotIndex, e) => {
    e.preventDefault();
    setDragOverIndex(null);
    const file = e.dataTransfer?.files?.[0];
    processFile(slotIndex, file);
  };

  const toggleInterest = (interest) => {
    setForm(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest],
    }));
  };

  const handleSubmit = async () => {
    setSubmitError('');

    const profileData = {
      ...form,
      name: form.name.trim(),
      city: form.city.trim(),
      photos: uploadedPhotos.length > 0 ? uploadedPhotos : (existingProfile?.photos || []),
      age: parseInt(form.age, 10) || 25,
      profile_complete: true,
      is_online: true,
      last_seen: new Date().toISOString(),
    };

    if (!profileData.name) {
      setSubmitError('Укажите имя');
      setStep(1);
      return;
    }
    if (!profileData.city) {
      setSubmitError('Укажите город');
      setStep(1);
      return;
    }
    if (!profileData.photos.length) {
      setSubmitError('Добавьте хотя бы одно фото');
      setStep(0);
      return;
    }

    try {
      const saved = await updateProfile.mutateAsync({
        id: existingProfile?.id,
        data: profileData,
      });

      const merged = { ...(existingProfile || {}), ...(saved || profileData), profile_complete: true };
      queryClient.setQueryData(['currentProfile'], merged);
      await queryClient.refetchQueries({ queryKey: ['currentProfile'] });

      navigate('/discover', { replace: true });
    } catch (error) {
      setSubmitError(getAuthErrorMessage(error) || 'Не удалось сохранить профиль. Попробуйте ещё раз.');
    }
  };

  const validateStep = (stepIndex) => {
    if (stepIndex === 0) {
      if (uploadingIndex !== null) return 'Дождитесь загрузки фото';
      if (uploadedPhotos.length === 0) return 'Добавьте хотя бы одно фото';
    }
    if (stepIndex === 1) {
      if (!form.name.trim()) return 'Введите имя — поле «Как тебя зовут?»';
      const ageNum = parseInt(form.age, 10);
      if (!form.age || Number.isNaN(ageNum)) return 'Укажите возраст числом';
      if (ageNum < 18 || ageNum > 99) return 'Возраст должен быть от 18 до 99';
      if (!form.city.trim()) return 'Выберите город из списка';
    }
    return null;
  };

  const handleNext = () => {
    setStepError('');
    setSubmitError('');
    const err = validateStep(step);
    if (err) {
      setStepError(err);
      return;
    }
    setStep((s) => s + 1);
  };

  const canNext = () => {
    if (step === 0) return uploadedPhotos.length > 0 && uploadingIndex === null;
    if (step === 1) return true;
    return true;
  };

  if (authChecked && !isLoadingAuth && !isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <p className="text-muted-foreground mb-4">Чтобы загрузить фото, нужно войти в аккаунт</p>
        <Button asChild className="gradient-primary rounded-2xl border-0">
          <Link to="/login" state={{ from: '/profile-setup' }}>Войти</Link>
        </Button>
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => e.preventDefault()}
      className="min-h-screen flex flex-col px-6 py-8 safe-top safe-bottom relative overflow-hidden md:max-w-md md:mx-auto md:w-full"
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-primary/10 blur-[120px]" />
      </div>

      {/* Progress */}
      <div className="relative z-10 flex items-center gap-1.5 mb-8">
        {steps.map((_, i) => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-500 ${
            i <= step ? 'gradient-primary' : 'bg-muted'
          }`} />
        ))}
      </div>

      <div className="relative z-10 flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            className="h-full"
          >
            {step === 0 && (
              <div>
                <h2 className="text-2xl font-bold mb-2">Добавь фото</h2>
                <p className="text-muted-foreground mb-6">Нажми на квадрат или перетащи фото сюда — добавь хотя бы одно</p>
                <div className="grid grid-cols-3 gap-3">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <label
                      key={i}
                      onDragOver={(e) => {
                        e.preventDefault();
                        if (uploadingIndex === null) setDragOverIndex(i);
                      }}
                      onDragLeave={() => setDragOverIndex((cur) => (cur === i ? null : cur))}
                      onDrop={(e) => handleDrop(i, e)}
                      className={`aspect-[3/4] rounded-2xl overflow-hidden cursor-pointer border-2 border-dashed transition-colors relative ${
                        dragOverIndex === i
                          ? 'border-primary bg-primary/10 scale-[1.02]'
                          : uploadingIndex === i ? 'border-primary/50' : 'border-muted hover:border-primary/50'
                      } ${uploadingIndex !== null && uploadingIndex !== i ? 'opacity-60 pointer-events-none' : ''}`}
                    >
                      {photoSlots[i] ? (
                        <img src={photoSlots[i]} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center glass">
                          <Camera className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                      {uploadingIndex === i && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                          <Loader2 className="w-8 h-8 text-white animate-spin" />
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handlePhotoUpload(i, e)}
                        className="sr-only"
                        disabled={uploadingIndex !== null}
                      />
                    </label>
                  ))}
                </div>
                {photoError && (
                  <p className="mt-3 text-sm text-destructive">{photoError}</p>
                )}
                {uploadedPhotos.length > 0 && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Загружено фото: {uploadedPhotos.length}
                  </p>
                )}
              </div>
            )}

            {step === 1 && (
              <div className="space-y-5">
                <h2 className="text-2xl font-bold mb-2">Расскажи о себе</h2>
                <p className="text-sm text-muted-foreground -mt-1 mb-1">
                  Серый текст в полях — подсказка, его нужно заменить своими данными
                </p>
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">
                    <User className="w-4 h-4 inline mr-1" />Имя <span className="text-destructive">*</span>
                  </label>
                  <Input
                    value={form.name}
                    onChange={(e) => {
                      setStepError('');
                      setForm(prev => ({ ...prev, name: e.target.value }));
                    }}
                    placeholder="Как тебя зовут?"
                    autoFocus
                    className={`h-12 bg-secondary border-0 rounded-xl text-base ${!form.name.trim() && stepError ? 'ring-1 ring-destructive/60' : ''}`}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-muted-foreground mb-1.5 block">
                      Возраст <span className="text-destructive">*</span>
                    </label>
                    <Input
                      type="number"
                      min={18}
                      max={99}
                      value={form.age}
                      onChange={(e) => {
                        setStepError('');
                        setForm(prev => ({ ...prev, age: e.target.value }));
                      }}
                      placeholder="Ваш возраст"
                      className={`h-12 bg-secondary border-0 rounded-xl text-base ${!form.age && stepError ? 'ring-1 ring-destructive/60' : ''}`}
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1.5 block">
                      <MapPin className="w-4 h-4 inline mr-1" />Город <span className="text-destructive">*</span>
                    </label>
                    <select
                      value={form.city}
                      onChange={(e) => {
                        setStepError('');
                        setForm(prev => ({ ...prev, city: e.target.value }));
                      }}
                      className={`w-full h-12 bg-secondary border-0 rounded-xl px-3 text-sm text-foreground outline-none appearance-none ${!form.city.trim() && stepError ? 'ring-1 ring-destructive/60' : ''}`}
                    >
                      <option value="">Выберите город</option>
                      {RUSSIAN_CITIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">Пол</label>
                  <div className="flex gap-2">
                    {[
                      { value: 'male', label: '👨 Мужской' },
                      { value: 'female', label: '👩 Женский' },
                    ].map(g => (
                      <button
                        key={g.value}
                        onClick={() => setForm(prev => ({ ...prev, gender: g.value }))}
                        className={`flex-1 h-12 rounded-xl font-medium transition-all ${
                          form.gender === g.value
                            ? 'gradient-primary text-white neon-glow'
                            : 'glass text-muted-foreground'
                        }`}
                      >
                        {g.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">Кого ищешь?</label>
                  <div className="flex gap-2">
                    {[
                      { value: 'male', label: '👨' },
                      { value: 'female', label: '👩' },
                      { value: 'everyone', label: 'Все' },
                    ].map(g => (
                      <button
                        key={g.value}
                        onClick={() => setForm(prev => ({ ...prev, looking_for: g.value }))}
                        className={`flex-1 h-12 rounded-xl font-medium transition-all ${
                          form.looking_for === g.value
                            ? 'gradient-primary text-white neon-glow'
                            : 'glass text-muted-foreground'
                        }`}
                      >
                        {g.label}
                      </button>
                    ))}
                  </div>
                </div>
                {stepError && step === 1 && (
                  <p className="text-sm text-destructive">{stepError}</p>
                )}
              </div>
            )}

            {step === 2 && (
              <div>
                <h2 className="text-2xl font-bold mb-2">О себе</h2>
                <p className="text-muted-foreground mb-6">Напиши пару слов — это поможет найти интересных людей</p>
                <Textarea
                  value={form.bio}
                  onChange={(e) => setForm(prev => ({ ...prev, bio: e.target.value }))}
                  placeholder="Люблю путешествовать, играю на гитаре, ищу интересных людей для общения..."
                  className="min-h-[200px] bg-secondary border-0 rounded-xl text-base resize-none"
                />
              </div>
            )}

            {step === 3 && (
              <div>
                <h2 className="text-2xl font-bold mb-2">Интересы</h2>
                <p className="text-muted-foreground mb-6">Выбери то, что тебе близко</p>
                <div className="flex flex-wrap gap-2">
                  {INTEREST_OPTIONS.map((interest) => (
                    <button
                      key={interest}
                      onClick={() => toggleInterest(interest)}
                      className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        form.interests.includes(interest)
                          ? 'gradient-primary text-white neon-glow'
                          : 'glass text-foreground/70 hover:text-foreground'
                      }`}
                    >
                      {interest}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 4 && (
              <div>
                <h2 className="text-2xl font-bold mb-2">
                  <Target className="w-6 h-6 inline mr-2" />Цель знакомства
                </h2>
                <p className="text-muted-foreground mb-6">Что ты ищешь?</p>
                <div className="space-y-3">
                  {goals.map((goal) => (
                    <button
                      key={goal.value}
                      onClick={() => setForm(prev => ({ ...prev, goal: goal.value }))}
                      className={`w-full p-4 rounded-2xl text-left transition-all ${
                        form.goal === goal.value
                          ? 'glass-strong border-primary/30 neon-glow'
                          : 'glass'
                      }`}
                    >
                      <div className="text-lg font-semibold">{goal.emoji} {goal.label}</div>
                      <div className="text-sm text-muted-foreground mt-0.5">{goal.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="relative z-10 flex flex-col gap-3 mt-6">
        {(submitError || (stepError && step !== 1)) && (
          <p className="text-sm text-destructive text-center px-2">{submitError || stepError}</p>
        )}
        <div className="flex gap-3">
        {step > 0 && (
          <Button
            variant="outline"
            onClick={() => { setStepError(''); setStep(s => s - 1); }}
            className="h-14 px-6 rounded-2xl bg-secondary border-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
        )}
        <Button
          onClick={step === steps.length - 1 ? handleSubmit : handleNext}
          disabled={(step === 0 && !canNext()) || updateProfile.isPending}
          className="flex-1 h-14 text-lg font-semibold gradient-primary rounded-2xl border-0 neon-glow disabled:opacity-40"
        >
          {step === steps.length - 1 ? (
            <>Готово <Sparkles className="w-5 h-5 ml-2" /></>
          ) : (
            <>Далее <ArrowRight className="w-5 h-5 ml-2" /></>
          )}
        </Button>
        </div>
      </div>
    </div>
  );
}