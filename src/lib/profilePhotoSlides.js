/* b44-full-sync 2026-06-01 */
import { displayInterest, getGoalDisplay } from '@/lib/profileUtils';

const FALLBACK_PHOTO = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&h=900&fit=crop';

/**
 * Слайды анкеты: на каждом фото — свой набор тегов и текста.
 * Если в профиле есть photo_slides — используем их, иначе собираем автоматически.
 */
export function getProfilePhotos(profile) {
  if (profile?.photos?.length > 0) return profile.photos;
  return [FALLBACK_PHOTO];
}

function normalizeTag(tag) {
  if (!tag) return null;
  if (typeof tag === 'string') {
    const { emoji, label } = displayInterest(tag);
    return { emoji, label };
  }
  return {
    emoji: tag.emoji || '✨',
    label: tag.label || tag.text || '',
  };
}

function buildAutoSlides(profile, photos) {
  const goal = getGoalDisplay(profile.goal);
  const interests = (profile.interests || []).map((tag) => normalizeTag(tag)).filter((t) => t?.label);
  const count = photos.length;

  return photos.map((url, index) => {
    const isLast = index === count - 1;
    const bioShort = profile.bio
      ? `${profile.bio.slice(0, 48)}${profile.bio.length > 48 ? '…' : ''}`
      : '';

    /* Фото 1: лицо не закрываем — только имя + цель + город */
    if (index === 0) {
      return {
        url,
        showName: true,
        tags: [
          { emoji: goal.emoji, label: goal.label },
          profile.city ? { emoji: '📍', label: profile.city } : null,
        ].filter(Boolean),
        text: count > 1 ? '' : bioShort,
        hint: count > 1 ? 'Листай фото →' : '',
      };
    }

    const interestStart = (index - 1) * 3;
    const chunk = interests.slice(interestStart, interestStart + 3);
    const extraTags = [];

    if (isLast && profile.height_cm) {
      extraTags.push({ emoji: '📏', label: `${profile.height_cm} см` });
    }

    /* Следующие фото: интересы; био только на последнем */
    return {
      url,
      showName: false,
      tags: [...chunk, ...extraTags],
      text: isLast ? bioShort : '',
      hint: '',
    };
  });
}

export function buildPhotoSlides(profile) {
  const photos = getProfilePhotos(profile);

  if (Array.isArray(profile?.photo_slides) && profile.photo_slides.length > 0) {
    return photos.map((url, index) => {
      const custom = profile.photo_slides[index] || profile.photo_slides[profile.photo_slides.length - 1];
      return {
        url,
        showName: custom.showName ?? index === 0,
        tags: (custom.tags || []).map(normalizeTag).filter((t) => t?.label),
        text: custom.text || '',
        hint: custom.hint || (index === 0 && photos.length > 1 ? 'Листай фото →' : ''),
      };
    });
  }

  return buildAutoSlides(profile, photos);
}

export function getPhotoCount(profile) {
  return getProfilePhotos(profile).length;
}
