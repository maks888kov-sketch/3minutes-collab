/* b44-full-sync 2026-06-01 */
import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { buildPhotoSlides } from '@/lib/profilePhotoSlides';

const MAX_TAGS = 4;

export default function DiscoverCardCaption({ profile, photoIndex = 0 }) {
  const slides = useMemo(() => (profile ? buildPhotoSlides(profile) : []), [profile]);
  const slide = slides[photoIndex] || slides[0];

  if (!profile || !slide) return null;

  const tags = slide.tags || [];
  const visibleTags = tags.slice(0, MAX_TAGS);
  const hiddenCount = tags.length - visibleTags.length;
  const showName = slide.showName !== false && (photoIndex === 0 || slide.showName);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`${profile.id}-${photoIndex}`}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="discover-card-caption w-full max-w-md shrink-0 px-1"
      >
        {showName && (
          <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <h3 className="text-base font-bold text-foreground">
              {profile.name}
              {profile.age != null && (
                <span className="font-semibold text-muted-foreground">, {profile.age}</span>
              )}
            </h3>
            {profile.is_verified && (
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-[10px] text-white">
                ✓
              </span>
            )}
          </div>
        )}

        {visibleTags.length > 0 && (
          <div className="flex flex-nowrap gap-1.5 overflow-x-auto scrollbar-none">
            {visibleTags.map((tag, i) => (
              <span
                key={`${tag.label}-${i}`}
                className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-foreground"
              >
                <span>{tag.emoji}</span>
                <span>{tag.label}</span>
              </span>
            ))}
            {hiddenCount > 0 && (
              <span className="inline-flex shrink-0 items-center rounded-full bg-secondary/80 px-2 py-1 text-[11px] text-muted-foreground">
                +{hiddenCount}
              </span>
            )}
          </div>
        )}

        {slide.text ? (
          <p className="mt-1.5 text-sm leading-snug text-muted-foreground line-clamp-2">{slide.text}</p>
        ) : slide.hint ? (
          <p className="mt-1 text-xs text-muted-foreground/80">{slide.hint}</p>
        ) : null}
      </motion.div>
    </AnimatePresence>
  );
}
