/* b44-full-sync 2026-06-01 */
import { useEffect } from 'react';
import { useCurrentProfile, useUpdateProfile } from '@/lib/useProfile';

export default function PresenceHeartbeat() {
  const { data: profile } = useCurrentProfile();
  const updateProfile = useUpdateProfile();

  useEffect(() => {
    if (!profile?.id) return;

    const ping = () => {
      updateProfile.mutate({
        id: profile.id,
        data: {
          is_online: true,
          last_seen: new Date().toISOString(),
        },
      });
    };

    ping();
    const interval = setInterval(ping, 60_000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') ping();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [profile?.id]);

  return null;
}
