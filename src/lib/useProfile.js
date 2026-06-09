/* b44-full-sync 2026-06-01 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { syncSdkAuthToken } from '@/lib/uploadFile';
import { getOtherProfileId, isProfileOnline, sharedInterestsCount, pickBestProfile } from '@/lib/profileUtils';
import { getSearchFilters, profileMatchesFilters } from '@/lib/discoverFilters';
import { getMergedBlockedIds } from '@/lib/moderation';
import { isTestBotsEnabled, TEST_BOT_PROFILES, isTestBotId, getTestBotProfile } from '@/lib/testBots';
import {
  getAvailableTestBots,
  getTestBotMatches,
  getTestBotMessages,
  isTestBotMatchId,
} from '@/lib/testBotStore';
import { blockChatAndHide, hideChat } from '@/lib/chatActions';

export function useCurrentProfile() {
  return useQuery({
    queryKey: ['currentProfile'],
    queryFn: async () => {
      syncSdkAuthToken();
      const user = await base44.auth.me();
      const profiles = await base44.entities.Profile.filter({ created_by: user.email });
      return pickBestProfile(profiles);
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }) => {
      syncSdkAuthToken();
      const payload = {
        ...data,
        is_online: data.is_online ?? true,
        last_seen: data.last_seen ?? new Date().toISOString(),
      };

      if (id) {
        return base44.entities.Profile.update(id, payload);
      }

      if (!payload.name?.trim()) {
        throw new Error('Укажите имя');
      }

      return base44.entities.Profile.create({
        gender: 'male',
        looking_for: 'everyone',
        goal: 'relationship',
        interests: [],
        photos: [],
        profile_complete: false,
        ...payload,
        name: payload.name.trim(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentProfile'] });
      queryClient.invalidateQueries({ queryKey: ['discover'] });
    },
  });
}

export function useDiscoverProfiles(currentProfile) {
  const filters = getSearchFilters(currentProfile);

  return useQuery({
    queryKey: [
      'discover',
      currentProfile?.id,
      filters.min_age_filter,
      filters.max_age_filter,
      filters.city_filter,
      filters.looking_for,
      isTestBotsEnabled() ? 'bots' : 'live',
    ],
    queryFn: async () => {
      if (!currentProfile) return { profiles: [], poolSize: 0 };

      const blockedIds = getMergedBlockedIds(currentProfile);
      const testBots = isTestBotsEnabled()
        ? getAvailableTestBots(currentProfile.id, filters, blockedIds)
        : [];

      try {
        const allProfiles = await base44.entities.Profile.filter({ profile_complete: true });
        const myLikes = await base44.entities.Like.filter({ from_profile_id: currentProfile.id });
        const likedIds = new Set(myLikes.map((l) => l.to_profile_id));

        const blockedSet = new Set(blockedIds);

        const pool = allProfiles.filter((p) => {
          if (p.id === currentProfile.id) return false;
          if (blockedSet.has(p.id)) return false;
          if (likedIds.has(p.id)) return false;
          return true;
        });

        const profiles = pool
          .filter((p) => profileMatchesFilters(p, filters))
          .sort((a, b) => {
            const scoreB = sharedInterestsCount(currentProfile.interests, b.interests);
            const scoreA = sharedInterestsCount(currentProfile.interests, a.interests);
            if (scoreB !== scoreA) return scoreB - scoreA;
            return (isProfileOnline(b) ? 1 : 0) - (isProfileOnline(a) ? 1 : 0);
          });

        return {
          profiles: [...profiles, ...testBots],
          poolSize: pool.length + (isTestBotsEnabled() ? TEST_BOT_PROFILES.length : 0),
        };
      } catch {
        return {
          profiles: testBots,
          poolSize: testBots.length,
        };
      }
    },
    enabled: !!currentProfile?.id,
  });
}

export function useMatches(profileId, blockedIds = []) {
  const blockedSet = new Set(blockedIds);

  return useQuery({
    queryKey: ['matches', profileId, blockedIds.join(',')],
    queryFn: async () => {
      if (!profileId) return [];
      const matchesA = await base44.entities.Match.filter({ profile_a_id: profileId });
      const matchesB = await base44.entities.Match.filter({ profile_b_id: profileId });
      const isActiveMatch = (m) => m.status !== 'ended' && m.status !== 'blocked';

      const real = [...matchesA, ...matchesB].filter((m) => {
        const otherId = getOtherProfileId(m, profileId);
        return isActiveMatch(m) && !blockedSet.has(otherId);
      });
      const test = profileId ? getTestBotMatches(profileId).filter((m) => {
        const otherId = getOtherProfileId(m, profileId);
        return !blockedSet.has(otherId);
      }) : [];
      return [...test, ...real].sort(
        (a, b) =>
          new Date(b.last_message_time || b.created_date) -
          new Date(a.last_message_time || a.created_date)
      );
    },
    enabled: !!profileId,
  });
}

export function useMessages(matchId) {
  const isTest = isTestBotMatchId(matchId);

  return useQuery({
    queryKey: ['messages', matchId],
    queryFn: async () => {
      if (!matchId) return [];
      if (isTestBotMatchId(matchId)) {
        return getTestBotMessages(matchId);
      }
      return base44.entities.Message.filter({ match_id: matchId }, 'created_date', 100);
    },
    enabled: !!matchId,
    refetchInterval: isTest ? 1000 : 1500,
  });
}

export function useOnlineCount() {
  return useQuery({
    queryKey: ['onlineCount'],
    queryFn: async () => {
      const profiles = await base44.entities.Profile.filter({ profile_complete: true });
      return profiles.filter((p) => isProfileOnline(p)).length;
    },
    refetchInterval: 60_000,
  });
}

export function useChatList(profileId, blockedIds = []) {
  const blockedSet = new Set(blockedIds);

  return useQuery({
    queryKey: ['chatList', profileId, blockedIds.join(',')],
    queryFn: async () => {
      if (!profileId) return [];

      const matchesA = await base44.entities.Match.filter({ profile_a_id: profileId });
      const matchesB = await base44.entities.Match.filter({ profile_b_id: profileId });
      const test = profileId ? getTestBotMatches(profileId) : [];
      const isActiveMatch = (m) => m.status !== 'ended' && m.status !== 'blocked';

      const matches = [...test, ...matchesA, ...matchesB]
        .filter((m) => {
          const otherId = getOtherProfileId(m, profileId);
          return isActiveMatch(m) && !blockedSet.has(otherId);
        })
        .sort(
          (a, b) =>
            new Date(b.last_message_time || b.created_date) -
            new Date(a.last_message_time || a.created_date)
        );

      if (!matches.length) return [];

      const otherIds = [...new Set(matches.map((m) => getOtherProfileId(m, profileId)).filter(Boolean))];
      const profilePairs = await Promise.all(
        otherIds.map(async (id) => {
          if (isTestBotId(id)) {
            return [id, getTestBotProfile(id)];
          }
          return base44.entities.Profile.filter({ id }).then((ps) => [id, ps[0]]);
        })
      );
      const profileMap = Object.fromEntries(profilePairs.filter(([, p]) => p));

      return matches.map((match) => {
        const otherId = getOtherProfileId(match, profileId);
        const other = profileMap[otherId] || {
          id: otherId,
          name: 'Пользователь',
          age: '',
          photos: [],
        };
        const unread =
          match.profile_a_id === profileId ? match.unread_count_a || 0 : match.unread_count_b || 0;

        return {
          match,
          other,
          unread,
          lastMessage: match.last_message_text || 'Начните общение',
          lastTime: match.last_message_time || match.created_date,
        };
      });
    },
    enabled: !!profileId,
    refetchInterval: 5000,
  });
}

export function useLikedMe(profileId) {
  return useQuery({
    queryKey: ['likedMe', profileId],
    queryFn: async () => {
      if (!profileId) return [];
      return base44.entities.Like.filter({ to_profile_id: profileId, is_like: true });
    },
    enabled: !!profileId,
  });
}

export function useLikedMeProfiles(profileId) {
  const { data: likes = [] } = useLikedMe(profileId);

  return useQuery({
    queryKey: ['likedMeProfiles', profileId, likes.map((l) => l.from_profile_id).join(',')],
    queryFn: async () => {
      if (!likes.length) return [];
      const ids = [...new Set(likes.map((l) => l.from_profile_id))];
      const profiles = await Promise.all(
        ids.map((id) => base44.entities.Profile.filter({ id }).then((ps) => ps[0]))
      );
      return profiles.filter(Boolean);
    },
    enabled: !!profileId && likes.length > 0,
  });
}

export function useHideChat(profileId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ match, block = false }) => {
      if (block) {
        await blockChatAndHide(profileId, match);
      } else {
        await hideChat(profileId, match);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatList'] });
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      queryClient.invalidateQueries({ queryKey: ['discover'] });
    },
  });
}