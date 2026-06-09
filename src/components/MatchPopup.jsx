/* b44-full-sync 2026-06-01 */
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Heart, MessageCircle, Sparkles } from 'lucide-react';

export default function MatchPopup({ match, otherProfile, myProfile, onClose }) {
  const navigate = useNavigate();

  const myPhoto = myProfile?.photos?.[0] || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop';
  const theirPhoto = otherProfile?.photos?.[0] || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-xl" />

      {/* Confetti-like particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 20 }).map((_, i) => (
          <motion.div
            key={i}
            initial={{
              x: Math.random() * 400,
              y: -20,
              opacity: 1,
              scale: Math.random() * 0.5 + 0.5,
            }}
            animate={{
              y: 800,
              opacity: 0,
              rotate: Math.random() * 720,
            }}
            transition={{
              duration: Math.random() * 2 + 2,
              delay: Math.random() * 0.5,
              ease: 'easeOut',
            }}
            className="absolute w-3 h-3 rounded-full"
            style={{
              background: `hsl(${Math.random() * 60 + 270}, 80%, 60%)`,
              left: `${Math.random() * 100}%`,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="relative z-10 text-center px-8"
      >
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="mb-6"
        >
          <Sparkles className="w-12 h-12 text-primary mx-auto" />
        </motion.div>

        <h1 className="text-4xl font-black gradient-text mb-2">It's a Match!</h1>
        <p className="text-muted-foreground text-lg mb-8">
          Вы понравились друг другу
        </p>

        {/* Profile photos */}
        <div className="flex items-center justify-center gap-6 mb-10">
          <motion.div
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="relative"
          >
            <div className="w-28 h-28 rounded-full overflow-hidden border-3 border-primary neon-glow">
              <img src={myPhoto} alt="" className="w-full h-full object-cover" />
            </div>
          </motion.div>

          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5, type: 'spring' }}
          >
            <Heart className="w-10 h-10 text-accent" fill="hsl(330, 85%, 60%)" />
          </motion.div>

          <motion.div
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="relative"
          >
            <div className="w-28 h-28 rounded-full overflow-hidden border-3 border-accent neon-glow-pink">
              <img src={theirPhoto} alt="" className="w-full h-full object-cover" />
            </div>
          </motion.div>
        </div>

        <div className="space-y-3">
          <Button
            onClick={() => { onClose(); navigate(`/chat/${match.id}`); }}
            className="w-full h-14 text-lg font-semibold gradient-primary rounded-2xl border-0 neon-glow"
          >
            <MessageCircle className="w-5 h-5 mr-2" />
            Написать
          </Button>
          <Button
            variant="ghost"
            onClick={onClose}
            className="w-full h-12 text-muted-foreground"
          >
            Продолжить листать
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}