/* b44-full-sync 2026-06-01 */
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useCurrentProfile } from '@/lib/useProfile';
import PresenceHeartbeat from '@/components/PresenceHeartbeat';

const ALLOWED_INCOMPLETE = ['/profile-setup', '/settings', '/feedback', '/premium'];

export default function ProfileCompleteGuard() {
  const location = useLocation();
  const { data: profile, isLoading } = useCurrentProfile();

  const allowed = ALLOWED_INCOMPLETE.some((path) => location.pathname.startsWith(path));

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const needsSetup = !profile || !profile.profile_complete;

  if (needsSetup && !allowed) {
    return <Navigate to="/profile-setup" replace state={{ from: location.pathname }} />;
  }

  return (
    <>
      <PresenceHeartbeat />
      <Outlet />
    </>
  );
}
