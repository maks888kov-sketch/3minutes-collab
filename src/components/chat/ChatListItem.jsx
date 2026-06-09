/* b44-full-sync 2026-06-01 */
import { useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trash2, Ban, X } from 'lucide-react';
import { formatChatTime, isProfileOnline } from '@/lib/profileUtils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const LONG_PRESS_MS = 520;

export default function ChatListItem({
  match,
  other,
  unread,
  lastMessage,
  lastTime,
  index = 0,
  onDelete,
  onBlock,
  isBusy = false,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const timerRef = useRef(null);
  const didLongPress = useRef(false);

  const online = other ? isProfileOnline(other) : false;
  const photo =
    other?.photos?.[0] ||
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop';
  const displayName = other?.name || 'Пользователь';
  const displayAge = other?.age ? `, ${other.age}` : '';

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const openMenu = useCallback(() => {
    didLongPress.current = true;
    setMenuOpen(true);
  }, []);

  const startPress = useCallback(() => {
    didLongPress.current = false;
    clearTimer();
    timerRef.current = setTimeout(openMenu, LONG_PRESS_MS);
  }, [clearTimer, openMenu]);

  const endPress = useCallback(() => {
    clearTimer();
  }, [clearTimer]);

  const handleClick = (e) => {
    if (didLongPress.current) {
      e.preventDefault();
      didLongPress.current = false;
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.04 }}
      >
        <Link
          to={`/chat/${match.id}`}
          onClick={handleClick}
          onContextMenu={(e) => {
            e.preventDefault();
            openMenu();
          }}
          onTouchStart={startPress}
          onTouchEnd={endPress}
          onTouchMove={endPress}
          onTouchCancel={endPress}
          onMouseDown={startPress}
          onMouseUp={endPress}
          onMouseLeave={endPress}
          className={`flex items-center gap-3 rounded-2xl p-3 transition-colors hover:bg-secondary/50 active:bg-secondary/80 ${
            menuOpen ? 'bg-secondary/60' : ''
          }`}
        >
          <div className="relative flex-shrink-0">
            <div className="h-14 w-14 overflow-hidden rounded-full">
              <img src={photo} alt={other?.name} className="h-full w-full object-cover" />
            </div>
            {online && (
              <div className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-background bg-green-500" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="mb-0.5 flex items-center justify-between">
              <h3 className={`truncate font-semibold ${unread > 0 ? 'text-foreground' : ''}`}>
                {displayName}
                {displayAge}
              </h3>
              <span className="ml-2 flex-shrink-0 text-xs text-muted-foreground">
                {formatChatTime(lastTime)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <p
                className={`truncate text-sm ${
                  unread > 0 ? 'font-medium text-foreground/80' : 'text-muted-foreground'
                }`}
              >
                {lastMessage}
              </p>
              {unread > 0 && (
                <span className="ml-2 flex h-5 min-w-[20px] flex-shrink-0 items-center justify-center rounded-full gradient-primary px-1 text-[10px] font-bold text-white">
                  {unread}
                </span>
              )}
            </div>
          </div>
        </Link>
      </motion.div>

      {menuOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/55 p-4 pb-8"
          onClick={() => setMenuOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md rounded-3xl border border-white/10 bg-[#1a1228] p-2 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3">
              <p className="font-semibold text-foreground">
                {displayName}
                {displayAge}
              </p>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-white/10"
                aria-label="Закрыть"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <button
              type="button"
              disabled={isBusy}
              onClick={() => {
                setMenuOpen(false);
                setConfirm('delete');
              }}
              className="flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left text-foreground hover:bg-white/5"
            >
              <Trash2 className="h-5 w-5 text-muted-foreground" />
              <span>Удалить чат</span>
            </button>
            <button
              type="button"
              disabled={isBusy}
              onClick={() => {
                setMenuOpen(false);
                setConfirm('block');
              }}
              className="flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left text-destructive hover:bg-destructive/10"
            >
              <Ban className="h-5 w-5" />
              <span>Заблокировать и удалить</span>
            </button>
          </motion.div>
        </div>
      )}

      <AlertDialog open={!!confirm} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent className="border-white/10 bg-[#1a1228] text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm === 'block' ? 'Заблокировать?' : 'Удалить чат?'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              {confirm === 'block'
                ? `Переписка с ${displayName} исчезнет, человек больше не появится в чатах.`
                : `Чат с ${displayName} пропадёт из списка. Можно снова написать, если будет новый матч.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10">Отмена</AlertDialogCancel>
            <AlertDialogAction
              disabled={isBusy}
              className={confirm === 'block' ? 'bg-destructive hover:bg-destructive/90' : ''}
              onClick={() => {
                if (confirm === 'block') onBlock?.();
                else onDelete?.();
                setConfirm(null);
              }}
            >
              {confirm === 'block' ? 'Заблокировать' : 'Удалить'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
