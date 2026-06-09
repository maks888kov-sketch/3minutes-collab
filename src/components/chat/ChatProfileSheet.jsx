/* b44-full-sync 2026-06-01 */
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import ProfilePhotoCard from '@/components/profile/ProfilePhotoCard';
import { Button } from '@/components/ui/button';

export default function ChatProfileSheet({ open, onClose, profile }) {
  const [photoIndex, setPhotoIndex] = useState(0);

  useEffect(() => {
    if (open) setPhotoIndex(0);
  }, [open, profile?.id]);

  if (!open || !profile) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] bg-black"
    >
      <ProfilePhotoCard
        profile={profile}
        photoIndex={photoIndex}
        onPhotoIndexChange={setPhotoIndex}
        rounded={false}
        extraBottomPadding
        className="h-full"
      />

      <button
        type="button"
        onClick={onClose}
        className="absolute left-4 top-4 z-30 rounded-full bg-black/40 p-2.5 backdrop-blur-md safe-top"
        aria-label="Назад"
      >
        <ArrowLeft className="h-5 w-5 text-white" />
      </button>

      <div className="absolute inset-x-0 bottom-0 z-30 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3">
        <Button
          type="button"
          onClick={onClose}
          className="h-12 w-full rounded-2xl border-0 bg-white text-base font-semibold text-black hover:bg-white/90"
        >
          Вернуться в чат
        </Button>
      </div>
    </motion.div>
  );
}
