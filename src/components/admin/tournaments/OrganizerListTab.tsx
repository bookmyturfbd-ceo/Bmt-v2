'use client';
import { useState, useEffect } from 'react';
import {
  ShieldCheck, Mail, Wallet, Plus, Loader2, Trash2,
  ChevronRight, ChevronDown, Trophy, Users, Banknote, Check, Copy
} from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  DRAFT:             'bg-neutral-700 text-neutral-300',
  REGISTRATION_OPEN: 'bg-blue-500/20 text-blue-400',
  ACTIVE:            'bg-[#00ff41]/20 text-[#00ff41]',
  COMPLETED:         'bg-purple-500/20 text-purple-400',
  CANCELLED:         'bg-red-500/20 text-red-400',
};

export default function OrganizerListTab() {
  const [organizers, setOrganizers] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'active' | 'pending'>('active');
  const [loading, setLoading] = useState(true);
  const [isInviting, setIsInviting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [chargingOrganizer, setChargingOrganizer] = useState<any>(null);
  const [chargeAmount, setChargeAmount] = useState('');
  const [chargeLoading, setChargeLoading] = useState(false);
  const [publishForFreeLocal, setPublishForFreeLocal] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingOrganizer, setDeletingOrganizer] = useState<any>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const copyToClipboard = (text: string, id: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => { setCopiedId(id); setTimeout(() => setCopiedId(null), 2000); });
    } else {
      const el = document.createElement('textarea');
      el.value = text; el.style.position = 'fixed'; el.style.opacity = '0';
      document.body.appendChild(el); el.focus(); el.select();
      document.execCommand('copy'); document.body.removeChild(el);
      setCopiedId(id); setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const loadOrganizers = async () => {
    const res = await fetch('/api/organizers');
    const data = await res.json();
    if (data.success) setOrganizers(data.data);
  };

  const loadInvites = async () => {
    const res = await fetch('/api/organizers/invite');
    const data = await res.json();
    if (data.success) setInvites(data.data.filter((inv: any) => inv.status === 'PENDING'));
  };

  useEffect(() => {
    Promise.all([loadOrganizers(), loadInvites()]).finally(() => setLoading(false));
  }, []);

  const handleInvite = async () => {
    if (!inviteEmail) return;
    setInviteLoading(true);
    const res = await fetch('/api/organizers/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailOrPhone: inviteEmail, invitedBy: 'super_admin' }),
    });
    const data = await res.json();
    if (data.success) { setIsInviting(false); setInviteEmail(''); setActiveTab('pending'); loadInvites(); }
    else alert(data.error);
    setInviteLoading(false);
  };

  const handleToggleBan = async (org: any) => {
    const newStatus = org.banStatus === 'none' ? 'perma' : 'none';
    if (!confirm(newStatus === 'perma' ? `Ban ${org.name}?` : `Unban ${org.name}?`)) return;
    const res = await fetch(`/api/organizers/${org.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ banStatus: newStatus }) });
    const data = await res.json();
    if (data.success) loadOrganizers(); else alert(data.error);
  };

  const handleRevokeInvite = async (inviteId: string) => {
    if (!confirm('Revoke this invite?')) return;
    const res = await fetch(`/api/organizers/invite?id=${inviteId}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) loadInvites(); else alert(data.error);
  };

  const handleSaveCharge = async () => {
    if (!chargingOrganizer) return;
    setChargeLoading(true);
    const res = await fetch(`/api/organizers/${chargingOrganizer.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        chargePerTournament: parseInt(chargeAmount) || 0,
        publishForFree: publishForFreeLocal
      }),
    });
    const data = await res.json();
    if (data.success) { setChargingOrganizer(null); loadOrganizers(); } else alert(data.error);
    setChargeLoading(false);
  };

  const handleDeleteOrganizer = async () => {
    if (!deletingOrganizer) return;
    setDeleteLoading(true);
    const res = await fetch(`/api/organizers/${deletingOrganizer.id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) { setDeletingOrganizer(null); loadOrganizers(); } else alert(data.error);
    setDeleteLoading(false);
  };

  const toggle = (id: string) => setExpanded(prev => {
    const s = new Set(prev);
    s.has(id) ? s.delete(id) : s.add(id);
    return s;
  });

  if (loading) return <div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin text-accent" /></div>;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center mb-5 shrink-0">
        <div className="flex gap-4 border-b border-white/10 pb-2">
          <button onClick={() => setActiveTab('active')} className={`text-lg font-black uppercase tracking-wider transition-colors ${activeTab === 'active' ? 'text-white border-b-2 border-accent pb-1' : 'text-neutral-500 hover:text-white'}`}>
            Active Organizers
          </button>
          <button onClick={() => setActiveTab('pending')} className={`text-lg font-black uppercase tracking-wider transition-colors ${activeTab === 'pending' ? 'text-white border-b-2 border-accent pb-1' : 'text-neutral-500 hover:text-white'}`}>
            Pending Invites
          </button>
        </div>
        <button onClick={() => setIsInviting(true)} className="bg-accent text-black font-black uppercase tracking-wider px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-white transition-colors text-sm">
          <Mail size={16} /> Invite Organizer
        </button>
      </div>

      {/* Invite form */}
      {isInviting && (
        <div className="mb-6 p-6 bg-black/40 border border-accent/30 rounded-2xl shrink-0">
          <h4 className="font-black uppercase tracking-widest text-sm mb-4">Send Invite Link</h4>
          <div className="flex gap-4">
            <input type="text" placeholder="Email or Phone Number" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
              className="flex-1 bg-neutral-900 border border-white/10 rounded-xl p-3 font-bold" />
            <button onClick={handleInvite} disabled={inviteLoading} className="bg-accent text-black font-black uppercase px-6 rounded-xl hover:bg-white transition-colors flex items-center gap-2">
              {inviteLoading ? <Loader2 size={18} className="animate-spin" /> : <><Plus size={18} /> Generate Invite</>}
            </button>
            <button onClick={() => setIsInviting(false)} className="px-6 rounded-xl hover:bg-neutral-800 transition-colors font-bold text-neutral-400">Cancel</button>
          </div>
        </div>
      )}

      {/* Active Organizers — LIST view */}
      {activeTab === 'active' && (
        <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-1">
          {organizers.length === 0 ? (
            <div className="py-20 text-center flex flex-col items-center">
              <ShieldCheck size={48} className="text-neutral-800 mb-4" />
              <p className="text-neutral-500 font-bold">No organizers found. Invite one to get started.</p>
            </div>
          ) : organizers.map(org => {
            const isOpen = expanded.has(org.id);
            const activeTourneys = (org.tournaments || []).filter((t: any) =>
              ['REGISTRATION_OPEN', 'ACTIVE', 'DRAFT'].includes(t.status)
            );
            return (
              <div key={org.id} className="bg-black/40 border border-white/5 rounded-2xl overflow-hidden">
                {/* Row */}
                <button
                  onClick={() => toggle(org.id)}
                  className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.02] transition-colors text-left"
                >
                  <div className="w-9 h-9 rounded-full bg-neutral-800 flex items-center justify-center text-accent shrink-0">
                    <ShieldCheck size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-black text-white">{org.name}</p>
                      <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${org.banStatus === 'none' ? 'bg-[#00ff41]/10 text-[#00ff41]' : 'bg-red-500/20 text-red-400'}`}>
                        {org.banStatus === 'none' ? 'Active' : 'Banned'}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500 truncate">{org.email} · Joined {new Date(org.joinedAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right hidden sm:block">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-500">Tournaments</p>
                      <p className="text-sm font-black text-white">{org._count?.tournaments ?? 0}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-500">Wallet</p>
                      <p className="text-sm font-black text-accent">৳{org.wallet?.balance ?? 0}</p>
                    </div>
                    <div className="text-right hidden sm:block">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-500">Charge/Trn</p>
                      <p className="text-sm font-black text-white">
                        {org.publishForFree ? (
                          <span className="text-accent text-xs">FREE</span>
                        ) : (
                          `৳${org.chargePerTournament ?? 0}`
                        )}
                      </p>
                    </div>
                    {isOpen ? <ChevronDown size={16} className="text-neutral-400" /> : <ChevronRight size={16} className="text-neutral-400" />}
                  </div>
                </button>

                {/* Expanded detail */}
                {isOpen && (
                  <div className="border-t border-white/5 px-5 py-4 flex flex-col gap-4">
                    {/* Active Tournaments */}
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2 flex items-center gap-1.5">
                        <Trophy size={11} /> Active Tournaments ({activeTourneys.length})
                      </p>
                      {activeTourneys.length === 0 ? (
                        <p className="text-xs text-neutral-600 italic">No active tournaments.</p>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {activeTourneys.map((t: any) => (
                            <div key={t.id} className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-black text-white truncate">{t.name}</p>
                                <div className="flex items-center gap-3 mt-0.5">
                                  <span className="text-[10px] text-neutral-500 flex items-center gap-1"><Users size={9} />{t._count?.registrations ?? 0}/{t.maxParticipants}</span>
                                  {t.entryFee > 0 && <span className="text-[10px] text-yellow-400 flex items-center gap-1"><Banknote size={9} />৳{t.entryFee}</span>}
                                </div>
                              </div>
                              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${STATUS_COLORS[t.status] ?? 'bg-neutral-800 text-neutral-400'} border-white/10`}>
                                {t.status.replace(/_/g, ' ')}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Actions row */}
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5">
                      <button
                        onClick={() => {
                          setChargingOrganizer(org);
                          setChargeAmount(org.chargePerTournament?.toString() || '0');
                          setPublishForFreeLocal(org.publishForFree ?? false);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 text-xs font-bold uppercase tracking-wider hover:bg-neutral-700 transition-colors"
                      >
                        <Wallet size={12} /> Set Charge
                      </button>
                      <button
                        onClick={() => handleToggleBan(org)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${org.banStatus === 'none' ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20' : 'bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20'}`}
                      >
                        {org.banStatus === 'none' ? 'Ban' : 'Unban'}
                      </button>
                      <button
                        onClick={() => setDeletingOrganizer(org)}
                        className="flex items-center gap-1.5 ml-auto px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-red-900/30 text-red-400 hover:bg-red-900/50 border border-red-500/20 transition-colors"
                      >
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pending Invites */}
      {activeTab === 'pending' && (
        <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-3">
          {invites.map(inv => {
            const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
            const locale = typeof window !== 'undefined' ? window.location.pathname.split('/')[1] || 'en' : 'en';
            const inviteUrl = `${baseUrl}/${locale}/organizer-signup/${inv.inviteToken}`;
            return (
              <div key={inv.id} className="bg-black/40 border border-white/5 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center text-accent shrink-0"><Mail size={18} /></div>
                  <div className="min-w-0">
                    <h4 className="font-black text-white truncate text-sm">{inv.emailOrPhone}</h4>
                    <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mt-0.5">Expires {new Date(inv.expiresAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                  <div className="hidden lg:block text-[10px] font-mono text-neutral-400 bg-neutral-900 px-3 py-1.5 rounded-lg border border-white/5 max-w-[250px] truncate">{inviteUrl}</div>
                  <button onClick={() => copyToClipboard(inviteUrl, inv.id)} className={`flex-1 sm:flex-none text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-colors flex items-center gap-1.5 ${copiedId === inv.id ? 'bg-green-500 text-black' : 'bg-accent text-black hover:bg-white'}`}>
                    {copiedId === inv.id ? <><Check size={12} /> Copied!</> : <><Copy size={12} /> Copy Link</>}
                  </button>
                  <button onClick={() => handleRevokeInvite(inv.id)} className="flex-1 sm:flex-none text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-colors">Revoke</button>
                </div>
              </div>
            );
          })}
          {invites.length === 0 && (
            <div className="col-span-full py-20 text-center flex flex-col items-center">
              <Mail size={48} className="text-neutral-800 mb-4" />
              <p className="text-neutral-500 font-bold">No pending invites.</p>
            </div>
          )}
        </div>
      )}

      {/* Delete confirm modal */}
      {deletingOrganizer && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-red-500/30 p-6 rounded-2xl max-w-sm w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-500"><Trash2 size={20} /></div>
              <h3 className="text-lg font-black uppercase tracking-wider text-red-400">Delete Organizer</h3>
            </div>
            <p className="text-sm text-neutral-300 mb-2">Are you sure you want to permanently delete <span className="text-white font-black">{deletingOrganizer.name}</span>?</p>
            <p className="text-xs text-red-400/80 mb-6">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeletingOrganizer(null)} className="flex-1 px-4 py-3 rounded-xl hover:bg-white/5 transition-colors font-bold text-neutral-400 uppercase text-sm tracking-wider">Cancel</button>
              <button onClick={handleDeleteOrganizer} disabled={deleteLoading} className="flex-1 bg-red-600 text-white font-black uppercase tracking-wider px-4 py-3 rounded-xl hover:bg-red-500 transition-colors flex justify-center items-center gap-2 text-sm">
                {deleteLoading ? <Loader2 size={18} className="animate-spin" /> : <><Trash2 size={16} /> Delete</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Set Charge modal */}
      {chargingOrganizer && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-white/10 p-6 rounded-2xl max-w-sm w-full">
            <h3 className="text-lg font-black uppercase tracking-wider mb-2">Set Tournament Charge</h3>
            <p className="text-xs text-neutral-400 mb-6">Charge <span className="text-white font-bold">{chargingOrganizer.name}</span> automatically when they create a new tournament.</p>
            <div className="mb-6">
              <label className="block text-xs font-black uppercase tracking-widest text-neutral-400 mb-2">Amount (Taka)</label>
              <input type="number" value={chargeAmount} onChange={e => setChargeAmount(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl p-3 font-bold text-xl mb-4" />
              
              <label className="flex items-center gap-3 bg-black/30 border border-white/5 p-4 rounded-xl cursor-pointer hover:border-accent/30 transition-colors">
                <input
                  type="checkbox"
                  checked={publishForFreeLocal}
                  onChange={e => setPublishForFreeLocal(e.target.checked)}
                  className="w-5 h-5 accent-[#00ff41]"
                />
                <div>
                  <p className="font-black text-xs text-white uppercase tracking-wider">Publish For Free</p>
                  <p className="text-[10px] text-neutral-500 mt-0.5 font-bold">Organizers can publish tournaments without charge</p>
                </div>
              </label>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setChargingOrganizer(null)} className="flex-1 px-4 py-3 rounded-xl hover:bg-white/5 transition-colors font-bold text-neutral-400 uppercase text-sm tracking-wider">Cancel</button>
              <button onClick={handleSaveCharge} disabled={chargeLoading} className="flex-1 bg-accent text-black font-black uppercase tracking-wider px-4 py-3 rounded-xl hover:bg-white transition-colors flex justify-center items-center gap-2 text-sm">
                {chargeLoading ? <Loader2 size={18} className="animate-spin" /> : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
