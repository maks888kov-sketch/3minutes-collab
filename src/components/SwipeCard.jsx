/* b44-full-sync 2026-06-01 */
import { useState } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import ProfilePhotoCard from '@/components/profile/ProfilePhotoCard';

export default function SwipeCard({
  profile,
  onSwipe,
  isTop,
  photoIndex: controlledPhotoIndex,
  onPhotoIndexChange,
  infoPlacement = 'overlay',
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-12, 12]);
  const likeOpacity = useTransform(x, [0, 100], [0, 1]);
  const nopeOpacity = useTransform(x, [-100, 0], [1, 0]);
  const [internalPhotoIndex, setInternalPhotoIndex] = useState(0);

  const photoIndex = isTop && controlledPhotoIndex !== undefined ? controlledPhotoIndex : internalPhotoIndex;
  const setPhotoIndex = (next) => {
    if (isTop && onPhotoIndexChange) onPhotoIndexChange(next);
    else setInternalPhotoIndex(next);
  };

  const cardGlow = useTransform(x, [-120, 0, 120], [
    '0 0 50px rgba(239,68,68,0.35)',
    '0 16px 48px rgba(0,0,0,0.45)',
    '0 0 50px rgba(34,197,94,0.35)',
  ]);

  const handleDragEnd = (_, info) => {
    if (info.offset.x > 100) {
      animate(x, 500, { duration: 0.3 });
      setTimeout(() => onSwipe('right'), 300);
    } else if (info.offset.x < -100) {
      animate(x, -500, { duration: 0.3 });
      setTimeout(() => onSwipe('left'), 300);
    } else {
      animate(x, 0, { type: 'spring', stiffness: 500, damping: 40 });
    }
  };

  return (
    <motion.div
      style={{ x, rotate, zIndex: isTop ? 10 : 0 }}
      drag={isTop ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.15}
      onDragEnd={handleDragEnd}
      className="absolute inset-0 cursor-grab touch-none active:cursor-grabbing"
    >
      <motion.div style={{ boxShadow: cardGlow }} className="h-full w-full">
        <ProfilePhotoCard
          profile={profile}
          photoIndex={photoIndex}
          onPhotoIndexChange={setPhotoIndex}
          enablePhotoNav={isTop}
          infoPlacement={infoPlacement}
          extraBottomPadding={infoPlacement !== 'photo-only'}
        >
          <motion.div
            style={{ opacity: likeOpacity }}
            className="pointer-events-none absolute left-5 top-20 z-30 -rotate-12 rounded-2xl border-4 border-green-400 px-4 py-2"
          >
            <span className="text-3xl font-black tracking-wider text-green-400">LIKE</span>
          </motion.div>
          <motion.div
            style={{ opacity: nopeOpacity }}
            className="pointer-events-none absolute right-5 top-20 z-30 rotate-12 rounded-2xl border-4 border-red-400 px-4 py-2"
          >
            <span className="text-3xl font-black tracking-wider text-red-400">NOPE</span>
          </motion.div>
        </ProfilePhotoCard>
      </motion.div>
    </motion.div>
  );
}
