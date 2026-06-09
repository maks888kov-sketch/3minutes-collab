/* b44-full-sync 2026-06-01 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/AuthContext';
import { savePendingAuth, getAuthErrorMessage } from '@/lib/authRedirect';
import { Sparkles, Mail, Lock, Loader2, ArrowRight, UserPlus } from 'lucide-react';

export default function Register() {
  const navigate = useNavigate();
  const { registerWithEmail } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password || !confirmPassword) {
      setError('Заполните все поля');
      return;
    }

    if (password.length < 6) {
      setError('Пароль должен быть не короче 6 символов');
      return;
    }

    if (password !== confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }

    setSubmitting(true);
    try {
      await registerWithEmail(email.trim(), password);
      // Base44 требует подтверждение email — сразу на экран с кодом
      savePendingAuth(email.trim(), password);
      navigate('/verify-email', {
        replace: true,
        state: { email: email.trim(), password },
      });
    } catch (err) {
      setError(getAuthErrorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col px-6 py-12 safe-top safe-bottom relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute bottom-0 -right-20 w-72 h-72 rounded-full bg-accent/15 blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 flex items-center justify-center gap-2 mb-8"
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
          <div className="flex items-center gap-2 mb-1">
            <UserPlus className="w-5 h-5 text-primary" />
            <h2 className="text-2xl font-bold">Регистрация</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            Создай аккаунт и начни знакомиться
          </p>

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
              <label className="text-sm text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <Lock className="w-4 h-4" />
                Пароль
              </label>
              <Input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Минимум 6 символов"
                className="h-12 bg-secondary border-0 rounded-xl text-base"
                disabled={submitting}
              />
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <Lock className="w-4 h-4" />
                Подтверждение пароля
              </label>
              <Input
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Повторите пароль"
                className="h-12 bg-secondary border-0 rounded-xl text-base"
                disabled={submitting}
              />
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

            <Button
              type="submit"
              disabled={submitting}
              className="w-full h-14 text-lg font-semibold gradient-primary rounded-2xl border-0 neon-glow"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Создаём аккаунт...
                </>
              ) : (
                <>
                  Создать аккаунт
                  <ArrowRight className="w-5 h-5 ml-1" />
                </>
              )}
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Уже есть аккаунт?{' '}
          <Link to="/login" className="text-primary font-medium hover:underline">
            Войти
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
