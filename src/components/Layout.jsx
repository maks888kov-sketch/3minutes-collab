/* b44-full-sync 2026-06-01 */
import { Outlet, useLocation } from 'react-router-dom';
import BottomNav from './BottomNav';
import AddToHomeScreenHint from './AddToHomeScreenHint';

const hiddenNavRoutes = ['/onboarding', '/profile-setup', '/login', '/register', '/verify-email', '/forgot-password', '/reset-password', '/chat/', '/video-call', '/feedback'];

export default function Layout() {
  const location = useLocation();
  const hideNav = hiddenNavRoutes.some(r => location.pathname.startsWith(r));

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-[#0d0b14]">
      <main className="relative min-h-0 flex-1 overflow-hidden">
        <Outlet />
      </main>
      {!hideNav && <AddToHomeScreenHint />}
      {!hideNav && <BottomNav />}
    </div>
  );
}