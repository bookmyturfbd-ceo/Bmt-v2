'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link2, Copy, Check, RefreshCw, ChevronDown, Sparkles } from 'lucide-react';

export default function GenerateInviteCard() {
  const t = useTranslations('Admin.invite');

  const [contact, setContact] = useState('');
  const [role, setRole] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const generate = () => {
    if (!contact.trim()) { setError('Contact is required'); return; }
    if (!role) { setError('Please select a role'); return; }
    setError('');
    // Encode role + contact into token (base64) so invite-setup can read them
    // Replace with a signed JWT from your backend in production
    const payload = btoa(JSON.stringify({ role, contact, issued: Date.now() }));
    setGeneratedLink(`${window.location.origin}/en/invite-setup?token=${payload}`);
  };

  const copy = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(generatedLink);
      } else {
        // Fallback for non-HTTPS / Tailscale IP access
        const el = document.createElement('textarea');
        el.value = generatedLink;
        el.style.position = 'fixed';
        el.style.opacity = '0';
        document.body.appendChild(el);
        el.focus();
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Silent fail — user can manually select the text
    }
  };

  const reset = () => {
    setContact('');
    setRole('');
    setGeneratedLink('');
    setCopied(false);
    setError('');
  };

  return (
    <div className="glass-panel rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] overflow-hidden">
      {/* Card header stripe */}
      <div className="h-1 w-full bg-gradient-to-r from-accent/0 via-accent to-accent/0" />

      <div className="p-6 md:p-8">
        {/* Title */}
        <div className="flex items-start gap-4 mb-7">
          <div className="w-12 h-12 rounded-2xl bg-accent/10 border border-accent/25 flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(0,255,0,0.08)]">
            <Link2 size={22} className="text-accent" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white tracking-tight">{t('cardTitle')}</h2>
            <p className="text-sm text-neutral-500 mt-0.5">{t('cardSubtitle')}</p>
          </div>
        </div>

        {!generatedLink ? (
          <div className="flex flex-col gap-5">
            {/* Contact */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-neutral-400">{t('contactLabel')}</label>
              <input
                type="text"
                placeholder={t('contactPlaceholder')}
                value={contact}
                onChange={e => { setContact(e.target.value); setError(''); }}
                className="w-full bg-neutral-950/80 border border-white/8 rounded-xl px-4 py-3 text-sm text-white font-medium placeholder:text-neutral-600 outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all"
              />
            </div>

            {/* Role dropdown */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-neutral-400">{t('roleLabel')}</label>
              <div className="relative">
                <select
                  value={role}
                  onChange={e => { setRole(e.target.value); setError(''); }}
                  className="w-full appearance-none bg-neutral-950/80 border border-white/8 rounded-xl px-4 py-3 text-sm text-white font-medium outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all cursor-pointer"
                >
                  <option value="" disabled className="text-neutral-600 bg-neutral-900">{t('rolePlaceholder')}</option>
                  <option value="Turf Owner" className="bg-neutral-900">{t('roleTurfOwner')}</option>
                  <option value="Coach" className="bg-neutral-900">{t('roleCoach')}</option>
                </select>
                <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
              </div>
            </div>

            {/* Error */}
            {error && (
              <p className="text-[12px] font-semibold text-red-400 flex items-center gap-1.5">
                <span>⚠</span> {error}
              </p>
            )}

            {/* Generate button */}
            <button
              onClick={generate}
              className="mt-2 w-full bg-accent text-black font-black py-3.5 rounded-xl hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(0,255,0,0.15)] text-sm tracking-wide"
            >
              <Sparkles size={16} className="stroke-[2.5]" />
              {t('generateBtn')}
            </button>
          </div>
        ) : (
          /* Success state */
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-2 bg-accent/8 border border-accent/25 rounded-2xl px-4 py-3">
              <Check size={16} className="text-accent shrink-0" />
              <span className="text-sm font-bold text-accent">{t('successLabel')}</span>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-neutral-400">Invite URL</label>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={generatedLink}
                  className="flex-1 bg-neutral-950 border border-white/8 rounded-xl px-4 py-3 text-sm text-accent/80 font-mono outline-none overflow-x-auto cursor-text select-all"
                />
                <button
                  onClick={copy}
                  className={`shrink-0 w-11 h-11 rounded-xl border flex items-center justify-center transition-all active:scale-95 ${
                    copied
                      ? 'bg-accent/15 border-accent/40 text-accent'
                      : 'bg-neutral-900 border-white/8 text-neutral-400 hover:text-white hover:border-white/20'
                  }`}
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>
              <p className="text-[11px] text-neutral-600 font-medium mt-0.5">
                Share this link with the invitee. It expires in 24 hours.
              </p>
            </div>

            <button
              onClick={reset}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-white/8 text-neutral-400 hover:text-white hover:border-white/20 text-sm font-semibold transition-all active:scale-[0.98]"
            >
              <RefreshCw size={15} />
              {t('newInviteBtn')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
