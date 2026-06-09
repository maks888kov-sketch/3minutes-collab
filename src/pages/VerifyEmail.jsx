/* b44-full-sync 2026-06-01 */
import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/AuthContext';
import {
  getPendingAuth,
  savePendingAuth,
  redirectAfterAuth,
  getAuthErrorMessage,
} from '@/lib/authRedirect';
import { Sparkles, Mail, Loader2, ArrowRight, RefreshCw } from 'lucide-react';

export default function VerifyEmail() {
  const navigate = useNavigate();
  const location = useLocation();
  const { loginWithEmailPassword } = useAuth();

  const pending = getPendingAuth();
  const [email, setEmail] = useState(location.state?.email || pending.email || '');
  const [password] = useState(location.state?.password || pending.password || '');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    if (email) savePendingAuth(email, password);
  }, [email, password]);

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Укажите email');
      return;
    }
    if (!code.trim()) {
      setError('Введите код из письма');
      return;
    }

    setSubmitting(true);
    try {
      await base44.auth.verifyOtp({ email: email.trim(), otpCode: code.trim() });

      if (password) {
        await loginWithEmailPassword(email.trim(), password);
        await redirectAfterAuth();
      } else {
        navigate('/login', {
          replace: true,
          state: { email: email.trim(), verified: true },
        });
      }
    } catch (err) {
      setError(getAuthErrorMessage(err));
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!email.trim()) {
      setError('Укажите email');
      return;
    }
    setResending(true);
    setError('');
    try {
      await base44.auth.resendOtp(email.trim());
      setResent(true);
      setTimeout(() => setResent(false), 4000);
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col px-6 py-12 safe-top safe-bottom relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-64 h-64 rounded-full bg-primary/20 blur-[100px]" />
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
        className="relative z-10 w-full max-w-md mx-auto flex-1 flex flex-col justify-center"
      >
        <div className="glass-strong rounded-3xl p-6 neon-glow">
          <h2 className="text-2xl font-bold mb-1">Подтверждение email</h2>
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            При регистрации на почту приходит <strong className="text-foreground/80">цифровой код</strong>.
            Введите его здесь — это подтверждение email, не пароль для входа.
          </p>

          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <Mail className="w-4 h-4" />
                Email
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="h-12 bg-secondary border-0 rounded-xl text-base"
                disabled={submitting}
              />
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">
                Код из письма
              </label>
              <Input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\s/g, ''))}
                placeholder="123456"
                className="h-12 bg-secondary border-0 rounded-xl text-base text-center text-lg tracking-widest"
                disabled={submitting}
                maxLength={8}
              />
            </div>

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-3 py-2">
                {error}
              </p>
            )}

            {resent && (
              <p className="text-sm text-green-400 bg-green-400/10 rounded-xl px-3 py-2">
                Новый код отправлен на почту
              </p>
            )}

            <Button
              type="submit"
              disabled={submitting}
              className="w-full h-14 text-lg font-semibold gradient-primary rounded-2xl border-0 neon-glow"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Проверяем...
                </>
              ) : (
                <>
                  Подтвердить
                  <ArrowRight className="w-5 h-5 ml-1" />
                </>
              )}
            </Button>

            <button
              type="button"
              onClick={handleResend}
              disabled={resending || submitting}
              className="w-full flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${resending ? 'animate-spin' : ''}`} />
              {resending ? 'Отправляем...' : 'Отправить код ещё раз'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Уже подтвердили?{' '}
          <Link to="/login" className="text-primary font-medium hover:underline">
            Войти
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
