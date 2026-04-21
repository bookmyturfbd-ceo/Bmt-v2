'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Eye, EyeOff, UserPlus, Zap } from 'lucide-react';
import AuthInput from '@/components/auth/AuthInput';

export default function RegisterPage() {
  const t = useTranslations('Auth.register');
  const val = useTranslations('Auth.validation');

  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.fullName.trim()) e.fullName = val('fieldRequired');
    if (!form.email.trim()) e.email = val('fieldRequired');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = val('emailInvalid');
    if (!form.phone.trim()) e.phone = val('fieldRequired');
    else if (!/^01[3-9]\d{8}$/.test(form.phone)) e.phone = val('phoneInvalid');
    if (!form.password) e.password = val('fieldRequired');
    else if (form.password.length < 8) e.password = val('passwordTooShort');
    if (!form.confirmPassword) e.confirmPassword = val('fieldRequired');
    else if (form.password !== form.confirmPassword) e.confirmPassword = val('passwordMismatch');
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const [submitting, setSubmitting] = useState(false);
  const [serverErr, setServerErr]   = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setServerErr('');
    try {
      const res = await fetch('/api/bmt/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: form.fullName,
          email:    form.email,
          phone:    form.phone,
          password: form.password,
          joinedAt: new Date().toISOString().split('T')[0],
        }),
      });
      const data = await res.json();
      if (!res.ok) { setServerErr(data.error || 'Registration failed.'); setSubmitting(false); return; }
      document.cookie = `bmt_auth=1; path=/; max-age=86400; SameSite=Lax`;
      document.cookie = `bmt_role=player; path=/; max-age=86400; SameSite=Lax`;
      document.cookie = `bmt_player_id=${data.id}; path=/; max-age=86400; SameSite=Lax`;
      document.cookie = `bmt_name=${encodeURIComponent(form.fullName)}; path=/; max-age=86400; SameSite=Lax`;
      window.location.href = window.location.origin + '/en';
    } catch {
      setServerErr('Network error. Please try again.');
      setSubmitting(false);
    }
  };


  return (
    <div className="relative flex-1 flex flex-col items-center justify-center min-h-screen bg-background overflow-hidden py-10">
      {/* Ambient background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(0,255,0,0.06),transparent)] pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-accent/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-sm px-4 relative z-10">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 mb-4 drop-shadow-[0_0_15px_rgba(0,255,0,0.2)]">
            <img src="/logo.png" alt="BMT Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-[var(--foreground)]">{t('title')}</h1>
          <p className="text-sm text-neutral-500 font-medium mt-1">{t('subtitle')}</p>
        </div>

        {/* Card */}
        <form onSubmit={handleSubmit} className="glass-panel rounded-3xl p-6 flex flex-col gap-4 shadow-[0_20px_60px_rgba(0,0,0,0.6)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
          <AuthInput
            label={t('fullNameLabel')}
            type="text"
            placeholder={t('fullNamePlaceholder')}
            value={form.fullName}
            onChange={set('fullName')}
            error={errors.fullName}
            autoComplete="name"
          />
          <AuthInput
            label={t('emailLabel')}
            type="email"
            placeholder={t('emailPlaceholder')}
            value={form.email}
            onChange={set('email')}
            error={errors.email}
            autoComplete="email"
          />
          <AuthInput
            label={t('phoneLabel')}
            type="tel"
            placeholder={t('phonePlaceholder')}
            value={form.phone}
            onChange={set('phone')}
            error={errors.phone}
            autoComplete="tel"
          />

          {/* Divider */}
          <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent my-1" />

          <AuthInput
            label={t('passwordLabel')}
            type={showPw ? 'text' : 'password'}
            placeholder={t('passwordPlaceholder')}
            value={form.password}
            onChange={set('password')}
            error={errors.password}
            autoComplete="new-password"
            rightElement={
              <button type="button" onClick={() => setShowPw(prev => !prev)} className="text-neutral-500 hover:text-[var(--foreground)] dark:hover:text-white transition-colors">
                {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            }
          />
          <AuthInput
            label={t('confirmPasswordLabel')}
            type={showConfirmPw ? 'text' : 'password'}
            placeholder={t('confirmPasswordPlaceholder')}
            value={form.confirmPassword}
            onChange={set('confirmPassword')}
            error={errors.confirmPassword}
            autoComplete="new-password"
            rightElement={
              <button type="button" onClick={() => setShowConfirmPw(prev => !prev)} className="text-neutral-500 hover:text-[var(--foreground)] dark:hover:text-white transition-colors">
                {showConfirmPw ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            }
          />

          {serverErr && (
            <p className="text-xs font-bold text-red-400 text-center">{serverErr}</p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="mt-2 w-full bg-accent text-black font-black py-3.5 rounded-xl hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(0,255,0,0.2)] text-sm tracking-wide disabled:opacity-60"
          >
            <UserPlus size={16} className="stroke-[2.5]" />
            {submitting ? 'Creating account…' : t('submit')}
          </button>
        </form>

        {/* Footer Links */}
        <div className="flex flex-col items-center gap-2 mt-6">
          <p className="text-sm text-neutral-500 font-medium">
            {t('alreadyHaveAccount')}{' '}
            <Link href="/login" className="text-accent font-bold hover:underline">
              {t('loginLink')}
            </Link>
          </p>
          <p className="text-xs text-neutral-600 font-medium text-center leading-relaxed">
            {t('ownerCta')}{' '}
            <a href="mailto:contact@bookmyturf.com" className="text-neutral-400 font-bold hover:text-[var(--foreground)] dark:hover:text-white transition-colors">
              {t('ownerCtaLink')}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
