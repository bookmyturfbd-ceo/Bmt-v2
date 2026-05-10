'use client';
import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Eye, EyeOff, ShieldCheck, Lock } from 'lucide-react';
import AuthInput from '@/components/auth/AuthInput';

export default function InviteSetupPage() {
  const t = useTranslations('Auth.inviteSetup');
  const val = useTranslations('Auth.validation');

  const [form, setForm] = useState({ fullName: '', password: '', confirmPassword: '' });
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [invite, setInvite] = useState<{role: string, contact: string} | null>(null);
  const [tokenParam, setTokenParam] = useState('');
  const [setupError, setSetupError] = useState('');

  // Parse the invite token from the URL on mount
  useEffect(() => {
    const tkn = new URLSearchParams(window.location.search).get('token');
    if (!tkn) {
      setSetupError('No invite token found in URL.');
      return;
    }
    setTokenParam(tkn);
    fetch(`/api/auth/invite-check?token=${tkn}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) setSetupError(data.error);
        else setInvite(data);
      })
      .catch(() => setSetupError('Network error checking invite.'));
  }, []);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.fullName.trim()) e.fullName = val('fieldRequired');
    if (!form.password) e.password = val('fieldRequired');
    else if (form.password.length < 8) e.password = val('passwordTooShort');
    if (!form.confirmPassword) e.confirmPassword = val('fieldRequired');
    else if (form.password !== form.confirmPassword) e.confirmPassword = val('passwordMismatch');
    setErrors(e);
    return Object.keys(e).length === 0;
  };


  const [submitting, setSubmitting] = useState(false);
  const [serverErr, setServerErr] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !invite) return;
    setSubmitting(true);
    setServerErr('');

    const res = await fetch('/api/auth/invite-complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: form.fullName,
        token: tokenParam,
        password: form.password,
      }),
    });

    const data = await res.json();
    if (res.ok) {
      window.location.href = window.location.origin + data.redirect;
    } else {
      setServerErr(data.error || 'Something went wrong.');
      setSubmitting(false);
    }
  };

  // Loading state
  if (!invite && !setupError) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
          <p className="text-sm text-neutral-500 font-medium">Verifying invite link…</p>
        </div>
      </div>
    );
  }

  // Error state
  if (setupError) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen bg-background">
        <div className="glass-panel rounded-3xl p-8 max-w-sm mx-4 flex flex-col items-center gap-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center">
            <Lock size={24} className="text-red-400" />
          </div>
          <h2 className="text-xl font-black text-white">Invalid Invite</h2>
          <p className="text-sm text-neutral-400">{setupError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex-1 flex flex-col items-center justify-center min-h-screen bg-background overflow-hidden py-10">
      {/* Ambient glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,rgba(0,255,0,0.05),transparent)] pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-80 bg-accent/4 rounded-full blur-[140px] pointer-events-none" />

      <div className="w-full max-w-sm px-4 relative z-10">
        {/* Invite Banner */}
        <div className="mb-6 w-full glass-panel rounded-2xl shadow-[0_0_40px_rgba(0,255,0,0.05)] overflow-hidden">
          <div className="h-1 w-full bg-gradient-to-r from-accent/0 via-accent to-accent/0" />
          <div className="flex items-center gap-3 px-5 py-4">
            <div className="w-10 h-10 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center shrink-0">
              <ShieldCheck size={20} className="text-accent" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-500">Invite Only</p>
              <p className="text-sm font-bold text-[var(--foreground)] leading-tight">
                Welcome! Complete your{' '}
                <span className="text-accent">{invite!.role}</span>{' '}
                Profile
              </p>
            </div>
          </div>
        </div>

        {/* Card */}
        <form onSubmit={handleSubmit} className="glass-panel rounded-3xl p-6 flex flex-col gap-4 shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
          {/* Locked email/contact */}
          {invite!.contact && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">{t('emailLabel')}</label>
              <div className="relative">
                <input
                  type="text"
                  value={invite!.contact}
                  disabled
                  className="w-full bg-neutral-950/80 border border-white/5 rounded-xl px-4 py-3 text-sm text-neutral-500 font-medium outline-none opacity-60 cursor-not-allowed pr-10"
                />
                <Lock size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-600" />
              </div>
              <p className="text-[10px] text-neutral-600 font-medium ml-1">Prefilled from your secure invite link</p>
            </div>
          )}

          {invite!.contact && <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />}

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
            label={t('passwordLabel')}
            type={showPw ? 'text' : 'password'}
            placeholder={t('passwordPlaceholder')}
            value={form.password}
            onChange={set('password')}
            error={errors.password}
            autoComplete="new-password"
            rightElement={
              <button type="button" onClick={() => setShowPw(prev => !prev)} className="text-neutral-500 hover:text-white transition-colors">
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
              <button type="button" onClick={() => setShowConfirmPw(prev => !prev)} className="text-neutral-500 hover:text-white transition-colors">
                {showConfirmPw ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            }
          />

          {serverErr && <p className="text-xs font-bold text-red-400 text-center">⚠ {serverErr}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 w-full bg-accent text-black font-black py-3.5 rounded-xl hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(0,255,0,0.2)] text-sm tracking-wide disabled:opacity-60"
          >
            {submitting ? <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : <ShieldCheck size={16} className="stroke-[2.5]" />}
            {submitting ? 'Setting up account…' : t('submit')}
          </button>
        </form>

        {/* Trust footer */}
        <div className="flex items-center justify-center gap-2 mt-5">
          <Lock size={11} className="text-neutral-700" />
          <p className="text-[11px] text-neutral-700 font-medium">{t('securedBy')}</p>
        </div>
      </div>
    </div>
  );
}
