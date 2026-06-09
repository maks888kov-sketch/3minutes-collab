/* b44-full-sync 2026-06-01 */
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { hasSeenOnboarding } from '@/lib/authRedirect';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import Layout from './components/Layout';
import ProfileCompleteGuard from './components/ProfileCompleteGuard';
import Onboarding from './pages/Onboarding';
import ProfileSetup from './pages/ProfileSetup';
import Discover from './pages/Discover';
import Matches from './pages/Matches';
import Chat from './pages/Chat';
import VideoCall from './pages/VideoCall';
import Premium from './pages/Premium';
import Settings from './pages/Settings';
import Chats from './pages/Chats';
import Feedback from './pages/Feedback';
import Login from './pages/Login';
import Logout from './pages/Logout';
import Register from './pages/Register';
import VerifyEmail from './pages/VerifyEmail';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import PageNotFound from './lib/PageNotFound';
import { Loader2 } from 'lucide-react';

const AUTH_ROUTES = ['/login', '/register', '/verify-email', '/forgot-password', '/reset-password'];
const PUBLIC_ROUTES = ['/login', '/register', '/verify-email', '/forgot-password', '/reset-password', '/onboarding', '/logout'];

function HomeRedirect() {
  const { isAuthenticated, authChecked, isLoadingAuth } = useAuth();

  if (!authChecked || isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/discover" replace />;
  }

  if (hasSeenOnboarding()) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to="/onboarding" replace />;
}

export default function AuthenticatedApp() {
  const location = useLocation();
  const { isLoadingAuth, isLoadingPublicSettings, authError, isAuthenticated, authChecked } = useAuth();

  const isAuthRoute = AUTH_ROUTES.includes(location.pathname);
  const isPublicRoute = PUBLIC_ROUTES.some((r) => location.pathname.startsWith(r));
  const sessionActive = isAuthenticated;

  // На страницах входа не блокируем весь экран загрузкой
  const showGlobalLoader = (isLoadingPublicSettings || isLoadingAuth) && !isAuthRoute;

  if (showGlobalLoader) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-muted border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground text-sm">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (authError?.type === 'user_not_registered') {
    return <UserNotRegisteredError />;
  }

  // Уже вошли — сразу в приложение (без повторного логина)
  if (sessionActive && isAuthRoute) {
    return <Navigate to="/discover" replace />;
  }

  // Онбординг только для новых — если уже входили, не показываем слайды
  if (sessionActive && location.pathname === '/onboarding') {
    return <Navigate to="/discover" replace />;
  }

  // Не пускаем без сессии на закрытые страницы
  if (authChecked && !sessionActive && !isPublicRoute) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/logout" element={<Logout />} />
      <Route path="/register" element={<Register />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/profile-setup" element={<ProfileSetup />} />
      <Route path="/video-call/:matchId" element={<VideoCall />} />
      <Route element={<Layout />}>
        <Route element={<ProfileCompleteGuard />}>
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/discover" element={<Discover />} />
          <Route path="/matches" element={<Matches />} />
          <Route path="/chats" element={<Chats />} />
          <Route path="/feedback" element={<Feedback />} />
          <Route path="/chat/:matchId" element={<Chat />} />
          <Route path="/premium" element={<Premium />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Route>
      <Route path="/mock-chat/:chatId" element={<Navigate to="/chats" replace />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
}
