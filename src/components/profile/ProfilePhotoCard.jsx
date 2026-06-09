/* b44-full-sync 2026-06-01 */
import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { isProfileOnline } from '@/lib/profileUtils';
import { isTestBotId } from '@/lib/testBots';
import { buildPhotoSlides } from '@/lib/profilePhotoSlides';

const MAX_VISIBLE_TAGS = 3;

export default function ProfilePhotoCard({
  profile,
  photoIndex,
  onPhotoIndexChange,
  enablePhotoNav = true,
  showOnlineBadge = true,
  rounded = true,
  className = '',
  extraBottomPadding = false,
  infoPlacement = 'overlay',
  children,
}) {
  const slides = useMemo(() => buildPhotoSlides(profile), [profile]);
  const slide = slides[photoIndex] || slides[0];
  const online = isProfileOnline(profile);

  const prevPhoto = (e) => {
    e?.stopPropagation?.();
    if (photoIndex > 0) onPhotoIndexChange(photoIndex - 1);
  };

  const nextPhoto = (e) => {
    e?.stopPropagation?.();
    if (photoIndex < slides.length - 1) onPhotoIndexChange(photoIndex + 1);
  };

  const photoOnly = infoPlacement === 'photo-only';
  const showName = !photoOnly && slide?.showName !== false && (photoIndex === 0 || slide?.showName);
  const tags = slide?.tags || [];
  const visibleTags = tags.slice(0, MAX_VISIBLE_TAGS);
  const hiddenTagCount = tags.length - visibleTags.length;
  const bottomPad = extraBottomPadding ? 'pb-[5.5rem]' : photoOnly ? 'pb-3' : 'pb-4';

  return (
    <div
      className={`relative h-full w-full overflow-hidden bg-black ${rounded ? 'rounded-3xl' : ''} ${className}`}
    >
      <AnimatePresence mode="wait">
        <motion.img
          key={slide?.url}
          src={slide?.url}
          alt={profile?.name || ''}
          className="absolute inset-0 h-full w-full object-cover object-[50%_18%]"
          referrerPolicy="no-referrer"
          initial={{ opacity: 0.85, scale: 1.02 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0.85, scale: 1.01 }}
          transition={{ duration: 0.22 }}
          draggable={false}
        />
      </AnimatePresence>

      {!photoOnly && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] h-[18%] bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
      )}

      {slides.length > 1 && (
        <div className="pointer-events-none absolute left-0 right-0 top-3 z-20 flex gap-1 px-3">
          {slides.map((_, i) => (
            <div
              key={i}
              className={`h-[3px] flex-1 rounded-full transition-all duration-200 ${
                i === photoIndex ? 'bg-white' : 'bg-white/35'
              }`}
            />
          ))}
        </div>
      )}

      {enablePhotoNav && slides.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Предыдущее фото"
            onClick={prevPhoto}
            className="absolute left-0 top-0 z-10 h-[78%] w-[38%]"
          />
          <button
            type="button"
            aria-label="Следующее фото"
            onClick={nextPhoto}
            className="absolute right-0 top-0 z-10 h-[78%] w-[38%]"
          />
        </>
      )}

      {showOnlineBadge && (
        <div className="pointer-events-none absolute right-3 top-8 z-20 flex flex-col items-end gap-2">
          {online && (
            <span className="rounded-full bg-black/35 px-2.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-md">
              <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
              Онлайн
            </span>
          )}
          {isTestBotId(profile?.id) && (
            <span className="rounded-full border border-primary/40 bg-black/35 px-2 py-0.5 text-[9px] font-bold text-primary backdrop-blur-md">
              TEST BOT
            </span>
          )}
        </div>
      )}

      {!photoOnly && (
      <div className={`absolute inset-x-0 bottom-0 z-20 px-4 pt-6 ${bottomPad}`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={photoIndex}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
            className="rounded-2xl bg-black/45 px-3 py-2.5 backdrop-blur-md"
          >
            {showName && (
              <div className="mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <h3 className="text-lg font-bold leading-tight text-white">
                  {profile.name}
                  {profile.age != null && (
                    <span className="font-semibold text-white/85">, {profile.age}</span>
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
                    className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-medium text-black/80"
                  >
                    <span className="text-[11px]">{tag.emoji}</span>
                    <span>{tag.label}</span>
                  </span>
                ))}
                {hiddenTagCount > 0 && (
                  <span className="inline-flex shrink-0 items-center rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-medium text-black/65">
                    +{hiddenTagCount}
                  </span>
                )}
              </div>
            )}

            {slide?.text && (
              <p className="mt-1.5 text-xs leading-snug text-white/85 line-clamp-2">
                {slide.text}
              </p>
            )}

            {slide?.hint && !slide?.text && (
              <p className="mt-1 text-[10px] font-medium text-white/55">{slide.hint}</p>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
      )}

      {children}
    </div>
  );
}
