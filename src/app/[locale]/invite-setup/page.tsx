'use client';
import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Eye, EyeOff, ShieldCheck, Lock } from 'lucide-react';
import AuthInput from '@/components/auth/AuthInput';

type InvitePayload = { role: string; contact: string; issued?: number };

function parseToken(token: string | null): InvitePayload {
  if (!token) return { role: 'Turf Owner', contact: 'owner@alpha-turf.com' };
  try {
    // New format: base64-encoded JSON { role, contact, issued }
    return JSON.parse(atob(token)) as InvitePayload;
  } catch {
    // Fallback for old-style tokens: bmt_turf_owner_xxxx or bmt_coach_xxxx
    if (token.startsWith('bmt_coach')) return { role: 'Coach', contact: '' };
    return { role: 'Turf Owner', contact: '' };
  }
}

function roleToDestination(role: string): string {
  const r = role.toLowerCase();
  if (r.includes('turf') || r.includes('owner')) return '/en/dashboard/owner';
  // Coach dashboard will be /en/dashboard/coach when built
  if (r.includes('coach') || r.includes('pro'))  return '/en/dashboard/owner';
  return '/en';
}

export default function InviteSetupPage() {
  const t = useTranslations('Auth.inviteSetup');
  const val = useTranslations('Auth.validation');

  const [invite, setInvite] = useState<InvitePayload>({ role: 'Turf Owner', contact: '' });
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [form, setForm] = useState({ fullName: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Parse the invite token from the URL on mount
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token');
    setInvite(parseToken(token));
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


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    // Single API call: registers owner server-side + sets auth cookies in response
    const res = await fetch('/api/auth/invite-complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: form.fullName,
        contact:  invite.contact,
        role:     invite.role,
      }),
    });

    const data = await res.json();
    if (res.ok) {
      window.location.href = window.location.origin + data.redirect;
    }
  };


  return (
    <div className="relative flex-1 flex flex-col items-center justify-center min-h-screen bg-background overflow-hidden py-10">
      {/* Ambient glow — blue-shifted for "special invite" feel */}
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
              <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-500">{t('bannerPrefix') ? 'Invite Only' : 'Invite Only'}</p>
              <p className="text-sm font-bold text-[var(--foreground)] leading-tight">
                Welcome! Complete your{' '}
                <span className="text-accent">{invite.role}</span>{' '}
                Profile
              </p>
            </div>
          </div>
        </div>

        {/* Card */}
        <form onSubmit={handleSubmit} className="glass-panel rounded-3xl p-6 flex flex-col gap-4 shadow-[0_20px_60px_rgba(0,0,0,0.6)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
          {/* Locked email/contact */}
          {invite.contact && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">{t('emailLabel')}</label>
              <div className="relative">
                <input
                  type="text"
                  value={invite.contact}
                  disabled
                  className="w-full bg-neutral-100 dark:bg-neutral-950/80 border border-neutral-200 dark:border-white/5 rounded-xl px-4 py-3 text-sm text-[var(--muted)] dark:text-neutral-500 font-medium outline-none opacity-60 cursor-not-allowed pr-10"
                />
                <Lock size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-600" />
              </div>
              <p className="text-[10px] text-neutral-600 font-medium ml-1">Prefilled from your secure invite link</p>
            </div>
          )}

          {/* Divider */}
          {invite.contact && <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />}

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

          <button
            type="submit"
            className="mt-2 w-full bg-accent text-black font-black py-3.5 rounded-xl hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(0,255,0,0.2)] text-sm tracking-wide"
          >
            <ShieldCheck size={16} className="stroke-[2.5]" />
            {t('submit')}
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
