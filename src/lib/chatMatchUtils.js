/* b44-full-sync 2026-06-01 */
import { isTestBotMatchId } from '@/lib/testBots';

export function isTestMatch(matchOrId) {
  const id = typeof matchOrId === 'string' ? matchOrId : matchOrId?.id;
  return isTestBotMatchId(id);
}

/** Первое видео-знакомство — 3 минуты */
export const INTRO_VIDEO_DURATION_SEC = 180;

/** Фото и голосовые — только после видео-встречи, если оба выбрали «продолжить» */
export function isMediaUnlocked(match) {
  if (!match) return false;
  if (match.status === 'video_unlocked') return true;
  return match.video_result_a === 'continue' && match.video_result_b === 'continue';
}

/** Повторные видеозвонки без лимита — после взаимного «продолжить общение» */
export function isUnlimitedVideoCall(match) {
  return isMediaUnlocked(match);
}

export function getVideoConsent(match, profileId) {
  if (!match || !profileId) return false;
  return match.profile_a_id === profileId ? !!match.video_consent_a : !!match.video_consent_b;
}

export function isVideoReady(match) {
  return !!(match?.video_consent_a && match?.video_consent_b);
}
