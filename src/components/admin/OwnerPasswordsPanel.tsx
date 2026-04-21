'use client';
import { useState, useEffect, useCallback } from 'react';
import { Search, KeyRound, Eye, EyeOff, CheckCircle2, RefreshCw, User } from 'lucide-react';

interface Owner { id: string; name?: string; contactPerson?: string; email: string; password?: string; }

export default function OwnerPasswordsPanel() {
  const [owners, setOwners]     = useState<Owner[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [editing, setEditing]   = useState<string | null>(null);
  const [newPw, setNewPw]       = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState<string | null>(null);
  const [error, setError]       = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const data = await fetch('/api/bmt/owners').then(r => r.json());
    setOwners(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = owners.filter(o => {
    const name = (o.name || o.contactPerson || '').toLowerCase();
    const email = o.email.toLowerCase();
    const q = search.toLowerCase();
    return name.includes(q) || email.includes(q);
  }).sort((a, b) => (a.name || a.contactPerson || a.email).localeCompare(b.name || b.contactPerson || b.email));

  const handleSave = async (owner: Owner) => {
    setError('');
    if (newPw.trim().length < 4) { setError('Password must be at least 4 characters.'); return; }
    setSaving(true);
    await fetch(`/api/bmt/owners/${owner.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: newPw.trim() }),
    });
    setSaving(false);
    setSaved(owner.id);
    setEditing(null);
    setNewPw('');
    setTimeout(() => setSaved(null), 2500);
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-black tracking-tight">Reset Owner Passwords</h2>
        <p className="text-sm text-[var(--muted)] mt-0.5">Find an owner by name and set a new login password on their behalf.</p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or email…"
          className="w-full bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-xl pl-9 pr-4 py-2.5 text-sm font-medium outline-none focus:border-accent/50 placeholder:text-neutral-600" />
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-[var(--muted)] py-10 justify-center">
          <RefreshCw size={16} className="animate-spin" /> Loading owners…
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center text-[var(--muted)]">
          <User size={28} className="mx-auto mb-3 opacity-40" />
          <p className="font-bold">No owners found</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(owner => {
            const displayName = owner.name || owner.contactPerson || 'Unnamed Owner';
            const isEditing = editing === owner.id;
            const isSaved   = saved   === owner.id;
            return (
              <div key={owner.id}
                className="glass-panel border border-[var(--panel-border)] rounded-2xl p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
                      <User size={15} className="text-accent" />
                    </div>
                    <div>
                      <p className="font-black text-sm">{displayName}</p>
                      <p className="text-[10px] text-[var(--muted)]">{owner.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isSaved && (
                      <span className="text-[10px] font-black text-accent flex items-center gap-1">
                        <CheckCircle2 size={11} /> Saved!
                      </span>
                    )}
                    {!isEditing ? (
                      <button onClick={() => { setEditing(owner.id); setNewPw(''); setError(''); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--panel-bg)] border border-[var(--panel-border)] text-xs font-bold hover:border-accent/40 hover:text-accent transition-all">
                        <KeyRound size={11} /> Reset Password
                      </button>
                    ) : (
                      <button onClick={() => { setEditing(null); setNewPw(''); setError(''); }}
                        className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold hover:bg-white/10 transition-all">
                        Cancel
                      </button>
                    )}
                  </div>
                </div>

                {isEditing && (
                  <div className="flex flex-col gap-2 pt-2 border-t border-white/5">
                    <div className="relative">
                      <input type={showPw ? 'text' : 'password'} value={newPw}
                        onChange={e => setNewPw(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSave(owner)}
                        placeholder="New password for this owner…"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 pr-11 text-sm font-bold outline-none focus:border-accent/50 placeholder:text-neutral-600" />
                      <button onClick={() => setShowPw(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300">
                        {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    {error && <p className="text-xs text-red-400 font-bold">{error}</p>}
                    <button onClick={() => handleSave(owner)} disabled={saving}
                      className="self-start flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent text-black font-black text-xs hover:brightness-110 active:scale-95 transition-all disabled:opacity-50">
                      {saving ? <RefreshCw size={11} className="animate-spin" /> : <KeyRound size={11} />}
                      {saving ? 'Saving…' : 'Set New Password'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
