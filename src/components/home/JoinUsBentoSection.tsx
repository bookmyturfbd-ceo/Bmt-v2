'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Building2, Briefcase, GraduationCap, X, Loader2, CheckCircle2, Phone, Mail, MapPin, Send } from 'lucide-react';
import { trackMetaEvent } from '@/lib/meta-pixel';

// Facebook SVG icon (not available in all lucide-react versions)
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
}> = {
  TURF_OWNER: {
    titleKey: 'turfOwnerTitle',
    formTitleKey: 'listTurf',
    formDescKey: 'listTurfDesc',
    icon: Building2,
    gradient: 'from-emerald-600/20 to-emerald-900/10',
    glow: 'group-hover:shadow-emerald-500/20',
  },
  PROFESSIONAL: {
    titleKey: 'organizerTitle',
    formTitleKey: 'joinOrganizer',
    formDescKey: 'joinOrganizerDesc',
    icon: Briefcase,
    gradient: 'from-blue-600/20 to-blue-900/10',
    glow: 'group-hover:shadow-blue-500/20',
  },
  COACH: {
    titleKey: 'coachTitle',
    formTitleKey: 'joinCoach',
    formDescKey: 'joinCoachDesc',
    icon: GraduationCap,
    gradient: 'from-fuchsia-600/20 to-fuchsia-900/10',
    glow: 'group-hover:shadow-fuchsia-500/20',
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

export default function JoinUsBentoSection() {
  const t = useTranslations('Home');
  const [modalType, setModalType] = useState<RequestType | null>(null);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleOpen = (type: RequestType) => {
    setModalType(type);
    setForm(INITIAL_FORM);
    setSuccess(false);
    setError('');
  };

  const handleClose = () => {
    if (loading) return;
    setModalType(null);
    setSuccess(false);
    setError('');
  };

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
        body: JSON.stringify({ type: modalType, ...form }),
      });
      if (res.ok) {
        setSuccess(true);
        // Track the Lead event via Meta Pixel and Conversions API (CAPI)
        trackMetaEvent('Lead', {
          content_name: modalType === 'COACH' ? 'Coach Onboarding Inquiry' : modalType === 'TURF_OWNER' ? 'Turf Owner Onboarding Inquiry' : 'Organizer Onboarding Inquiry',
          content_category: modalType || 'General'
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

  const config = modalType ? TYPE_CONFIG[modalType] : null;

  return (
    <>
      {/* ── Join Us Bento Grid (3 cards only) ── */}
      <section className="px-4 flex flex-col gap-3">
        <div className="flex items-center gap-1.5">
          <Send size={15} className="text-accent" />
          <h3 className="text-base font-black tracking-tight text-white">{t('joinPlatform')}</h3>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          {(Object.keys(TYPE_CONFIG) as RequestType[]).map(type => {
            const cfg = TYPE_CONFIG[type];
            const Icon = cfg.icon;
            return (
              <button
                key={type}
                onClick={() => handleOpen(type)}
                className={`group relative flex flex-col items-center text-center gap-2 p-3 rounded-2xl bg-gradient-to-b ${cfg.gradient} border border-white/8 hover:border-white/20 active:scale-95 transition-all duration-200 shadow-lg hover:shadow-xl ${cfg.glow}`}
              >
                <div className="w-9 h-9 rounded-xl bg-white/8 flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform duration-200">
                  <Icon size={18} className="text-white" />
                </div>
                <p className="text-[9px] font-black text-white leading-tight">{t(cfg.titleKey)}</p>
                <span className="text-[8px] font-black uppercase tracking-widest text-accent bg-accent/10 border border-accent/20 px-2 py-0.5 rounded-full">
                  {t('joinUsBtn')} →
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Modal (slide-up bottom sheet) ── */}
      {modalType && config && (
        <div
          className="fixed inset-0 z-[200] flex items-end justify-center bg-black/70 backdrop-blur-sm"
          onClick={handleClose}
        >
          <div
            className="w-full max-w-md bg-[#0e0e0e] border border-white/10 rounded-t-3xl flex flex-col shadow-2xl animate-in slide-in-from-bottom-4 duration-300 max-h-[92dvh]"
            onClick={e => e.stopPropagation()}
          >
            {/* Sticky Modal Header */}
            <div className="sticky top-0 bg-[#0e0e0e] border-b border-white/8 px-6 pt-5 pb-4 flex items-start justify-between z-10 rounded-t-3xl">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br ${config.gradient} border border-white/10`}>
                  <config.icon size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="font-black text-white text-base leading-tight">{t(config.formTitleKey)}</h3>
                  <p className="text-[10px] text-[var(--muted)] mt-0.5">{t(config.formDescKey)}</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors shrink-0 ml-2"
              >
                <X size={15} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto px-6 py-5 flex flex-col gap-5 pb-10">

              {/* ── Contact Us (top of modal body) ── */}
              <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-4 flex flex-col gap-2.5">
                <p className="text-[9px] font-black uppercase tracking-widest text-[var(--muted)]">{t('needHelp')}</p>
                <div className="flex flex-col gap-2">
                  <a href="tel:01621960472" className="flex items-center gap-2.5 group">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center border border-emerald-500/25 shrink-0">
                      <Phone size={12} className="text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-[11px] font-black text-white/80 group-hover:text-emerald-400 transition-colors">01621-960472</p>
                      <p className="text-[9px] text-[var(--muted)]">Call / WhatsApp</p>
                    </div>
                  </a>

                  <a href="https://www.facebook.com/bookmyturfbd" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 group">
                    <div className="w-7 h-7 rounded-lg bg-blue-500/15 flex items-center justify-center border border-blue-500/25 shrink-0 text-blue-400">
                      <FacebookIcon size={12} />
                    </div>
                    <div>
                      <p className="text-[11px] font-black text-white/80 group-hover:text-blue-400 transition-colors">facebook.com/bookmyturfbd</p>
                      <p className="text-[9px] text-[var(--muted)]">Facebook Page</p>
                    </div>
                  </a>

                  <a href="mailto:bookmyturfbd@gmail.com" className="flex items-center gap-2.5 group">
                    <div className="w-7 h-7 rounded-lg bg-red-500/15 flex items-center justify-center border border-red-500/25 shrink-0">
                      <Mail size={12} className="text-red-400" />
                    </div>
                    <div>
                      <p className="text-[11px] font-black text-white/80 group-hover:text-red-400 transition-colors">bookmyturfbd@gmail.com</p>
                      <p className="text-[9px] text-[var(--muted)]">Email Us</p>
                    </div>
                  </a>
                </div>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-white/8" />
                <span className="text-[9px] font-black uppercase tracking-widest text-[var(--muted)]">{t('orFillForm')}</span>
                <div className="flex-1 h-px bg-white/8" />
              </div>

              {success ? (
                /* ── Success State ── */
                <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                    <CheckCircle2 size={32} className="text-emerald-400" />
                  </div>
                  <div>
                    <p className="font-black text-white text-lg">{t('requestSent')}</p>
                    <p className="text-sm text-[var(--muted)] mt-1">
                      {t('requestSentDesc')}
                    </p>
                  </div>
                  <button
                    onClick={handleClose}
                    className="px-6 py-2.5 bg-accent text-black font-black rounded-xl text-sm hover:brightness-110 transition-all"
                  >
                    {t('doneBtn')}
                  </button>
                </div>
              ) : (
                /* ── Form Fields ── */
                <div className="flex flex-col gap-3.5">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)] block mb-1.5">
                      {t('fullName')} <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Md. Rahim Uddin"
                      value={form.name}
                      onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                      className="w-full bg-neutral-900 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white placeholder:text-white/20 focus:outline-none focus:border-accent transition-colors"
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
                      className="w-full bg-neutral-900 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white placeholder:text-white/20 focus:outline-none focus:border-accent transition-colors"
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
                      className="w-full bg-neutral-900 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white placeholder:text-white/20 focus:outline-none focus:border-accent transition-colors"
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
                      className="w-full bg-neutral-900 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white placeholder:text-white/20 focus:outline-none focus:border-accent transition-colors"
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
                      rows={3}
                      className="w-full bg-neutral-900 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white placeholder:text-white/20 focus:outline-none focus:border-accent transition-colors resize-none"
                    />
                  </div>

                  {error && (
                    <p className="text-xs text-red-400 font-bold bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-xl">
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
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
