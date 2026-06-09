/* b44-full-sync 2026-06-01 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Eye, Zap, Star, Shield, RotateCcw, TrendingUp, EyeOff, Sparkles, X, CheckCircle2, Heart, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCurrentProfile, useLikedMeProfiles } from '@/lib/useProfile';
const features = [
  { icon: Star, title: 'Безлимитные лайки', color: '#a78bfa' },
  { icon: Zap, title: 'Boost анкеты', color: '#fbbf24' },
  { icon: EyeOff, title: 'Invisible mode', color: '#818cf8' },
  { icon: Eye, title: 'Кто тебя лайкнул', color: '#f472b6' },
  { icon: TrendingUp, title: 'Поднятие в рекомендациях', color: '#34d399' },
  { icon: Shield, title: 'Расширенные фильтры', color: '#60a5fa' },
  { icon: Crown, title: 'Premium badge', color: '#e879f9' },
  { icon: RotateCcw, title: 'Приоритетный показ', color: '#fb923c' },
];

function Toast({ onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 60 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 60 }}
      transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      className="fixed bottom-24 left-4 right-4 z-50 flex items-start gap-3 p-4 rounded-2xl"
      style={{
        background: 'linear-gradient(135deg, rgba(168,85,247,0.25), rgba(236,72,153,0.15))',
        border: '1px solid rgba(168,85,247,0.4)',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 0 30px rgba(168,85,247,0.25)',
      }}
    >
      <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm">Вы добавлены в список раннего доступа 🔥</p>
        <p className="text-xs text-muted-foreground mt-0.5">Мы уведомим вас, когда Premium станет доступен.</p>
      </div>
      <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0">
        <X className="w-4 h-4 text-muted-foreground" />
      </button>
    </motion.div>
  );
}

export default function Premium() {
  const navigate = useNavigate();
  const [showToast, setShowToast] = useState(false);
  const { data: profile } = useCurrentProfile();
  const { data: likedProfiles = [], isLoading: likedLoading } = useLikedMeProfiles(profile?.id);

  const handleEarlyAccess = () => {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 4000);
  };

  return (
    <div className="h-full overflow-y-auto bg-background text-foreground pb-28">

      {/* Background glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, hsl(270,80%,60%), transparent 70%)' }} />
        <div className="absolute top-[50%] -right-40 w-[400px] h-[400px] rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, hsl(330,85%,60%), transparent 70%)' }} />
        <div className="absolute bottom-0 -left-20 w-[300px] h-[300px] rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, hsl(270,80%,60%), transparent 70%)' }} />
      </div>

      <div className="relative z-10">

        {/* Hero */}
        <div className="flex flex-col items-center text-center px-6 pt-14 pb-10">
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 16 }}
            className="relative mb-6"
          >
            <motion.div
              animate={{ boxShadow: ['0 0 30px rgba(168,85,247,0.4)', '0 0 70px rgba(168,85,247,0.8)', '0 0 30px rgba(168,85,247,0.4)'] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              className="w-24 h-24 rounded-3xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, hsl(270,80%,60%), hsl(330,85%,60%))' }}
            >
              <motion.div animate={{ rotate: [-5, 5, -5] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}>
                <Crown className="w-12 h-12 text-white" />
              </motion.div>
            </motion.div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-4xl font-black mb-3"
          >
            <span style={{ background: 'linear-gradient(135deg, hsl(270,80%,75%), hsl(330,85%,68%))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              Premium
            </span>
            {' '}
            <span className="text-foreground">скоро</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-muted-foreground text-base leading-relaxed max-w-xs"
          >
            Мы готовим расширенные функции для самых активных пользователей
          </motion.p>
        </div>

        {/* Who liked you */}
        {likedLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : likedProfiles.length > 0 && (
          <div className="px-5 mb-8">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4 text-center">
              Кто вас лайкнул
            </p>
            <div className="rounded-3xl p-5 space-y-3"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}>
              {likedProfiles.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                    <img
                      src={p.photos?.[0] || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop'}
                      alt={p.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{p.name}, {p.age}</p>
                    <p className="text-xs text-muted-foreground truncate">{p.city || 'Город не указан'}</p>
                  </div>
                  <Heart className="w-4 h-4 text-accent flex-shrink-0" fill="currentColor" />
                </motion.div>
              ))}
              <p className="text-xs text-center text-muted-foreground pt-2">
                Поставьте лайк в Discover — при взаимной симпатии появится чат
              </p>
            </div>
          </div>
        )}

        {/* Features grid */}
        <div className="px-5 mb-8">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4 text-center">Что вас ждёт</p>
          <div className="grid grid-cols-2 gap-3">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.06 }}
                whileTap={{ scale: 0.97 }}
                className="rounded-2xl p-4 relative overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
                  style={{ background: `${f.color}22` }}>
                  <f.icon className="w-5 h-5" style={{ color: f.color }} />
                </div>
                <h3 className="font-semibold text-[13px] leading-tight mb-2">{f.title}</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(168,85,247,0.2)', color: 'hsl(270,80%,75%)', border: '1px solid rgba(168,85,247,0.3)' }}>
                  Скоро
                </span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Early Access */}
        <div className="px-5 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="rounded-3xl p-6 text-center relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(168,85,247,0.15), rgba(236,72,153,0.1))',
              border: '1px solid rgba(168,85,247,0.3)',
              boxShadow: '0 0 40px rgba(168,85,247,0.15)',
            }}
          >
            {/* subtle shimmer */}

            <div className="relative">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: 'linear-gradient(135deg, hsl(270,80%,60%), hsl(330,85%,60%))' }}>
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-black mb-2">Early Access</h3>
              <p className="text-muted-foreground text-sm mb-5 leading-relaxed">
                Первые пользователи получат Premium-функции раньше остальных
              </p>
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={handleEarlyAccess}
                className="w-full py-3.5 rounded-2xl font-bold text-white flex items-center justify-center gap-2"
                style={{
                  background: 'linear-gradient(135deg, hsl(270,80%,60%), hsl(330,85%,60%))',
                  boxShadow: '0 0 24px rgba(168,85,247,0.4)',
                }}
              >
                <Crown className="w-4 h-4" />
                Хочу ранний доступ
              </motion.button>
            </div>
          </motion.div>
        </div>

        {/* Footer message */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1 }}
          className="px-5 text-center pb-4"
        >
          <p className="text-sm text-muted-foreground mb-1">3Minutes развивается вместе с сообществом</p>
          <p className="text-sm text-muted-foreground">Спасибо, что вы с нами с самого начала ❤️</p>
        </motion.div>

      </div>

      <AnimatePresence>
        {showToast && <Toast onClose={() => setShowToast(false)} />}
      </AnimatePresence>
    </div>
  );
}