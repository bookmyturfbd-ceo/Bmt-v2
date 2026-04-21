'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Eye, EyeOff, LogIn, Zap } from 'lucide-react';
import AuthInput from '@/components/auth/AuthInput';

export default function LoginPage() {
  const t   = useTranslations('Auth.login');
  const val = useTranslations('Auth.validation');

  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ credential: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.credential.trim()) e.credential = val('fieldRequired');
    if (!form.password.trim())   e.password   = val('fieldRequired');
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setServerError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: form.credential, password: form.password }),
      });
      const data = await res.json();
      if (!res.ok) { setServerError(data.error ?? 'Login failed'); setLoading(false); return; }
      // Cookies are already set via Set-Cookie response header — navigate now
      window.location.href = window.location.origin + data.redirect;
    } catch {
      setServerError('Network error. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="relative flex-1 flex flex-col items-center justify-center min-h-screen bg-background overflow-hidden">
      {/* Ambient background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(0,255,0,0.07),transparent)] pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-accent/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-sm px-4 relative z-10">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 mb-4 drop-shadow-[0_0_15px_rgba(0,255,0,0.2)]">
            <img src="/logo.png" alt="BMT Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl font-black tracking-tight">{t('title')}</h1>
          <p className="text-sm text-neutral-500 font-medium mt-1">{t('subtitle')}</p>
        </div>

        {/* Card */}
        <form onSubmit={handleSubmit} className="glass-panel rounded-3xl p-6 flex flex-col gap-5 shadow-[0_20px_60px_rgba(0,0,0,0.6)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
          <AuthInput
            label={t('emailLabel')}
            type="text"
            placeholder={t('emailPlaceholder')}
            value={form.credential}
            onChange={e => setForm(f => ({ ...f, credential: e.target.value }))}
            error={errors.credential}
            autoComplete="username"
          />
          <AuthInput
            label={t('passwordLabel')}
            type={showPassword ? 'text' : 'password'}
            placeholder={t('passwordPlaceholder')}
            value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            error={errors.password}
            autoComplete="current-password"
            rightElement={
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowPassword(prev => !prev)}
                  className="text-neutral-500 hover:text-[var(--foreground)] dark:hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
                <a href="#" className="text-[11px] font-bold text-accent hover:underline">
                  {t('forgotPassword')}
                </a>
              </div>
            }
          />

          {serverError && (
            <p className="text-xs text-red-400 font-semibold text-center -mt-1">⚠ {serverError}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full bg-accent text-black font-black py-3.5 rounded-xl hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(0,255,0,0.2)] text-sm tracking-wide disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            ) : (
              <LogIn size={16} className="stroke-[2.5]" />
            )}
            {loading ? 'Signing in…' : t('submit')}
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-sm text-neutral-500 mt-6 font-medium">
          {t('newPlayer')}{' '}
          <Link href="/register" className="text-accent font-bold hover:underline">
            {t('createAccount')}
          </Link>
        </p>
      </div>
    </div>
  );
}
