/* b44-full-sync 2026-06-01 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart } from 'lucide-react';

const PARTICLES = [
  { x: '15%', y: '20%', size: 3, color: 'hsl(270,80%,70%)', delay: 0 },
  { x: '80%', y: '15%', size: 2, color: 'hsl(330,85%,65%)', delay: 0.4 },
  { x: '10%', y: '65%', size: 2, color: 'hsl(330,85%,65%)', delay: 0.8 },
  { x: '88%', y: '55%', size: 3, color: 'hsl(270,80%,70%)', delay: 0.2 },
  { x: '50%', y: '85%', size: 2, color: 'hsl(300,80%,65%)', delay: 0.6 },
  { x: '30%', y: '10%', size: 1.5, color: 'hsl(300,80%,65%)', delay: 1 },
  { x: '70%', y: '78%', size: 2, color: 'hsl(270,80%,70%)', delay: 0.3 },
  { x: '92%', y: '30%', size: 1.5, color: 'hsl(330,85%,65%)', delay: 0.9 },
];

export default function SplashScreen({ onDone }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Show splash for 1.8s, then fade out (0.55s), then call onDone
    const hideTimer = setTimeout(() => setVisible(false), 1800);
    // Fallback: force onDone after 3s no matter what
    const fallbackTimer = setTimeout(onDone, 3000);
    return () => {
      clearTimeout(hideTimer);
      clearTimeout(fallbackTimer);
    };
  }, []);

  return (
    <AnimatePresence onExitComplete={onDone}>
      {visible && (
        <motion.div
          key="splash"
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
          style={{ background: 'hsl(250,15%,5%)' }}
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.55, ease: 'easeInOut' }}
        >
          {/* Static blur blobs — no heavy infinite animations */}
          <div
            className="absolute rounded-full"
            style={{
              width: 500, height: 500,
              background: 'radial-gradient(circle, rgba(168,85,247,0.2) 0%, transparent 70%)',
              top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
            }}
          />
          <div
            className="absolute rounded-full"
            style={{
              width: 300, height: 300,
              background: 'radial-gradient(circle, rgba(236,72,153,0.14) 0%, transparent 70%)',
              bottom: '5%', left: '-5%',
            }}
          />
          <div
            className="absolute rounded-full"
            style={{
              width: 200, height: 200,
              background: 'radial-gradient(circle, rgba(236,72,153,0.14) 0%, transparent 70%)',
              top: '0%', right: '-5%',
            }}
          />

          {/* Static particles */}
          {PARTICLES.map((p, i) => (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                width: p.size, height: p.size,
                background: p.color,
                left: p.x, top: p.y,
                opacity: 0.6,
                boxShadow: `0 0 ${p.size * 4}px ${p.color}`,
              }}
            />
          ))}

          {/* Main content */}
          <motion.div
            className="relative flex flex-col items-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut', delay: 0.1 }}
          >
            {/* Icon */}
            <div className="relative mb-7">
              {/* halo behind the icon */}
              <div
                className="absolute -inset-3 rounded-[36px] blur-xl"
                style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.45), rgba(236,72,153,0.35))', opacity: 0.7 }}
              />

              <motion.div
                className="relative w-28 h-28 rounded-[28px] flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, hsl(270,80%,60%), hsl(330,85%,60%))', boxShadow: '0 0 40px rgba(168,85,247,0.6)' }}
              >
                <Heart className="w-14 h-14 text-white" fill="white" />
              </motion.div>
            </div>

            {/* Title */}
            <motion.h1
              className="text-5xl font-black tracking-tight mb-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              style={{
                background: 'linear-gradient(135deg, #d8b4fe, #f472b6, #c084fc)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              3Minutes
            </motion.h1>

            <motion.p
              className="text-sm text-muted-foreground tracking-wide mb-10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              Знакомства начинаются с настоящего вайба
            </motion.p>

            {/* Loading */}
            <motion.div
              className="flex flex-col items-center gap-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              {/* progress bar */}
              <div className="w-40 h-0.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: 'linear-gradient(90deg, hsl(270,80%,60%), hsl(330,85%,60%))' }}
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 1.6, ease: 'easeOut' }}
                />
              </div>
              <p className="text-xs text-muted-foreground/60 tracking-widest uppercase">
                Загружаем...
              </p>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}