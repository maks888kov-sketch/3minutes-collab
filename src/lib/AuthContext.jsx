/* b44-full-sync 2026-06-01 */
import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';
import { createAxiosClient } from '@base44/sdk/dist/utils/axios-client';
import {
  hasStoredSession,
  clearStoredSession,
  persistAuthToken,
  saveRememberedEmail,
  shouldClearSessionOnAuthError,
} from '@/lib/authRedirect';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings, setAppPublicSettings] = useState(null);

  useEffect(() => {
    checkAppState();
  }, []);

  const getStoredToken = () => {
    if (typeof window === 'undefined') return appParams.token;
    return appParams.token || window.localStorage?.getItem('base44_access_token') || window.localStorage?.getItem('token') || null;
  };

  const checkAppState = async () => {
    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);

      const token = getStoredToken();
      if (token) {
        base44.setToken(token);
      }
      const appClient = createAxiosClient({
        baseURL: `/api/apps/public`,
        headers: { 'X-App-Id': appParams.appId },
        token,
        interceptResponses: true,
      });

      try {
        const publicSettings = await appClient.get(`/prod/public-settings/by-id/${appParams.appId}`);
        setAppPublicSettings(publicSettings);
      } catch (appError) {
        console.error('App state check failed:', appError);

        // Если есть токен — пробуем войти, даже если public-settings вернули 403
        if (token) {
          try {
            await checkUserAuth();
            setIsLoadingPublicSettings(false);
            return;
          } catch {
            // fall through
          }
        }

        if (appError.status === 403 && appError.data?.extra_data?.reason) {
          const reason = appError.data.extra_data.reason;
          if (reason === 'auth_required') {
            setAuthError({ type: 'auth_required', message: 'Authentication required' });
          } else if (reason === 'user_not_registered') {
            setAuthError({ type: 'user_not_registered', message: 'User not registered for this app' });
          } else {
            setAuthError({ type: reason, message: appError.message });
          }
        } else {
          setAuthError({ type: 'unknown', message: appError.message || 'Failed to load app' });
        }

        setIsLoadingPublicSettings(false);
        setIsLoadingAuth(false);
        setAuthChecked(true);
        return;
      }

      setIsLoadingPublicSettings(false);

      if (token) {
        await checkUserAuth();
      } else {
        setIsLoadingAuth(false);
        setIsAuthenticated(false);
        setAuthChecked(true);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      setAuthError({ type: 'unknown', message: error.message || 'An unexpected error occurred' });
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
      setAuthChecked(true);
    }
  };

  const checkUserAuth = async () => {
    try {
      setIsLoadingAuth(true);
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setIsAuthenticated(true);
      setAuthError(null);
      setAuthChecked(true);
      return currentUser;
    } catch (error) {
      console.error('User auth check failed:', error);
      setIsAuthenticated(false);
      setUser(null);
      setAuthChecked(true);

      if (shouldClearSessionOnAuthError(error)) {
        clearStoredSession();
        setAuthError({ type: 'auth_required', message: 'Authentication required' });
      }
      throw error;
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const loginWithEmailPassword = async (email, password) => {
    setAuthError(null);
    const { access_token, user: loggedInUser } = await base44.auth.loginViaEmailPassword(email, password);
    if (access_token) {
      persistAuthToken(access_token);
    }
    saveRememberedEmail(email);
    setUser(loggedInUser);
    setIsAuthenticated(true);
    setAuthChecked(true);
    setAuthError(null);
    return loggedInUser;
  };

  const registerWithEmail = async (email, password) => {
    setAuthError(null);
    return base44.auth.register({ email, password });
  };

  const logout = (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    setAuthChecked(true);

    if (shouldRedirect) {
      base44.auth.logout('/login');
    } else {
      base44.auth.logout();
    }
  };

  const navigateToLogin = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      authChecked,
      logout,
      navigateToLogin,
      checkUserAuth,
      checkAppState,
      loginWithEmailPassword,
      registerWithEmail,
      hasSession: hasStoredSession,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
