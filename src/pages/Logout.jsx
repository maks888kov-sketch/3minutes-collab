/* b44-full-sync 2026-06-01 */
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { clearStoredSession } from '@/lib/authRedirect';
import { Loader2 } from 'lucide-react';

/** Открыть /logout — сброс сессии и экран входа (для теста на телефоне) */
export default function Logout() {
  const navigate = useNavigate();

  useEffect(() => {
    clearStoredSession();
    try {
      base44.setToken(null);
    } catch {
      /* ignore */
    }
    Promise.resolve(base44.auth.logout?.()).catch(() => {}).finally(() => {
      navigate('/login', { replace: true });
    });
  }, [navigate]);

  return (
    <div className="flex h-full min-h-[100dvh] items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
