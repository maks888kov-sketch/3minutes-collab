/* b44-full-sync 2026-06-01 */
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/AuthContext';
import { getAuthErrorMessage, redirectAfterAuth, savePendingAuth } from '@/lib/authRedirect';
import {
  requestPasswordResetCode,
  completePasswordReset,
  getPasswordResetDeploySteps,
} from '@/lib/resetPasswordFlow';
import {
  Sparkles,
  Mail,
  Loader2,
  ArrowRight,
  RefreshCw,
  KeyRound,
  Lock,
} from 'lucide-react';

export default function ForgotPassword() {
  const location = useLocation();
  const navigate = useNavigate();
  const { loginWithEmailPassword } = useAuth();

  const [step, setStep] = useState(location.state?.step === 2 ? 2 : 1);
  const [email, setEmail] = useState(location.state?.email || '');
  const [code, setCode] = useState(location.state?.prefilledCode || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resent, setResent] = useState(false);
  const [needsDeploy, setNeedsDeploy] = useState(false);

  const handleSendCode = async (e) => {
    e?.preventDefault();
    setError('');
    setNeedsDeploy(false);

    if (!email.trim()) {
      setError('Укажите email');
      return;
    }

    setSending(true);
    try {
      savePendingAuth(email.trim(), '');
      await requestPasswordResetCode(email.trim());
      setStep(2);
      setResent(true);
      setTimeout(() => setResent(false), 4000);
    } catch (err) {
      const msg = getAuthErrorMessage(err);
      setError(msg);
      if (
        err?.code === 'PASSWORD_RESET_FUNCTION_MISSING' ||
        msg.includes('не опубликован') ||
        msg.includes('backend-функц')
      ) {
        setNeedsDeploy(true);
      }
    } finally {
      setSending(false);
    }
  };

  const handleResetPassword = async (e) => {
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
        email: email.trim(),
        code: code.trim(),
        newPassword,
      });

      try {
        await loginWithEmailPassword(email.trim(), newPassword);
        await redirectAfterAuth();
        return;
      } catch {
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

  const handleResendCode = async () => {
    setSending(true);
    setError('');
    try {
      await requestPasswordResetCode(email.trim());
      setResent(true);
      setTimeout(() => setResent(false), 4000);
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setSending(false);
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
            <h2 className="text-2xl font-bold">Сброс пароля</h2>
          </div>

          {step === 1 ? (
            <>
              <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                Укажите email — пришлём <strong className="text-foreground/80">цифровой код</strong>.
                Введите его здесь в приложении и задайте новый пароль.
              </p>

              <form onSubmit={handleSendCode} className="space-y-4">
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
                    disabled={sending}
                  />
                </div>

                {error && (
                  <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-3 py-2">{error}</p>
                )}

                {needsDeploy && (
                  <div className="text-sm bg-amber-400/10 border border-amber-400/20 rounded-xl px-3 py-3 space-y-2">
                    <p className="text-amber-200 font-medium">Почему код не приходит</p>
                    <p className="text-muted-foreground leading-relaxed">
                      Email уже подтверждён — это нормально. Но отправка <strong className="text-foreground/80">цифрового кода</strong> работает
                      только через backend-функцию на Base44, которая ещё <strong className="text-foreground/80">не опубликована</strong>.
                    </p>
                    <ol className="list-decimal list-inside text-muted-foreground space-y-1 text-xs">
                      {getPasswordResetDeploySteps().map((stepText) => (
                        <li key={stepText}>{stepText}</li>
                      ))}
                    </ol>
                    <a
                      href="https://app.base44.com/apps/6a1356896fdf56fa48755d68/editor"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-block text-primary font-medium hover:underline text-xs"
                    >
                      Открыть редактор Base44 →
                    </a>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={sending}
                  className="w-full h-14 text-lg font-semibold gradient-primary rounded-2xl border-0 neon-glow"
                >
                  {sending ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Отправляем код...
                    </>
                  ) : (
                    <>
                      Прислать код на почту
                      <ArrowRight className="w-5 h-5 ml-1" />
                    </>
                  )}
                </Button>
              </form>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                На <span className="text-foreground">{email}</span> отправлен{' '}
                <strong className="text-foreground/80">цифровой код</strong> (6 цифр).
                Введите его здесь и задайте новый пароль — без ссылок и переходов.
              </p>

              <form onSubmit={handleResetPassword} className="space-y-4">
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
                    maxLength={6}
                  />
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Ищите в письме строку «Ваш код: 123456». Это не ссылка — только 6 цифр.
                  </p>
                </div>

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

                {resent && (
                  <p className="text-sm text-green-400 bg-green-400/10 rounded-xl px-3 py-2">
                    Код отправлен на почту
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
                      Сохраняем...
                    </>
                  ) : (
                    <>
                      Сменить пароль
                      <ArrowRight className="w-5 h-5 ml-1" />
                    </>
                  )}
                </Button>

                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={sending || submitting}
                  className="w-full flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 ${sending ? 'animate-spin' : ''}`} />
                  {sending ? 'Отправляем...' : 'Отправить код ещё раз'}
                </button>

                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-full text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Изменить email
                </button>
              </form>
            </>
          )}

          <p className="text-sm text-muted-foreground mt-6 pt-4 border-t border-white/5">
            Код после <strong className="text-foreground/80">регистрации</strong>?{' '}
            <Link
              to="/verify-email"
              state={{ email: email.trim() }}
              className="text-primary font-medium hover:underline"
            >
              Подтвердить email
            </Link>
          </p>
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
