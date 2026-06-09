/* b44-full-sync 2026-06-01 */
import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/AuthContext';
import { getAuthErrorMessage, redirectAfterAuth } from '@/lib/authRedirect';
import { completePasswordReset } from '@/lib/resetPasswordFlow';
import { getResetTokenFromSearch } from '@/lib/resetToken';
import { Sparkles, Lock, Loader2, ArrowRight, KeyRound } from 'lucide-react';

export default function ResetPassword() {
  const location = useLocation();
  const navigate = useNavigate();
  const { loginWithEmailPassword } = useAuth();

  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fromUrl = getResetTokenFromSearch(location.search);
    if (fromUrl) {
      setResetToken(fromUrl);
    }
  }, [location.search]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const token = resetToken.trim();
    if (!token) {
      setError('Откройте ссылку из письма или запросите сброс пароля заново');
      return;
    }
    if (newPassword.length < 6) {
      setError('Пароль — минимум 6 символов');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }

    setSubmitting(true);
    try {
      await completePasswordReset({
        email: '',
        code: token,
        newPassword,
      });

      const pendingEmail = sessionStorage.getItem('pending_auth_email');
      if (pendingEmail) {
        try {
          await loginWithEmailPassword(pendingEmail, newPassword);
          await redirectAfterAuth();
          return;
        } catch {
          // fall through
        }
      }

      navigate('/login', {
        replace: true,
        state: { verified: true },
      });
    } catch (err) {
      setError(getAuthErrorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col px-6 py-12 safe-top safe-bottom relative overflow-hidden">
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
          <div className="flex items-center gap-2 mb-1">
            <KeyRound className="w-5 h-5 text-primary" />
            <h2 className="text-2xl font-bold">Новый пароль</h2>
          </div>

          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            {resetToken
              ? 'Ссылка из письма сработала. Задайте новый пароль для входа в 3Minutes.'
              : 'Ссылка из письма не найдена. Запросите сброс пароля снова.'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <Lock className="w-4 h-4" />
                Новый пароль
              </label>
              <Input
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Минимум 6 символов"
                className="h-12 bg-secondary border-0 rounded-xl text-base"
                disabled={submitting}
              />
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <Lock className="w-4 h-4" />
                Повторите пароль
              </label>
              <Input
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ещё раз"
                className="h-12 bg-secondary border-0 rounded-xl text-base"
                disabled={submitting}
              />
            </div>

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-3 py-2">{error}</p>
            )}

            <Button
              type="submit"
              disabled={submitting || !resetToken}
              className="w-full h-14 text-lg font-semibold gradient-primary rounded-2xl border-0 neon-glow"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Сохраняем...
                </>
              ) : (
                <>
                  Сохранить пароль
                  <ArrowRight className="w-5 h-5 ml-1" />
                </>
              )}
            </Button>
          </form>

          {!resetToken && (
            <Link
              to="/forgot-password"
              className="block text-center text-sm text-primary font-medium hover:underline mt-4"
            >
              Запросить письмо для сброса
            </Link>
          )}
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          <Link to="/login" className="text-primary font-medium hover:underline">
            ← Вернуться ко входу
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
