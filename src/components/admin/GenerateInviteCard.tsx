'use client';
import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Link2, Copy, Check, RefreshCw, ChevronDown, Sparkles, Clock, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

type InviteRecord = {
  id: string;
  contact: string;
  role: string;
  issuedAt: string;
  expiresAt: string;
  usedAt: string | null;
};

function InviteStatusBadge({ invite }: { invite: InviteRecord }) {
  if (invite.usedAt) {
    return (
      <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-400/10 border border-emerald-400/30 px-2 py-0.5 rounded-full">
        <CheckCircle2 size={10} /> Registered
      </span>
    );
  }
  if (new Date() > new Date(invite.expiresAt)) {
    return (
      <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-red-400 bg-red-400/10 border border-red-400/30 px-2 py-0.5 rounded-full">
        <XCircle size={10} /> Expired
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-yellow-400 bg-yellow-400/10 border border-yellow-400/30 px-2 py-0.5 rounded-full">
      <Clock size={10} /> Pending
    </span>
  );
}

type Tab = 'generate' | 'pending';

export default function GenerateInviteCard() {
  const t = useTranslations('Admin.invite');
  const [tab, setTab] = useState<Tab>('generate');

  // Generate tab state
  const [contact, setContact] = useState('');
  const [role, setRole] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [generating, setGenerating] = useState(false);

  // Pending tab state
  const [invites, setInvites] = useState<InviteRecord[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(false);

  const fetchInvites = async () => {
    setLoadingInvites(true);
    try {
      const res = await fetch('/api/admin/invites');
      const data = await res.json();
      if (res.ok) setInvites(data.invites);
    } finally {
      setLoadingInvites(false);
    }
  };

  useEffect(() => {
    if (tab === 'pending') fetchInvites();
  }, [tab]);

  const generate = async () => {
    if (!contact.trim()) { setError('Contact is required'); return; }
    if (!role) { setError('Please select a role'); return; }
    setError('');
    setGenerating(true);
    try {
      const res = await fetch('/api/admin/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact: contact.trim(), role }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to generate invite'); setGenerating(false); return; }
      setGeneratedLink(`${window.location.origin}/en/invite-setup?token=${data.token}`);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const copy = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(generatedLink);
      } else {
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
    } catch { /* Silent fail */ }
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
        {/* Title + Tab Toggle */}
        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-accent/10 border border-accent/25 flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(0,255,0,0.08)]">
            <Link2 size={22} className="text-accent" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-black text-white tracking-tight">{t('cardTitle')}</h2>
            <p className="text-sm text-neutral-500 mt-0.5">{t('cardSubtitle')}</p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-1 p-1 bg-neutral-950/60 rounded-xl border border-white/6 mb-6">
          {(['generate', 'pending'] as Tab[]).map(tKey => (
            <button
              key={tKey}
              onClick={() => setTab(tKey)}
              className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
                tab === tKey
                  ? 'bg-accent text-black shadow-[0_2px_12px_rgba(0,255,0,0.2)]'
                  : 'text-neutral-500 hover:text-white'
              }`}
            >
              {tKey === 'generate' ? '+ Generate' : '⏳ Pending'}
            </button>
          ))}
        </div>

        {/* Generate Tab */}
        {tab === 'generate' && (
          !generatedLink ? (
            <div className="flex flex-col gap-5">
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

              {error && (
                <p className="text-[12px] font-semibold text-red-400 flex items-center gap-1.5">
                  <span>⚠</span> {error}
                </p>
              )}

              <button
                onClick={generate}
                disabled={generating}
                className="mt-2 w-full bg-accent text-black font-black py-3.5 rounded-xl hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(0,255,0,0.15)] text-sm tracking-wide disabled:opacity-60"
              >
                {generating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} className="stroke-[2.5]" />}
                {generating ? 'Generating…' : t('generateBtn')}
              </button>
            </div>
          ) : (
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
          )
        )}

        {/* Pending Tab */}
        {tab === 'pending' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold uppercase tracking-widest text-neutral-500">{invites.length} Invites</span>
              <button onClick={fetchInvites} className="text-xs text-neutral-500 hover:text-white flex items-center gap-1 transition-colors">
                <RefreshCw size={11} /> Refresh
              </button>
            </div>

            {loadingInvites ? (
              <div className="flex justify-center py-8">
                <Loader2 size={24} className="animate-spin text-accent" />
              </div>
            ) : invites.length === 0 ? (
              <div className="flex flex-col items-center py-10 gap-3 text-center">
                <Clock size={32} className="text-neutral-700" />
                <p className="text-sm text-neutral-600 font-medium">No invites generated yet.</p>
              </div>
            ) : (
              invites.map(inv => (
                <div key={inv.id} className="flex items-center justify-between gap-3 bg-neutral-950/60 border border-white/6 rounded-xl px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">{inv.contact}</p>
                    <p className="text-[11px] text-neutral-500 font-medium">{inv.role} · {new Date(inv.issuedAt).toLocaleDateString('en-BD', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  </div>
                  <InviteStatusBadge invite={inv} />
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
