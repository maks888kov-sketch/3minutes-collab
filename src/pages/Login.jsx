/* b44-full-sync 2026-06-01 */
import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/AuthContext';
import {
  redirectAfterAuth,
  getAuthErrorMessage,
  isEmailVerificationError,
  savePendingAuth,
  getRememberedEmail,
} from '@/lib/authRedirect';
import { Sparkles, Mail, Lock, Loader2, ArrowRight } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { loginWithEmailPassword } = useAuth();

  const [email, setEmail] = useState(location.state?.email || getRememberedEmail() || '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [needsVerify, setNeedsVerify] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (location.state?.verified) {
      setError('');
    }
    if (location.state?.email) {
      setEmail(location.state.email);
    }
  }, [location.state]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setNeedsVerify(false);

    if (!email.trim() || !password) {
      setError('Введите email и пароль');
      return;
    }

    setSubmitting(true);
    try {
      await loginWithEmailPassword(email.trim(), password);
      await redirectAfterAuth();
    } catch (err) {
      if (isEmailVerificationError(err)) {
        savePendingAuth(email.trim(), password);
        setNeedsVerify(true);
        setError('Сначала подтвердите email — проверьте почту и введите код');
      } else {
        setError(getAuthErrorMessage(err));
      }
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-[100dvh] flex-col px-6 py-12 safe-top safe-bottom relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-64 h-64 rounded-full bg-primary/20 blur-[100px]" />
        <div className="absolute bottom-1/4 -right-32 w-64 h-64 rounded-full bg-accent/20 blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 flex items-center justify-center gap-2 mb-10"
      >
        <Sparkles className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold gradient-text">3Minutes</h1>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="relative z-10 w-full max-w-md mx-auto flex-1 flex flex-col justify-center"
      >
        <div className="glass-strong rounded-3xl p-6 neon-glow">
          <h2 className="text-2xl font-bold mb-1">Вход</h2>
          <p className="text-sm text-muted-foreground mb-6">
            С возвращением! После входа приложение запомнит вас — пароль снова вводить не нужно.
          </p>

          {location.state?.verified && (
            <p className="text-sm text-green-400 bg-green-400/10 rounded-xl px-3 py-2 mb-4">
              Email подтверждён! Теперь можно войти
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <Mail className="w-4 h-4" />
                Email
              </label>
              <Input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="h-12 bg-secondary border-0 rounded-xl text-base"
                disabled={submitting}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Lock className="w-4 h-4" />
                  Пароль
                </label>
                <Link
                  to="/forgot-password"
                  state={{ email: email.trim() }}
                  className="text-xs text-primary hover:underline"
                >
                  Забыли пароль?
                </Link>
              </div>
              <Input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Пароль, который задавали при регистрации"
                className="h-12 bg-secondary border-0 rounded-xl text-base"
                disabled={submitting}
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                Пароль — тот, что задавали при регистрации. Код из письма нужен только один раз при регистрации.{' '}
                <Link to="/verify-email" state={{ email: email.trim() }} className="text-primary hover:underline">
                  Ввести код
                </Link>
              </p>
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-destructive bg-destructive/10 rounded-xl px-3 py-2"
              >
                {error}
              </motion.p>
            )}

            {needsVerify && (
              <Button
                type="button"
                onClick={() => navigate('/verify-email', { state: { email: email.trim(), password } })}
                className="w-full h-12 gradient-primary rounded-xl border-0"
              >
                Ввести код из письма
              </Button>
            )}

            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/verify-email', { state: { email: email.trim(), password } })}
              className="w-full h-12 rounded-xl bg-secondary border-0 text-muted-foreground"
              disabled={submitting}
            >
              Не пришёл код подтверждения
            </Button>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full h-14 text-lg font-semibold gradient-primary rounded-2xl border-0 neon-glow"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Входим...
                </>
              ) : (
                <>
                  Войти
                  <ArrowRight className="w-5 h-5 ml-1" />
                </>
              )}
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Нет аккаунта?{' '}
          <Link to="/register" className="text-primary font-medium hover:underline">
            Зарегистрироваться
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
