/* b44-full-sync 2026-06-01 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { markOnboardingSeen } from '@/lib/authRedirect';
import { Heart, MessageCircle, Video, ArrowRight, Sparkles } from 'lucide-react';

const slides = [
  {
    icon: Heart,
    title: 'Находи людей рядом',
    subtitle: 'Листай карточки, ставь лайки и находи тех, кто тебе по душе',
    gradient: 'from-purple-500 to-pink-500',
  },
  {
    icon: MessageCircle,
    title: 'Общайся без границ',
    subtitle: 'Текст, фото, голосовые — узнай человека до встречи',
    gradient: 'from-pink-500 to-rose-500',
  },
  {
    icon: Video,
    title: '3 минуты химии',
    subtitle: 'Короткий видеозвонок покажет, есть ли искра между вами',
    gradient: 'from-violet-500 to-purple-500',
  },
];

export default function Onboarding() {
  const [current, setCurrent] = useState(0);
  const navigate = useNavigate();

  const goToRegister = () => {
    markOnboardingSeen();
    navigate('/register');
  };

  const handleNext = () => {
    if (current < slides.length - 1) {
      setCurrent(current + 1);
    } else {
      goToRegister();
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-between px-6 py-12 safe-top safe-bottom relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 -left-32 w-64 h-64 rounded-full bg-primary/20 blur-[100px]" />
        <div className="absolute bottom-1/4 -right-32 w-64 h-64 rounded-full bg-accent/20 blur-[100px]" />
      </div>

      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 flex items-center gap-2"
      >
        <Sparkles className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold gradient-text">3Minutes</h1>
      </motion.div>

      {/* Slide content */}
      <div className="relative z-10 flex-1 flex items-center justify-center w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="text-center"
          >
            <div className={`w-24 h-24 rounded-3xl bg-gradient-to-br ${slides[current].gradient} flex items-center justify-center mx-auto mb-8 neon-glow`}>
              {(() => {
                const Icon = slides[current].icon;
                return <Icon className="w-12 h-12 text-white" />;
              })()}
            </div>
            <h2 className="text-3xl font-bold mb-4">{slides[current].title}</h2>
            <p className="text-muted-foreground text-lg leading-relaxed max-w-xs mx-auto">
              {slides[current].subtitle}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Dots & Button */}
      <div className="relative z-10 w-full space-y-6">
        <div className="flex items-center justify-center gap-2">
          {slides.map((_, i) => (
            <motion.div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === current ? 'w-8 bg-primary' : 'w-1.5 bg-muted-foreground/30'
              }`}
            />
          ))}
        </div>

        <Button
          onClick={handleNext}
          className="w-full h-14 text-lg font-semibold gradient-primary rounded-2xl border-0 neon-glow"
        >
          {current < slides.length - 1 ? (
            <>Далее <ArrowRight className="w-5 h-5 ml-2" /></>
          ) : (
            <>Начать <Sparkles className="w-5 h-5 ml-2" /></>
          )}
        </Button>

        {current === 0 && (
          <button
            onClick={goToRegister}
            className="block w-full text-center text-muted-foreground text-sm"
          >
            Пропустить
          </button>
        )}

        <button
          onClick={() => {
            markOnboardingSeen();
            navigate('/login');
          }}
          className="block w-full text-center text-muted-foreground text-sm"
        >
          Уже есть аккаунт? Войти
        </button>
      </div>
    </div>
  );
}