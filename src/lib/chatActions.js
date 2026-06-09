/* b44-full-sync 2026-06-01 */
import { base44 } from '@/api/base44Client';
import { addLocalBlock } from '@/lib/moderation';
import { isTestBotMatchId } from '@/lib/testBots';
import { removeTestBotMatch } from '@/lib/testBotStore';
import { getOtherProfileId } from '@/lib/profileUtils';

export async function hideChat(profileId, match) {
  if (!profileId || !match?.id) return;

  if (isTestBotMatchId(match.id)) {
    removeTestBotMatch(profileId, match.id);
    return;
  }

  await base44.entities.Match.update(match.id, {
    status: 'ended',
    last_message_text: '',
  });
}

export async function blockChatAndHide(profileId, match) {
  if (!profileId || !match?.id) return;

  const otherId = getOtherProfileId(match, profileId);
  if (otherId) {
    addLocalBlock(profileId, otherId);
  }

  await hideChat(profileId, match);
}
