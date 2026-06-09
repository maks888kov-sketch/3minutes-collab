/* b44-full-sync 2026-06-01 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MessageCircle, Search, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCurrentProfile, useChatList, useMatches, useHideChat } from '@/lib/useProfile';
import { getMergedBlockedIds } from '@/lib/moderation';
import ChatListItem from '@/components/chat/ChatListItem';
import { showNotification } from '@/components/AppNotifications';

export default function Chats() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const { data: profile } = useCurrentProfile();
  const blockedIds = getMergedBlockedIds(profile);
  const { data: chats = [], isLoading, isError, refetch } = useChatList(profile?.id, blockedIds);
  const { data: matches = [] } = useMatches(profile?.id, blockedIds);
  const hideChatMutation = useHideChat(profile?.id);

  const filtered = chats.filter(({ other, match }) => {
    if (!match?.id) return false;
    if (!search.trim()) return true;
    return other?.name?.toLowerCase().includes(search.toLowerCase());
  });

  const handleDelete = async (match) => {
    try {
      await hideChatMutation.mutateAsync({ match, block: false });
      showNotification({
        type: 'info',
        title: 'Чат удалён',
        body: 'Переписка убрана из списка',
      });
    } catch {
      showNotification({
        type: 'error',
        title: 'Не удалось удалить',
        body: 'Попробуйте ещё раз',
      });
    }
  };

  const handleBlock = async (match) => {
    try {
      await hideChatMutation.mutateAsync({ match, block: true });
      showNotification({
        type: 'info',
        title: 'Заблокировано',
        body: 'Чат удалён, этот человек больше не появится',
      });
    } catch {
      showNotification({
        type: 'error',
        title: 'Ошибка',
        body: 'Не удалось заблокировать',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center pb-28">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto pb-28 safe-top">
      <div className="px-5 pt-5 pb-3">
        <h1 className="text-2xl font-bold">Чаты</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Зажмите чат — удалить или заблокировать</p>
      </div>

      <div className="mb-4 px-5">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по имени..."
            className="h-11 w-full rounded-xl border-0 bg-secondary pl-10 pr-4 text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="px-8 py-16 text-center">
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="relative mx-auto mb-6 h-24 w-24"
          >
            <div
              className="absolute inset-0 rounded-full opacity-40 blur-2xl"
              style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.8), transparent 70%)' }}
            />
            <div
              className="relative flex h-24 w-24 items-center justify-center rounded-full"
              style={{ background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.25)' }}
            >
              <MessageCircle className="h-12 w-12 text-primary" />
            </div>
          </motion.div>
          <h3 className="mb-2 text-xl font-bold">
            {search.trim() ? 'Никого не найдено' : 'Пока нет чатов'}
          </h3>
          <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
            {search.trim()
              ? 'Попробуйте другое имя'
              : matches.length > 0
                ? `У вас ${matches.length} ${matches.length === 1 ? 'пара' : 'пары'} — откройте переписку из раздела «Пары»`
                : 'Поставьте лайк — при взаимной симпатии здесь появится переписка'}
          </p>
          {isError && (
            <p className="mb-4 text-sm text-destructive">Не удалось загрузить чаты. Проверьте интернет.</p>
          )}
          {!search.trim() && (
            <div className="flex flex-col items-center gap-2">
              {matches.length > 0 ? (
                <Button
                  onClick={() => navigate('/matches')}
                  className="gradient-primary rounded-xl border-0 neon-glow"
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Открыть пары
                </Button>
              ) : (
                <Button
                  onClick={() => navigate('/discover')}
                  className="gradient-primary rounded-xl border-0 neon-glow"
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Искать людей
                </Button>
              )}
              <button
                type="button"
                onClick={() => refetch()}
                className="text-xs text-muted-foreground underline hover:text-foreground"
              >
                Обновить список
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-0.5 px-3">
          {filtered.map((chat, i) => (
            <ChatListItem
              key={chat.match.id}
              index={i}
              match={chat.match}
              other={chat.other}
              unread={chat.unread}
              lastMessage={chat.lastMessage}
              lastTime={chat.lastTime}
              isBusy={hideChatMutation.isPending}
              onDelete={() => handleDelete(chat.match)}
              onBlock={() => handleBlock(chat.match)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
