/* b44-full-sync 2026-06-01 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { syncSdkAuthToken } from '@/lib/uploadFile';
import { isTestBotMatchId } from '@/lib/testBots';
import { blockTestBotMatch } from '@/lib/testBotStore';
import {
  addLocalBlock,
  removeLocalBlock,
  buildReportPayload,
  getMergedBlockedIds,
} from '@/lib/moderation';

async function persistBlockedIds(profileId, blockedIds) {
  syncSdkAuthToken();
  try {
    await base44.entities.Profile.update(profileId, {
      blocked_profile_ids: blockedIds,
    });
    return true;
  } catch {
    return false;
  }
}

export function useModerationActions() {
  const queryClient = useQueryClient();

  const invalidateModeration = () => {
    queryClient.invalidateQueries({ queryKey: ['currentProfile'] });
    queryClient.invalidateQueries({ queryKey: ['discover'] });
    queryClient.invalidateQueries({ queryKey: ['chatList'] });
    queryClient.invalidateQueries({ queryKey: ['matches'] });
  };

  const blockUser = useMutation({
    mutationFn: async ({ myProfile, targetProfileId, matchId }) => {
      if (!myProfile?.id || !targetProfileId) {
        throw new Error('missing profile');
      }

      const blockedIds = [...new Set([...getMergedBlockedIds(myProfile), targetProfileId])];
      addLocalBlock(myProfile.id, targetProfileId);
      await persistBlockedIds(myProfile.id, blockedIds);

      if (matchId) {
        if (isTestBotMatchId(matchId)) {
          blockTestBotMatch(matchId);
        } else {
          syncSdkAuthToken();
          await base44.entities.Match.update(matchId, { status: 'blocked' });
        }
      }
    },
    onSuccess: invalidateModeration,
  });

  const unblockUser = useMutation({
    mutationFn: async ({ myProfile, targetProfileId }) => {
      if (!myProfile?.id || !targetProfileId) {
        throw new Error('missing profile');
      }

      const blockedIds = getMergedBlockedIds(myProfile).filter((id) => id !== targetProfileId);
      removeLocalBlock(myProfile.id, targetProfileId);
      await persistBlockedIds(myProfile.id, blockedIds);
    },
    onSuccess: invalidateModeration,
  });

  const submitReport = useMutation({
    mutationFn: async ({
      myProfile,
      otherProfile,
      matchId,
      reasonId,
      details,
      alsoBlock,
    }) => {
      syncSdkAuthToken();
      const payload = buildReportPayload({
        myProfile,
        otherProfile,
        matchId,
        reasonId,
        details,
      });
      await base44.entities.Feedback.create(payload);

      if (alsoBlock) {
        await blockUser.mutateAsync({
          myProfile,
          targetProfileId: otherProfile?.id,
          matchId,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedbacks'] });
      invalidateModeration();
    },
  });

  return { blockUser, unblockUser, submitReport };
}
