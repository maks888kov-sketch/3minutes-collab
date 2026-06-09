/* b44-full-sync 2026-06-01 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Flag, ShieldBan, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { REPORT_REASONS } from '@/lib/moderation';

export default function ReportBlockSheet({
  open,
  onClose,
  otherProfile,
  onSubmitReport,
  onBlockOnly,
  submitting = false,
}) {
  const [reasonId, setReasonId] = useState('spam');
  const [details, setDetails] = useState('');
  const [alsoBlock, setAlsoBlock] = useState(true);

  if (!open) return null;

  const handleSubmit = () => {
    onSubmitReport?.({ reasonId, details, alsoBlock });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70]"
    >
      <div className="absolute inset-0 bg-black/75 backdrop-blur-xl" onClick={onClose} />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-lg glass-strong rounded-t-3xl px-6 pt-6 pb-6 max-h-[85dvh] overflow-y-auto chat-composer"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Flag className="w-5 h-5 text-red-400" />
            <h2 className="text-lg font-bold">Жалоба</h2>
          </div>
          <button type="button" onClick={onClose} className="glass p-2 rounded-xl">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-muted-foreground mb-5">
          {otherProfile?.name
            ? `Расскажи, что не так с ${otherProfile.name}. Жалобы помогают убрать спам и рекламу из приложения.`
            : 'Расскажи, что произошло. Жалобы помогают убрать спам из приложения.'}
        </p>

        <p className="text-xs font-medium text-muted-foreground mb-2">Причина</p>
        <div className="space-y-2 mb-4">
          {REPORT_REASONS.map((reason) => (
            <button
              key={reason.id}
              type="button"
              onClick={() => setReasonId(reason.id)}
              className={`w-full text-left rounded-xl px-4 py-3 transition-all ${
                reasonId === reason.id
                  ? 'bg-red-500/15 border border-red-400/40'
                  : 'glass border border-white/5 hover:bg-white/5'
              }`}
            >
              <p className="text-sm font-medium">{reason.label}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{reason.description}</p>
            </button>
          ))}
        </div>

        <p className="text-xs font-medium text-muted-foreground mb-2">Комментарий (необязательно)</p>
        <Input
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder="Например: скидывает ссылку на телеграм-канал"
          className="mb-4 h-11 bg-secondary border-0 rounded-xl text-sm"
          maxLength={500}
        />

        <label className="flex items-start gap-3 mb-5 cursor-pointer">
          <input
            type="checkbox"
            checked={alsoBlock}
            onChange={(e) => setAlsoBlock(e.target.checked)}
            className="mt-1 rounded border-white/20"
          />
          <span className="text-sm leading-snug">
            <span className="font-medium">Заблокировать пользователя</span>
            <span className="block text-xs text-muted-foreground mt-0.5">
              Не будет виден в поиске, чат закроется для вас
            </span>
          </span>
        </label>

        <Button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full h-12 rounded-xl border-0 bg-red-500 hover:bg-red-600 mb-2"
        >
          {submitting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Flag className="w-4 h-4 mr-2" />
              Отправить жалобу
            </>
          )}
        </Button>

        {!alsoBlock && (
          <button
            type="button"
            onClick={() => onBlockOnly?.()}
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ShieldBan className="w-4 h-4" />
            Только заблокировать, без жалобы
          </button>
        )}
      </motion.div>
    </motion.div>
  );
}
