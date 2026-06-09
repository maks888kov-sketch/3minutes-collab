/* b44-full-sync 2026-06-01 */
import { motion } from 'framer-motion';
import { Flame, X, Heart, MapPin, Star } from 'lucide-react';
import { displayInterest, isProfileOnline } from '@/lib/profileUtils';

export default function DailyPicks({ profiles, onClose, onSwipe }) {
  const picks = profiles.slice(0, 3);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center"
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-xl" onClick={onClose} />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="relative z-10 w-full max-w-lg glass-strong rounded-t-3xl p-6 pb-10"
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-400" />
            <h2 className="text-lg font-bold">Подбор дня</h2>
            <span className="text-xs glass px-2 py-0.5 rounded-full text-muted-foreground">3 сегодня</span>
          </div>
          <button onClick={onClose} className="glass p-2 rounded-xl">
            <X className="w-4 h-4" />
          </button>
        </div>

        {picks.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Пока нет кандидатов — загляни позже</p>
        ) : (
          <div className="space-y-3">
            {picks.map((p, i) => {
              const online = isProfileOnline(p);
              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="glass rounded-2xl p-4 flex items-center gap-4"
                >
                  <div className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 relative">
                    <img
                      src={p.photos?.[0] || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop'}
                      alt={p.name}
                      className="w-full h-full object-cover"
                    />
                    {online && (
                      <div className="absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full bg-green-500 border border-background" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="font-semibold">{p.name}</span>
                      <span className="text-muted-foreground text-sm">{p.age}</span>
                      {p.is_verified && <Star className="w-3 h-3 text-blue-400" fill="currentColor" />}
                      {online && (
                        <span className="text-[10px] text-green-400 font-medium">онлайн</span>
                      )}
                    </div>
                    {p.city && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="w-3 h-3" />
                        {p.city}
                      </div>
                    )}
                    {p.interests?.length > 0 && (
                      <div className="flex gap-1 mt-1.5 flex-wrap">
                        {p.interests.slice(0, 2).map((tag) => {
                          const { label } = displayInterest(tag);
                          return (
                            <span key={tag} className="text-[10px] glass px-2 py-0.5 rounded-full text-muted-foreground">
                              {label}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => onSwipe(p, 'left')}
                      className="w-9 h-9 rounded-full glass flex items-center justify-center"
                    >
                      <X className="w-4 h-4 text-red-400" />
                    </button>
                    <button
                      onClick={() => onSwipe(p, 'right')}
                      className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center neon-glow"
                    >
                      <Heart className="w-4 h-4 text-white" fill="white" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
