/* b44-full-sync 2026-06-01 */
import { format, isToday, isYesterday } from 'date-fns';
import { ru } from 'date-fns/locale';

const ONLINE_WINDOW_MS = 5 * 60 * 1000;

export function isProfileOnline(profile) {
  if (!profile) return false;
  if (profile.is_online) return true;
  if (!profile.last_seen) return false;
  return Date.now() - new Date(profile.last_seen).getTime() < ONLINE_WINDOW_MS;
}

export function formatChatTime(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  if (isToday(date)) return format(date, 'HH:mm');
  if (isYesterday(date)) return 'Вчера';
  return format(date, 'd MMM', { locale: ru });
}

export function getOtherProfileId(match, myProfileId) {
  if (!match || !myProfileId) return null;
  return match.profile_a_id === myProfileId ? match.profile_b_id : match.profile_a_id;
}

export function getUnreadCount(match, myProfileId) {
  if (!match || !myProfileId) return 0;
  return match.profile_a_id === myProfileId
    ? match.unread_count_a || 0
    : match.unread_count_b || 0;
}

/** Единый список целей — в profile-setup и в настройках профиля */
export const PROFILE_GOALS = [
  { value: 'relationship', emoji: '❤️', label: 'Отношения', desc: 'Ищу серьёзные отношения' },
  { value: 'friendship', emoji: '🤝', label: 'Дружба', desc: 'Хочу найти друзей' },
  { value: 'networking', emoji: '💼', label: 'Нетворкинг', desc: 'Полезные знакомства' },
  { value: 'chat', emoji: '💬', label: 'Общение', desc: 'Просто пообщаться' },
];

export function getGoalDisplay(goal) {
  return PROFILE_GOALS.find((g) => g.value === goal) || PROFILE_GOALS[3];
}

/** Единый список интересов — в profile-setup, discover и редактировании профиля */
export const PROFILE_INTERESTS = [
  { id: 'music', emoji: '🎵', label: 'Музыка' },
  { id: 'movies', emoji: '🎬', label: 'Кино' },
  { id: 'books', emoji: '📚', label: 'Книги' },
  { id: 'sport', emoji: '🏋️', label: 'Спорт' },
  { id: 'travel', emoji: '✈️', label: 'Путешествия' },
  { id: 'cooking', emoji: '🍳', label: 'Кулинария' },
  { id: 'games', emoji: '🎮', label: 'Игры' },
  { id: 'photo', emoji: '📸', label: 'Фото' },
  { id: 'art', emoji: '🎨', label: 'Искусство' },
  { id: 'tech', emoji: '💻', label: 'Технологии' },
  { id: 'pets', emoji: '🐾', label: 'Животные' },
  { id: 'yoga', emoji: '🧘', label: 'Йога' },
  { id: 'coffee', emoji: '☕', label: 'Кофе' },
  { id: 'theater', emoji: '🎭', label: 'Театр' },
  { id: 'nature', emoji: '🌿', label: 'Природа' },
  { id: 'guitar', emoji: '🎸', label: 'Гитара' },
  { id: 'dance', emoji: '💃', label: 'Танцы' },
  { id: 'running', emoji: '🏃', label: 'Бег' },
  { id: 'karaoke', emoji: '🎤', label: 'Караоке' },
  { id: 'skate', emoji: '🛹', label: 'Скейт' },
];

const LEGACY_INTEREST_ALIASES = {
  Готовка: 'cooking',
  Арт: 'art',
};

export function interestValue(interest) {
  return `${interest.emoji} ${interest.label}`;
}

export const INTEREST_OPTIONS = PROFILE_INTERESTS.map(interestValue);

export function resolveInterestId(tag) {
  if (!tag) return null;
  const byValue = PROFILE_INTERESTS.find((i) => interestValue(i) === tag);
  if (byValue) return byValue.id;
  const byLabel = PROFILE_INTERESTS.find((i) => i.label === tag);
  if (byLabel) return byLabel.id;
  const aliasId = LEGACY_INTEREST_ALIASES[tag];
  if (aliasId) return aliasId;
  const stripped = String(tag).replace(/^[^\s]+\s/, '');
  const byStripped = PROFILE_INTERESTS.find((i) => i.label === stripped);
  return byStripped?.id || null;
}

export function displayInterest(tag) {
  const id = resolveInterestId(tag);
  const interest = PROFILE_INTERESTS.find((i) => i.id === id);
  if (interest) return { emoji: interest.emoji, label: interest.label, value: interestValue(interest) };
  const label = String(tag).replace(/^[^\s]+\s/, '') || tag;
  return { emoji: '✨', label, value: tag };
}

export function sharedInterestsCount(a, b) {
  if (!a?.length || !b?.length) return 0;
  const setB = new Set(b.map(resolveInterestId).filter(Boolean));
  return a.map(resolveInterestId).filter((id) => id && setB.has(id)).length;
}

export function pickBestProfile(profiles) {
  if (!profiles?.length) return null;
  if (profiles.length === 1) return profiles[0];

  return [...profiles].sort((a, b) => {
    const completeA = a.profile_complete ? 1 : 0;
    const completeB = b.profile_complete ? 1 : 0;
    if (completeB !== completeA) return completeB - completeA;

    const photosA = a.photos?.length || 0;
    const photosB = b.photos?.length || 0;
    if (photosB !== photosA) return photosB - photosA;

    const dateA = new Date(a.updated_date || a.created_date || 0).getTime();
    const dateB = new Date(b.updated_date || b.created_date || 0).getTime();
    return dateB - dateA;
  })[0];
}
