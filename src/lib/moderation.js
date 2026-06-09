/* b44-full-sync 2026-06-01 */
/** Жалобы и блокировки — защита от спама и рекламы */

export const REPORT_REASONS = [
  {
    id: 'spam',
    label: 'Спам и реклама',
    description: 'Ссылки, реклама услуг, массовая рассылка',
  },
  {
    id: 'harassment',
    label: 'Оскорбления',
    description: 'Угрозы, грубость, домогательства',
  },
  {
    id: 'fake',
    label: 'Фейковый профиль',
    description: 'Чужие фото, обман, выдаёт себя за другого',
  },
  {
    id: 'other',
    label: 'Другое',
    description: 'Любая другая причина',
  },
];

const LOCAL_BLOCKS_KEY = '3minutes_blocked_v1';

function readLocalBlocks() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_BLOCKS_KEY) || '{}');
  } catch {
    return {};
  }
}

function writeLocalBlocks(data) {
  localStorage.setItem(LOCAL_BLOCKS_KEY, JSON.stringify(data));
}

export function getLocalBlockedIds(profileId) {
  if (!profileId) return [];
  return readLocalBlocks()[profileId] || [];
}

export function addLocalBlock(profileId, targetId) {
  if (!profileId || !targetId) return;
  const all = readLocalBlocks();
  const set = new Set(all[profileId] || []);
  set.add(targetId);
  all[profileId] = [...set];
  writeLocalBlocks(all);
}

export function removeLocalBlock(profileId, targetId) {
  if (!profileId || !targetId) return;
  const all = readLocalBlocks();
  all[profileId] = (all[profileId] || []).filter((id) => id !== targetId);
  writeLocalBlocks(all);
}

export function getMergedBlockedIds(profile) {
  if (!profile?.id) return [];
  const fromProfile = Array.isArray(profile.blocked_profile_ids)
    ? profile.blocked_profile_ids
    : [];
  const fromLocal = getLocalBlockedIds(profile.id);
  return [...new Set([...fromProfile, ...fromLocal])];
}

export function isProfileBlocked(profile, targetId) {
  if (!targetId) return false;
  return getMergedBlockedIds(profile).includes(targetId);
}

export function getReportReasonLabel(reasonId) {
  return REPORT_REASONS.find((r) => r.id === reasonId)?.label || reasonId;
}

export function buildReportPayload({
  myProfile,
  otherProfile,
  matchId,
  reasonId,
  details = '',
}) {
  const reasonLabel = getReportReasonLabel(reasonId);
  const reportedName = otherProfile?.name || 'Пользователь';
  const reporterName = myProfile?.name || 'Пользователь';

  return {
    title: `[Жалоба: ${reasonLabel}] ${reportedName}`,
    description: [
      `Жалоба от: ${reporterName} (${myProfile?.id || '—'})`,
      `На пользователя: ${reportedName} (${otherProfile?.id || '—'})`,
      `Матч: ${matchId || '—'}`,
      `Причина: ${reasonLabel}`,
      details.trim() ? `\nКомментарий:\n${details.trim()}` : '',
    ].join('\n'),
    category: 'other',
    author_name: reporterName,
    votes: 0,
    voter_ids: [],
  };
}
