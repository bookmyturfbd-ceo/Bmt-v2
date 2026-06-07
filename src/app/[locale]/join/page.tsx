'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useTranslations } from 'next-intl';
import { 
  Building2, 
  Briefcase, 
  GraduationCap, 
  Loader2, 
  CheckCircle2, 
  Phone, 
  Mail, 
  MapPin, 
  Send, 
  ChevronLeft,
  ArrowRight
} from 'lucide-react';
import { trackMetaEvent } from '@/lib/meta-pixel';
import { Link, useRouter } from '@/i18n/routing';
import { useSearchParams } from 'next/navigation';

// Facebook SVG icon
function FacebookIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

type RequestType = 'TURF_OWNER' | 'PROFESSIONAL' | 'COACH';

const TYPE_CONFIG: Record<RequestType, {
  titleKey: string;
  formTitleKey: string;
  formDescKey: string;
  icon: typeof Building2;
  gradient: string;
  glow: string;
  themeColor: string;
  borderColor: string;
}> = {
  TURF_OWNER: {
    titleKey: 'turfOwnerTitle',
    formTitleKey: 'listTurf',
    formDescKey: 'listTurfDesc',
    icon: Building2,
    gradient: 'from-emerald-600/20 to-emerald-900/10',
    glow: 'shadow-emerald-500/10 hover:shadow-emerald-500/20',
    themeColor: 'text-emerald-400',
    borderColor: 'border-emerald-500/20 focus:border-emerald-400',
  },
  PROFESSIONAL: {
    titleKey: 'organizerTitle',
    formTitleKey: 'joinOrganizer',
    formDescKey: 'joinOrganizerDesc',
    icon: Briefcase,
    gradient: 'from-blue-600/20 to-blue-900/10',
    glow: 'shadow-blue-500/10 hover:shadow-blue-500/20',
    themeColor: 'text-blue-400',
    borderColor: 'border-blue-500/20 focus:border-blue-400',
  },
  COACH: {
    titleKey: 'coachTitle',
    formTitleKey: 'joinCoach',
    formDescKey: 'joinCoachDesc',
    icon: GraduationCap,
    gradient: 'from-fuchsia-600/20 to-fuchsia-900/10',
    glow: 'shadow-fuchsia-500/10 hover:shadow-fuchsia-500/20',
    themeColor: 'text-fuchsia-400',
    borderColor: 'border-fuchsia-500/20 focus:border-fuchsia-400',
  },
};

interface FormState {
  name: string;
  phone: string;
  email: string;
  location: string;
  message: string;
}

const INITIAL_FORM: FormState = { name: '', phone: '', email: '', location: '', message: '' };

function JoinPageContent() {
  const t = useTranslations('Home');
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Read and validate the type from search parameter
  const typeParam = searchParams.get('type') as RequestType | null;
  const activeType: RequestType | null = (typeParam && ['TURF_OWNER', 'PROFESSIONAL', 'COACH'].includes(typeParam)) 
    ? typeParam 
    : null;

  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Reset form when type changes
  useEffect(() => {
    setForm(INITIAL_FORM);
    setSuccess(false);
    setError('');
  }, [activeType]);

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.phone.trim() || !form.location.trim()) {
      setError(t('formError'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/join-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: activeType, ...form }),
      });
      if (res.ok) {
        setSuccess(true);
        // Track the Lead event via Meta Pixel and Conversions API (CAPI)
        trackMetaEvent('Lead', {
          content_name: activeType === 'COACH' ? 'Coach Onboarding Inquiry' : activeType === 'TURF_OWNER' ? 'Turf Owner Onboarding Inquiry' : 'Organizer Onboarding Inquiry',
          content_category: activeType || 'General'
        }, {
          name: form.name,
          phone: form.phone,
          email: form.email || undefined
        });
      } else {
        const d = await res.json().catch(() => ({}));
        setError(d.error || 'Something went wrong. Please try again.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const config = activeType ? TYPE_CONFIG[activeType] : null;

  return (
    <div className="min-h-screen bg-[#080808] text-white flex flex-col pb-24">
      {/* ── Header ── */}
      <header className="sticky top-0 z-40 bg-[#080808]/90 backdrop-blur-md border-b border-white/5 px-4 pt-4 pb-3">
        <div className="w-full max-w-md mx-auto flex items-center gap-3">
          <button 
            onClick={() => {
              if (activeType) {
                router.push('/join');
              } else {
                router.push('/');
              }
            }}
            className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="flex-1">
            <h1 className="font-black text-lg tracking-tight">
              {activeType ? t(config!.formTitleKey) : t('joinPlatform')}
            </h1>
          </div>
        </div>
      </header>

      {/* ── Main Body ── */}
      <main className="flex-1 w-full max-w-md mx-auto px-4 pt-6 flex flex-col gap-6">
        
        {success ? (
          /* ── Success State Screen ── */
          <div className="flex-1 flex flex-col items-center justify-center gap-6 text-center py-12 px-2">
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30 animate-bounce">
              <CheckCircle2 size={40} className="text-emerald-400" />
            </div>
            <div className="flex flex-col gap-2">
              <h2 className="font-black text-2xl text-white tracking-tight">{t('requestSent')}</h2>
              <p className="text-sm text-[var(--muted)] leading-relaxed max-w-[280px] mx-auto">
                {t('requestSentDesc')}
              </p>
            </div>
            <button
              onClick={() => router.push('/')}
              className="w-full max-w-xs mt-4 py-3.5 bg-accent text-black font-black rounded-2xl text-sm hover:brightness-110 active:scale-95 transition-all shadow-[0_4px_20px_rgba(0,255,65,0.25)]"
            >
              {t('doneBtn')}
            </button>
          </div>
        ) : activeType && config ? (
          /* ── Form View Screen ── */
          <div className="flex flex-col gap-6">
            
            {/* Header info card */}
            <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${config.gradient} border border-white/10 p-5 flex items-start gap-4 shadow-xl`}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-white/5 border border-white/10 shrink-0">
                <config.icon size={24} className="text-white" />
              </div>
              <div className="flex-1">
                <h2 className="font-black text-white text-base leading-tight">{t(config.formTitleKey)}</h2>
                <p className="text-xs text-[var(--muted)] mt-1.5 leading-relaxed">{t(config.formDescKey)}</p>
              </div>
            </div>

            {/* Support Box */}
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex flex-col gap-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">{t('needHelp')}</p>
              <div className="grid grid-cols-1 gap-2.5">
                <a href="tel:01621960472" className="flex items-center gap-3 group">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/15 flex items-center justify-center border border-emerald-500/25 shrink-0">
                    <Phone size={14} className="text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-white/80 group-hover:text-emerald-400 transition-colors">01621-960472</p>
                    <p className="text-[9px] text-[var(--muted)]">Call or WhatsApp</p>
                  </div>
                </a>

                <a href="https://www.facebook.com/bookmyturfbd" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 group">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/15 flex items-center justify-center border border-blue-500/25 shrink-0 text-blue-400">
                    <FacebookIcon size={14} />
                  </div>
                  <div>
                    <p className="text-xs font-black text-white/80 group-hover:text-blue-400 transition-colors">facebook.com/bookmyturfbd</p>
                    <p className="text-[9px] text-[var(--muted)]">Facebook Page</p>
                  </div>
                </a>

                <a href="mailto:bookmyturfbd@gmail.com" className="flex items-center gap-3 group">
                  <div className="w-8 h-8 rounded-xl bg-red-500/15 flex items-center justify-center border border-red-500/25 shrink-0">
                    <Mail size={14} className="text-red-400" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-white/80 group-hover:text-red-400 transition-colors">bookmyturfbd@gmail.com</p>
                    <p className="text-[9px] text-[var(--muted)]">Email Us</p>
                  </div>
                </a>
              </div>
            </div>

            {/* Form Fields container */}
            <div className="bg-[#0e0e0e] border border-white/5 rounded-3xl p-5 flex flex-col gap-4 shadow-xl">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)] block mb-1.5">
                  {t('fullName')} <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Md. Rahim Uddin"
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  className={`w-full bg-neutral-900/80 border ${config.borderColor} rounded-xl px-4 py-3 text-sm font-bold text-white placeholder:text-white/20 focus:outline-none transition-colors`}
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)] block mb-1.5">
                  {t('phone')} <span className="text-red-400">*</span>
                </label>
                <input
                  type="tel"
                  placeholder="e.g. 01XXXXXXXXX"
                  value={form.phone}
                  onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                  className={`w-full bg-neutral-900/80 border ${config.borderColor} rounded-xl px-4 py-3 text-sm font-bold text-white placeholder:text-white/20 focus:outline-none transition-colors`}
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)] block mb-1.5">
                  {t('email')} <span className="text-white/30 font-bold normal-case">{t('optional')}</span>
                </label>
                <input
                  type="email"
                  placeholder="e.g. name@email.com"
                  value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  className={`w-full bg-neutral-900/80 border ${config.borderColor} rounded-xl px-4 py-3 text-sm font-bold text-white placeholder:text-white/20 focus:outline-none transition-colors`}
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)] block mb-1.5">
                  <MapPin size={10} className="inline mr-1" />
                  {t('locationArea')} <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mirpur, Dhaka"
                  value={form.location}
                  onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
                  className={`w-full bg-neutral-900/80 border ${config.borderColor} rounded-xl px-4 py-3 text-sm font-bold text-white placeholder:text-white/20 focus:outline-none transition-colors`}
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)] block mb-1.5">
                  {t('tellUsMore')} <span className="text-white/30 font-bold normal-case">{t('optional')}</span>
                </label>
                <textarea
                  placeholder={t('describeExpertise')}
                  value={form.message}
                  onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                  rows={4}
                  className={`w-full bg-neutral-900/80 border ${config.borderColor} rounded-xl px-4 py-3 text-sm font-bold text-white placeholder:text-white/20 focus:outline-none transition-colors resize-none`}
                />
              </div>

              {error && (
                <p className="text-xs text-red-400 font-bold bg-red-500/10 border border-red-500/20 px-3 py-2.5 rounded-xl">
                  {error}
                </p>
              )}

              <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full py-3.5 bg-accent text-black font-black text-sm rounded-xl hover:brightness-110 disabled:opacity-60 flex items-center justify-center gap-2 transition-all shadow-lg shadow-accent/20"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <><Send size={15} /> {t('submitRequest')}</>}
              </button>
            </div>

            {/* Change Role Selection link */}
            <div className="text-center py-2">
              <Link href="/join" className="text-xs font-bold text-accent hover:underline flex items-center justify-center gap-1">
                Choose another role to register <ArrowRight size={12} />
              </Link>
            </div>

          </div>
        ) : (
          /* ── Option Selector Screen ── */
          <div className="flex flex-col gap-5 pt-2">
            <div className="text-center mb-2">
              <p className="text-xs font-black uppercase tracking-widest text-accent mb-1">{t('joinPlatform')}</p>
              <h2 className="text-2xl font-black tracking-tight text-white">Choose Your Profile Type</h2>
              <p className="text-xs text-neutral-500 mt-1.5 max-w-[280px] mx-auto">
                Fill the onboarding inquiry form to partner with Book My Turf.
              </p>
            </div>

            <div className="flex flex-col gap-4">
              {(Object.keys(TYPE_CONFIG) as RequestType[]).map(type => {
                const cfg = TYPE_CONFIG[type];
                const Icon = cfg.icon;
                return (
                  <Link
                    key={type}
                    href={`/join?type=${type}`}
                    className={`group relative flex items-start gap-4 p-5 rounded-2xl bg-gradient-to-br ${cfg.gradient} border border-white/5 hover:border-white/15 active:scale-[0.98] transition-all duration-200 shadow-xl ${cfg.glow}`}
                  >
                    <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 shrink-0 group-hover:scale-105 transition-transform">
                      <Icon size={22} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0 pr-4">
                      <h3 className="text-sm font-black text-white leading-tight mt-0.5">{t(cfg.formTitleKey)}</h3>
                      <p className="text-[11px] text-neutral-500 mt-1 leading-normal truncate">{t(cfg.formDescKey)}</p>
                    </div>
                    <div className={`w-8 h-8 rounded-full bg-white/5 flex items-center justify-center self-center shrink-0 border border-white/10 group-hover:bg-white/10 ${cfg.themeColor} transition-colors`}>
                      <ArrowRight size={14} />
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Quick Contact Block */}
            <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-5 mt-4 flex flex-col gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-accent mb-1">{t('needHelp')}</p>
                <h3 className="text-sm font-black text-white">Direct Contacts</h3>
                <p className="text-[11px] text-neutral-500 mt-0.5">Reach out to us directly for urgent onboarding help.</p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <a href="tel:01621960472" className="flex items-center gap-3 group">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center border border-emerald-500/25 shrink-0">
                    <Phone size={15} className="text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-white/80 group-hover:text-emerald-400 transition-colors">01621-960472</p>
                    <p className="text-[9px] text-[var(--muted)]">Call / WhatsApp</p>
                  </div>
                </a>

                <a href="https://www.facebook.com/bookmyturfbd" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 group">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/15 flex items-center justify-center border border-blue-500/25 shrink-0 text-blue-400">
                    <FacebookIcon size={15} />
                  </div>
                  <div>
                    <p className="text-xs font-black text-white/80 group-hover:text-blue-400 transition-colors">facebook.com/bookmyturfbd</p>
                    <p className="text-[9px] text-[var(--muted)]">Facebook Page</p>
                  </div>
                </a>

                <a href="mailto:bookmyturfbd@gmail.com" className="flex items-center gap-3 group">
                  <div className="w-9 h-9 rounded-xl bg-red-500/15 flex items-center justify-center border border-red-500/25 shrink-0">
                    <Mail size={15} className="text-red-400" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-white/80 group-hover:text-red-400 transition-colors">bookmyturfbd@gmail.com</p>
                    <p className="text-[9px] text-[var(--muted)]">Email Address</p>
                  </div>
                </a>
              </div>
            </div>

          </div>
        )}

      </main>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#080808] flex items-center justify-center">
        <Loader2 size={36} className="text-accent animate-spin" />
      </div>
    }>
      <JoinPageContent />
    </Suspense>
  );
}
