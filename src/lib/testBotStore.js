/* b44-full-sync 2026-06-01 */
import {
  TEST_BOT_PROFILES,
  buildTestMatchId,
  getTestBotProfile,
  isTestBotId,
  isTestBotMatchId,
  pickBotReply,
} from '@/lib/testBots';
import { profileMatchesFilters } from '@/lib/discoverFilters';

const STORAGE_KEY = '3minutes_test_bots_v1';

function readAll() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function writeAll(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function getState(profileId) {
  if (!profileId) return { passed: [], matches: [], messages: {} };
  const all = readAll();
  return all[profileId] || { passed: [], matches: [], messages: {} };
}

function saveState(profileId, state) {
  const all = readAll();
  all[profileId] = state;
  writeAll(all);
}

export function resetTestBotState(profileId) {
  if (!profileId) return;
  const all = readAll();
  delete all[profileId];
  writeAll(all);
}

/** Убрать тест-чат из списка (как «удалить переписку») */
export function removeTestBotMatch(profileId, matchId) {
  if (!profileId || !matchId) return;
  const state = getState(profileId);
  state.matches = (state.matches || []).filter((m) => m.id !== matchId);
  if (state.messages?.[matchId]) {
    const next = { ...state.messages };
    delete next[matchId];
    state.messages = next;
  }
  saveState(profileId, state);
}

export function getAvailableTestBots(profileId, filters, blockedIds = []) {
  const state = getState(profileId);
  const passed = new Set(state.passed || []);
  const blocked = new Set(blockedIds);

  return TEST_BOT_PROFILES.filter((bot) => {
    if (blocked.has(bot.id)) return false;
    if (passed.has(bot.id)) return false;
    return profileMatchesFilters(bot, filters);
  });
}

export function recordTestBotSwipe(profileId, botId, direction, { superLike = false } = {}) {
  const bot = getTestBotProfile(botId);
  if (!bot || !profileId) return { matched: false, match: null };

  const state = getState(profileId);
  const passed = new Set(state.passed || []);
  passed.add(botId);

  const isLike = direction === 'right' || direction === 'super' || superLike;
  let match = null;
  let matched = false;

  if (isLike && (bot.willMatchBack || superLike)) {
    const matchId = buildTestMatchId(botId);
    const existing = (state.matches || []).find((m) => m.id === matchId);
    if (!existing) {
      const now = new Date().toISOString();
      match = {
        id: matchId,
        profile_a_id: profileId,
        profile_b_id: botId,
        status: 'active',
        created_date: now,
        last_message_time: now,
        last_message_text: `${bot.name} тоже лайкнула тебя! Напиши первым 👋`,
        unread_count_a: 0,
        unread_count_b: 0,
        video_consent_a: false,
        video_consent_b: false,
        video_result_a: 'pending',
        video_result_b: 'pending',
        is_test_bot: true,
      };
      state.matches = [...(state.matches || []), match];
      state.messages = {
        ...(state.messages || {}),
        [matchId]: [
          {
            id: `${matchId}-welcome`,
            match_id: matchId,
            sender_profile_id: botId,
            type: 'text',
            content: `Привет! Я ${bot.name}, рада знакомству 😊`,
            created_date: now,
          },
        ],
      };
      matched = true;
    } else {
      match = existing;
      matched = true;
    }
  }

  state.passed = [...passed];
  saveState(profileId, state);

  return { matched, match, bot };
}

function findMatchContext(matchId) {
  if (!matchId) return null;
  const all = readAll();
  for (const profileId of Object.keys(all)) {
    const state = all[profileId];
    const match = (state.matches || []).find((m) => m.id === matchId);
    if (match) {
      return { profileId, state, match: normalizeTestBotMatch(match) };
    }
  }
  return null;
}

function normalizeTestBotMatch(match) {
  if (!match) return match;
  return {
    video_consent_a: false,
    video_consent_b: false,
    video_result_a: 'pending',
    video_result_b: 'pending',
    ...match,
  };
}

export function getTestBotMatches(profileId) {
  if (!profileId) return [];
  const all = readAll();
  const byId = new Map();

  for (const key of Object.keys(all)) {
    for (const match of all[key].matches || []) {
      if (
        match.profile_a_id === profileId
        || match.profile_b_id === profileId
        || key === profileId
      ) {
        byId.set(match.id, normalizeTestBotMatch(match));
      }
    }
  }

  return [...byId.values()].sort(
    (a, b) => new Date(b.last_message_time || b.created_date) - new Date(a.last_message_time || a.created_date)
  );
}

export function getTestBotMatch(matchId) {
  if (!isTestBotMatchId(matchId)) return null;
  return findMatchContext(matchId)?.match || null;
}

export function getTestBotOwnerId(matchId) {
  if (!isTestBotMatchId(matchId)) return null;
  const all = readAll();
  for (const profileId of Object.keys(all)) {
    if ((all[profileId].matches || []).some((m) => m.id === matchId)) return profileId;
  }
  return null;
}

function patchTestBotMatch(profileId, matchId, patch) {
  const state = getState(profileId);
  const match = (state.matches || []).find((m) => m.id === matchId);
  if (!match) return null;
  const updated = { ...match, ...patch };
  state.matches = (state.matches || []).map((m) => (m.id === matchId ? updated : m));
  saveState(profileId, state);
  return updated;
}

export function blockTestBotMatch(matchId) {
  const ctx = findMatchContext(matchId);
  if (!ctx) return null;
  return patchTestBotMatch(ctx.profileId, matchId, { status: 'blocked' });
}

export function setTestBotVideoConsent(matchId) {
  const ctx = findMatchContext(matchId);
  if (!ctx) return null;
  return patchTestBotMatch(ctx.profileId, matchId, {
    video_consent_a: true,
    video_consent_b: true,
  });
}

export function completeTestBotVideoCall(matchId, myProfileId, result) {
  const ctx = findMatchContext(matchId);
  if (!ctx) return null;

  const { profileId, match } = ctx;
  const isA = match.profile_a_id === myProfileId;
  const patch = {
    [isA ? 'video_result_a' : 'video_result_b']: result,
  };

  if (result === 'continue') {
    patch[isA ? 'video_result_b' : 'video_result_a'] = 'continue';
    patch.status = 'video_unlocked';
  } else {
    patch.status = 'ended';
  }

  const updated = patchTestBotMatch(profileId, matchId, patch);
  if (updated && result === 'continue') {
    appendTestBotSystemMessage(profileId, matchId, '🎉 Вам понравилось общение! Фото, голосовые и безлимитные видеозвонки разблокированы');
  }
  return updated;
}

function appendTestBotSystemMessage(profileId, matchId, content) {
  const state = getState(profileId);
  const now = new Date().toISOString();
  const message = {
    id: `${matchId}-sys-${Date.now()}`,
    match_id: matchId,
    sender_profile_id: 'system',
    type: 'system',
    content,
    created_date: now,
  };
  state.messages = {
    ...(state.messages || {}),
    [matchId]: [...(state.messages?.[matchId] || []), message],
  };
  saveState(profileId, state);
}

export function sendTestBotMediaMessage(matchId, senderProfileId, type, content) {
  if (!matchId || !content) return null;

  const ctx = findMatchContext(matchId);
  if (!ctx) return null;

  const { profileId, state, match } = ctx;
  const now = new Date().toISOString();
  const message = {
    id: `${matchId}-${type}-${Date.now()}`,
    match_id: matchId,
    sender_profile_id: senderProfileId,
    type,
    content,
    created_date: now,
  };

  state.messages = {
    ...(state.messages || {}),
    [matchId]: [...(state.messages?.[matchId] || []), message],
  };

  const updatedMatch = { ...match };
  const isSenderA = updatedMatch.profile_a_id === senderProfileId;
  updatedMatch.last_message_text = type === 'photo' ? '📷 Фото' : '🎤 Голосовое';
  updatedMatch.last_message_time = now;
  if (isSenderA) {
    updatedMatch.unread_count_b = (updatedMatch.unread_count_b || 0) + 1;
  } else {
    updatedMatch.unread_count_a = (updatedMatch.unread_count_a || 0) + 1;
  }

  state.matches = (state.matches || []).map((m) => (m.id === matchId ? updatedMatch : m));
  saveState(profileId, state);
  return message;
}

export function getTestBotMessages(matchId) {
  if (!isTestBotMatchId(matchId)) return [];
  const all = readAll();
  for (const profileId of Object.keys(all)) {
    const msgs = all[profileId].messages?.[matchId];
    if (msgs) {
      return [...msgs].sort(
        (a, b) => new Date(a.created_date).getTime() - new Date(b.created_date).getTime()
      );
    }
  }
  return [];
}

export function sendTestBotMessage(matchId, senderProfileId, content) {
  if (!matchId || !content?.trim()) return null;

  const ctx = findMatchContext(matchId);
  if (!ctx) return null;

  const { profileId, state, match } = ctx;
  const now = new Date().toISOString();
  const message = {
    id: `${matchId}-${Date.now()}`,
    match_id: matchId,
    sender_profile_id: senderProfileId,
    type: 'text',
    content: content.trim(),
    created_date: now,
  };

  const thread = [...(state.messages?.[matchId] || []), message];
  state.messages = { ...(state.messages || {}), [matchId]: thread };

  const updatedMatch = { ...match };
  const isSenderA = updatedMatch.profile_a_id === senderProfileId;
  updatedMatch.last_message_text = message.content;
  updatedMatch.last_message_time = now;
  if (isSenderA) {
    updatedMatch.unread_count_b = (updatedMatch.unread_count_b || 0) + 1;
  } else {
    updatedMatch.unread_count_a = (updatedMatch.unread_count_a || 0) + 1;
  }

  state.matches = (state.matches || []).map((m) => (m.id === matchId ? updatedMatch : m));
  saveState(profileId, state);

  return message;
}

export function addTestBotAutoReply(matchId, botId) {
  const ctx = findMatchContext(matchId);
  if (!ctx) return null;

  const { profileId, state, match } = ctx;
  const reply = pickBotReply();
  const now = new Date().toISOString();
  const message = {
    id: `${matchId}-bot-${Date.now()}`,
    match_id: matchId,
    sender_profile_id: botId,
    type: 'text',
    content: reply,
    created_date: now,
  };

  const thread = [...(state.messages?.[matchId] || []), message];
  state.messages = { ...(state.messages || {}), [matchId]: thread };

  const updatedMatch = {
    ...match,
    last_message_text: message.content,
    last_message_time: now,
    unread_count_a: (match.unread_count_a || 0) + 1,
  };
  state.matches = (state.matches || []).map((m) => (m.id === matchId ? updatedMatch : m));
  saveState(profileId, state);

  return message;
}

export function markTestBotMatchRead(matchId, myProfileId) {
  const ctx = findMatchContext(matchId);
  if (!ctx) return;

  const { profileId, state, match } = ctx;
  const isA = match.profile_a_id === myProfileId;
  const updatedMatch = {
    ...match,
    unread_count_a: isA ? 0 : match.unread_count_a,
    unread_count_b: isA ? match.unread_count_b : 0,
  };
  state.matches = (state.matches || []).map((m) => (m.id === matchId ? updatedMatch : m));
  saveState(profileId, state);
}

export function resolveTestBotOtherProfile(match, myProfileId) {
  if (!match) return null;
  const otherId = match.profile_a_id === myProfileId ? match.profile_b_id : match.profile_a_id;
  return getTestBotProfile(otherId);
}

export { isTestBotId, isTestBotMatchId };
