/* b44-full-sync 2026-06-01 */
import { useState } from 'react';
import { Toaster } from '@/components/ui/toaster';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider } from '@/lib/AuthContext';
import { hasStoredSession } from '@/lib/authRedirect';
import SplashScreen from './components/SplashScreen';
import AppNotifications from './components/AppNotifications';
import CallManager from './components/CallManager';
import AuthenticatedApp from './AuthenticatedApp';

function App() {
  const [splashDone, setSplashDone] = useState(() => hasStoredSession());

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        {!splashDone && <SplashScreen onDone={() => setSplashDone(true)} />}
        {splashDone && (
          <Router>
            <AuthenticatedApp />
            <CallManager />
          </Router>
        )}
        <AppNotifications />
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;
