'use client';
import { useState, useEffect, useRef } from 'react';
import { getCookie } from '@/lib/cookies';
import { Bell, User, KeyRound, Eye, EyeOff, X, Loader2, CheckCircle2 } from 'lucide-react';
import ThemeToggle from '@/components/ui/ThemeToggle';

/* ─── Profile / Change Password Modal ─── */
function ProfileModal({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<'profile' | 'password'>('profile');

  // Profile info (read-only email/phone, editable name)
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [phone, setPhone]       = useState('');
  const [savingName, setSavingName] = useState(false);
  const [nameSaved, setNameSaved]   = useState(false);
  const [nameErr, setNameErr]       = useState('');

  // Change password
  const [curPw, setCurPw]       = useState('');
  const [newPw, setNewPw]       = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwErr, setPwErr]       = useState('');
  const [pwOk, setPwOk]         = useState(false);

  const ownerId = getCookie('bmt_owner_id');

  useEffect(() => {
    setName(getCookie('bmt_name') || getCookie('bmt_owner_name') || '');
    setEmail(getCookie('bmt_owner_email') || '');
    setPhone(getCookie('bmt_owner_phone') || '');

    // Load from API for freshest data
    if (ownerId) {
      fetch('/api/bmt/owners')
        .then(r => r.json())
        .then((owners: any[]) => {
          if (Array.isArray(owners)) {
            const me = owners.find((o: any) => o.id === ownerId);
            if (me) {
              setName(me.name ?? '');
              setEmail(me.email ?? '');
              setPhone(me.phone ?? '');
            }
          }
        })
        .catch(() => {});
    }
  }, [ownerId]);

  const saveName = async () => {
    if (!name.trim()) { setNameErr('Name cannot be empty.'); return; }
    setNameErr(''); setSavingName(true);
    await fetch(`/api/bmt/owners/${ownerId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim() }),
    });
    setSavingName(false); setNameSaved(true);
    setTimeout(() => setNameSaved(false), 2000);
  };

  const changePassword = async () => {
    setPwErr('');
    if (!curPw || !newPw || !confirmPw) { setPwErr('All fields are required.'); return; }
    if (newPw.length < 6) { setPwErr('New password must be at least 6 characters.'); return; }
    if (newPw !== confirmPw) { setPwErr('New passwords do not match.'); return; }

    setPwLoading(true);
    const res = await fetch('/api/bmt/owner/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ownerId, currentPassword: curPw, newPassword: newPw }),
    });
    setPwLoading(false);
    if (res.ok) {
      setPwOk(true); setCurPw(''); setNewPw(''); setConfirmPw('');
      setTimeout(() => setPwOk(false), 3000);
    } else {
      const d = await res.json().catch(() => ({}));
      setPwErr(d.error || 'Current password is incorrect.');
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 mt-16 mr-4 w-full max-w-sm rounded-3xl border border-[var(--panel-border)] overflow-hidden shadow-2xl glass-panel">
        <div className="h-0.5" style={{ background: 'linear-gradient(90deg, transparent, #00ff41, transparent)' }} />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--panel-border)]">
          <div className="flex gap-1">
            {(['profile', 'password'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${tab === t ? 'bg-accent/15 text-accent border border-accent/30' : 'text-[var(--muted)] hover:text-foreground'}`}>
                {t === 'profile' ? 'Profile' : 'Change Password'}
              </button>
            ))}
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl border border-[var(--panel-border)] flex items-center justify-center hover:bg-[var(--panel-bg-hover)]">
            <X size={14} />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {tab === 'profile' ? (
            <>
              {/* Avatar placeholder */}
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
                  <User size={24} className="text-accent" />
                </div>
                <div>
                  <p className="font-black text-foreground">{name || '—'}</p>
                  <p className="text-xs text-[var(--muted)]">{email}</p>
                </div>
              </div>

              {/* Editable name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">Display Name</label>
                <input value={name} onChange={e => setName(e.target.value)}
                  className="w-full bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-xl px-4 py-2.5 text-sm font-bold text-foreground outline-none focus:border-accent/50 placeholder:text-[var(--muted)]"
                  placeholder="Your name" />
                {nameErr && <p className="text-xs text-red-400 font-bold">{nameErr}</p>}
                <button onClick={saveName} disabled={savingName}
                  className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-accent/10 border border-accent/30 text-accent text-xs font-black hover:bg-accent/20 transition-colors disabled:opacity-50">
                  {savingName ? <Loader2 size={12} className="animate-spin" /> : nameSaved ? <CheckCircle2 size={12} /> : null}
                  {nameSaved ? 'Saved!' : 'Save Name'}
                </button>
              </div>

              {/* Read-only fields */}
              <div className="flex flex-col gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">Email</label>
                  <div className="flex items-center gap-2 bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-xl px-4 py-2.5">
                    <span className="text-sm text-[var(--muted)]">{email || '—'}</span>
                    <span className="ml-auto text-[9px] font-black text-[var(--muted)] uppercase tracking-widest">Cannot change</span>
                  </div>
                </div>
                {phone && (
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">Phone</label>
                    <div className="flex items-center gap-2 bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-xl px-4 py-2.5">
                      <span className="text-sm text-[var(--muted)]">{phone}</span>
                      <span className="ml-auto text-[9px] font-black text-[var(--muted)] uppercase tracking-widest">Cannot change</span>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-1">
                <KeyRound size={16} className="text-accent" />
                <p className="font-black text-foreground text-sm">Change Password</p>
              </div>
              <div className="flex flex-col gap-2.5">
                {[
                  { val: curPw, set: setCurPw, label: 'Current Password', ph: 'Enter current password' },
                  { val: newPw, set: setNewPw, label: 'New Password', ph: 'Min. 6 characters' },
                  { val: confirmPw, set: setConfirmPw, label: 'Confirm New Password', ph: 'Repeat new password' },
                ].map(({ val, set, label, ph }) => (
                  <div key={label} className="flex flex-col gap-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">{label}</label>
                    <div className="relative">
                      <input type={showPw ? 'text' : 'password'} value={val} onChange={e => set(e.target.value)}
                        placeholder={ph}
                        className="w-full bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-xl px-4 py-2.5 pr-10 text-sm font-bold text-foreground outline-none focus:border-accent/50 placeholder:text-[var(--muted)]" />
                      <button onClick={() => setShowPw(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300">
                        {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                ))}

                {pwErr && <p className="text-xs text-red-400 font-bold">{pwErr}</p>}
                {pwOk && <p className="text-xs text-accent font-bold flex items-center gap-1"><CheckCircle2 size={12} /> Password changed successfully!</p>}

                <button onClick={changePassword} disabled={pwLoading}
                  className="w-full py-3 rounded-2xl bg-accent text-black font-black text-sm hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 shadow-[0_4px_20px_rgba(0,255,65,0.2)] flex items-center justify-center gap-2">
                  {pwLoading ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
                  {pwLoading ? 'Updating…' : 'Update Password'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Main Header ─── */
export default function OwnerHeader() {
  const [showProfile, setShowProfile] = useState(false);
  const [ownerName, setOwnerName]     = useState('');
  const [initials, setInitials]       = useState('O');

  useEffect(() => {
    const name = getCookie('bmt_name') || getCookie('bmt_owner_name') || 'Owner';
    setOwnerName(name);
    setInitials(name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2));
  }, []);

  return (
    <>
      <header className="sticky top-0 z-40 glass-panel border-b border-[var(--panel-border)] px-5 py-3 flex items-center justify-between gap-4">
        <div className="ml-10 md:ml-0 flex flex-col leading-none">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">Owner Dashboard</span>
          <h1 className="text-base font-black tracking-tight">My Turfs</h1>
        </div>

        <div className="flex items-center gap-2.5">
          <ThemeToggle />

          <button className="relative w-9 h-9 glass-panel rounded-xl flex items-center justify-center hover:border-accent/30 transition-colors">
            <Bell size={16} className="text-[var(--muted)]" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-background" />
          </button>

          {/* Owner profile avatar — initials, no fake photo */}
          <button onClick={() => setShowProfile(s => !s)}
            className="flex items-center gap-2 glass-panel rounded-xl px-2.5 py-1.5 hover:border-accent/30 transition-colors">
            <div className="w-7 h-7 rounded-lg bg-accent/15 border border-accent/30 flex items-center justify-center shrink-0">
              <span className="text-[10px] font-black text-accent">{initials}</span>
            </div>
            <div className="hidden sm:flex flex-col leading-none">
              <span className="text-[11px] font-black text-foreground">{ownerName}</span>
              <span className="text-[9px] text-[var(--muted)] font-bold uppercase tracking-widest">Owner</span>
            </div>
          </button>
        </div>
      </header>

      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
    </>
  );
}
