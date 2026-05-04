'use client';
import { useState, useEffect } from 'react';
import { ShieldCheck, Mail, Wallet, Plus, Loader2, Trash2 } from 'lucide-react';

export default function OrganizerListTab() {
  const [organizers, setOrganizers] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'active' | 'pending'>('active');
  const [loading, setLoading] = useState(true);
  const [isInviting, setIsInviting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [chargingOrganizer, setChargingOrganizer] = useState<any>(null);
  const [chargeAmount, setChargeAmount] = useState<string>('');
  const [chargeLoading, setChargeLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingOrganizer, setDeletingOrganizer] = useState<any>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const copyToClipboard = (text: string, id: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
      });
    } else {
      // HTTP fallback (e.g. Tailscale dev)
      const el = document.createElement('textarea');
      el.value = text;
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.focus();
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const loadOrganizers = async () => {
    try {
      const res = await fetch('/api/organizers');
      const data = await res.json();
      if (data.success) {
        setOrganizers(data.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadInvites = async () => {
    try {
      const res = await fetch('/api/organizers/invite');
      const data = await res.json();
      if (data.success) {
        setInvites(data.data.filter((inv: any) => inv.status === 'PENDING'));
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    Promise.all([loadOrganizers(), loadInvites()]).finally(() => setLoading(false));
  }, []);

  const handleInvite = async () => {
    if (!inviteEmail) return;
    setInviteLoading(true);
    try {
      const res = await fetch('/api/organizers/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailOrPhone: inviteEmail, invitedBy: 'super_admin' })
      });
      const data = await res.json();
      if (data.success) {
        setIsInviting(false);
        setInviteEmail('');
        setActiveTab('pending');
        loadInvites();
      } else {
        alert(data.error);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setInviteLoading(false);
    }
  };

  const handleToggleBan = async (org: any) => {
    const newStatus = org.banStatus === 'none' ? 'perma' : 'none';
    const confirmMsg = newStatus === 'perma' ? `Are you sure you want to ban ${org.name}? They will lose access to their panel.` : `Unban ${org.name}?`;
    if (!confirm(confirmMsg)) return;
    
    try {
      const res = await fetch(`/api/organizers/${org.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ banStatus: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        loadOrganizers();
      } else {
        alert(data.error);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    if (!confirm('Revoke this invite link? It will no longer be usable.')) return;
    try {
      const res = await fetch(`/api/organizers/invite?id=${inviteId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        loadInvites();
      } else {
        alert(data.error);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveCharge = async () => {
    if (!chargingOrganizer) return;
    setChargeLoading(true);
    try {
      const res = await fetch(`/api/organizers/${chargingOrganizer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chargePerTournament: parseInt(chargeAmount) || 0 })
      });
      const data = await res.json();
      if (data.success) {
        setChargingOrganizer(null);
        loadOrganizers();
      } else {
        alert(data.error);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setChargeLoading(false);
    }
  };

  const handleDeleteOrganizer = async () => {
    if (!deletingOrganizer) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/organizers/${deletingOrganizer.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setDeletingOrganizer(null);
        loadOrganizers();
      } else {
        alert(data.error);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return <div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin text-accent" /></div>;
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex justify-between items-center mb-5 shrink-0">
        <div className="flex gap-4 border-b border-white/10 pb-2">
          <button 
            onClick={() => setActiveTab('active')}
            className={`text-lg font-black uppercase tracking-wider transition-colors ${activeTab === 'active' ? 'text-white border-b-2 border-accent pb-1' : 'text-neutral-500 hover:text-white'}`}
          >
            Active Organizers
          </button>
          <button 
            onClick={() => setActiveTab('pending')}
            className={`text-lg font-black uppercase tracking-wider transition-colors ${activeTab === 'pending' ? 'text-white border-b-2 border-accent pb-1' : 'text-neutral-500 hover:text-white'}`}
          >
            Pending Invites
          </button>
        </div>
        <button 
          onClick={() => setIsInviting(true)}
          className="bg-accent text-black font-black uppercase tracking-wider px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-white transition-colors text-sm"
        >
          <Mail size={16} />
          Invite Organizer
        </button>
      </div>

      {isInviting && (
        <div className="mb-6 p-6 bg-black/40 border border-accent/30 rounded-2xl">
          <h4 className="font-black uppercase tracking-widest text-sm mb-4">Send Invite Link</h4>
          <div className="flex gap-4">
            <input 
              type="text" 
              placeholder="Email or Phone Number" 
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              className="flex-1 bg-neutral-900 border border-white/10 rounded-xl p-3 font-bold"
            />
            <button 
              onClick={handleInvite}
              disabled={inviteLoading}
              className="bg-accent text-black font-black uppercase px-6 rounded-xl hover:bg-white transition-colors flex items-center gap-2"
            >
              {inviteLoading ? <Loader2 size={18} className="animate-spin" /> : <><Plus size={18} /> Generate Invite</>}
            </button>
            <button onClick={() => setIsInviting(false)} className="px-6 rounded-xl hover:bg-neutral-800 transition-colors font-bold text-neutral-400">
              Cancel
            </button>
          </div>
        </div>
      )}

      {activeTab === 'active' && (
        <div className="flex-1 overflow-y-auto pr-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {organizers.map(org => (
            <div key={org.id} className="bg-black/40 border border-white/5 rounded-2xl p-5 flex flex-col">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-neutral-800 flex items-center justify-center text-accent shrink-0">
                  <ShieldCheck size={24} />
                </div>
                <div className="min-w-0">
                  <h4 className="font-black text-white truncate text-lg">{org.name}</h4>
                  <p className="text-xs text-neutral-400 font-bold truncate">{org.email}</p>
                  <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mt-1">
                    Joined {new Date(org.joinedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between">
                <div className="text-xs font-bold text-neutral-400 uppercase tracking-widest">
                  Tournaments: <span className="text-white">{org._count?.tournaments || 0}</span>
                </div>
                <div className="flex items-center gap-1.5 text-accent font-black">
                  <Wallet size={16} />
                  <span>৳ {org.wallet?.balance || 0}</span>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                <div className="text-xs font-bold text-neutral-400">
                  Charge/Trn: <span className="text-white">৳ {org.chargePerTournament || 0}</span>
                </div>
                <button 
                  onClick={() => { setChargingOrganizer(org); setChargeAmount(org.chargePerTournament?.toString() || '0'); }}
                  className="bg-neutral-800 text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg hover:bg-neutral-700 transition-colors"
                >
                  Set Charge
                </button>
              </div>

              <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                <div className="text-xs font-bold text-neutral-400">
                  Status: <span className={org.banStatus === 'none' ? 'text-green-500' : 'text-red-500'}>{org.banStatus === 'none' ? 'ACTIVE' : 'BANNED'}</span>
                </div>
                <button 
                  onClick={() => handleToggleBan(org)}
                  className={`text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg transition-colors ${org.banStatus === 'none' ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : 'bg-green-500/20 text-green-500 hover:bg-green-500/30'}`}
                >
                  {org.banStatus === 'none' ? 'Ban' : 'Unban'}
                </button>
              </div>

              <div className="mt-4 pt-4 border-t border-white/5 flex justify-end">
                <button
                  onClick={() => setDeletingOrganizer(org)}
                  className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg transition-colors bg-red-900/30 text-red-400 hover:bg-red-900/50 border border-red-500/20"
                >
                  <Trash2 size={13} />
                  Delete Organizer
                </button>
              </div>
            </div>
          ))}

          {organizers.length === 0 && !isInviting && (
            <div className="col-span-full py-20 text-center flex flex-col items-center">
              <ShieldCheck size={48} className="text-neutral-800 mb-4" />
              <p className="text-neutral-500 font-bold">No organizers found. Invite one to get started.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'pending' && (
        <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-3">
          {invites.map(inv => {
            const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
            const locale = typeof window !== 'undefined' ? window.location.pathname.split('/')[1] || 'en' : 'en';
            const inviteUrl = `${baseUrl}/${locale}/organizer-signup/${inv.inviteToken}`;
            
            return (
              <div key={inv.id} className="bg-black/40 border border-white/5 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center text-accent shrink-0">
                    <Mail size={18} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-black text-white truncate text-sm">{inv.emailOrPhone}</h4>
                    <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mt-0.5">
                      Expires {new Date(inv.expiresAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                  <div className="hidden lg:block text-[10px] font-mono text-neutral-400 bg-neutral-900 px-3 py-1.5 rounded-lg border border-white/5 max-w-[250px] truncate">
                    {inviteUrl}
                  </div>
                  <button 
                    onClick={() => copyToClipboard(inviteUrl, inv.id)}
                    className={`flex-1 sm:flex-none text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-colors ${copiedId === inv.id ? 'bg-green-500 text-black' : 'bg-accent text-black hover:bg-white'}`}
                  >
                    {copiedId === inv.id ? 'Copied!' : 'Copy Link'}
                  </button>
                  <button 
                    onClick={() => handleRevokeInvite(inv.id)}
                    className="flex-1 sm:flex-none text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-colors bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20"
                  >
                    Revoke
                  </button>
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

      {deletingOrganizer && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-red-500/30 p-6 rounded-2xl max-w-sm w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
                <Trash2 size={20} />
              </div>
              <h3 className="text-lg font-black uppercase tracking-wider text-red-400">Delete Organizer</h3>
            </div>
            <p className="text-sm text-neutral-300 mb-2">
              Are you sure you want to permanently delete <span className="text-white font-black">{deletingOrganizer.name}</span>?
            </p>
            <p className="text-xs text-red-400/80 mb-6">
              This action cannot be undone. All data associated with this organizer will be removed.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeletingOrganizer(null)}
                className="flex-1 px-4 py-3 rounded-xl hover:bg-white/5 transition-colors font-bold text-neutral-400 uppercase text-sm tracking-wider"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteOrganizer}
                disabled={deleteLoading}
                className="flex-1 bg-red-600 text-white font-black uppercase tracking-wider px-4 py-3 rounded-xl hover:bg-red-500 transition-colors flex justify-center items-center gap-2 text-sm"
              >
                {deleteLoading ? <Loader2 size={18} className="animate-spin" /> : <><Trash2 size={16} /> Delete</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {chargingOrganizer && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-white/10 p-6 rounded-2xl max-w-sm w-full">
            <h3 className="text-lg font-black uppercase tracking-wider mb-2">Set Tournament Charge</h3>
            <p className="text-xs text-neutral-400 mb-6">
              Set the amount to charge <span className="text-white font-bold">{chargingOrganizer.name}</span> automatically when they initiate a new tournament.
            </p>
            <div className="mb-6">
              <label className="block text-xs font-black uppercase tracking-widest text-neutral-400 mb-2">Amount (Taka)</label>
              <input 
                type="number" 
                value={chargeAmount}
                onChange={e => setChargeAmount(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-xl p-3 font-bold text-xl"
              />
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => setChargingOrganizer(null)}
                className="flex-1 px-4 py-3 rounded-xl hover:bg-white/5 transition-colors font-bold text-neutral-400 uppercase text-sm tracking-wider"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveCharge}
                disabled={chargeLoading}
                className="flex-1 bg-accent text-black font-black uppercase tracking-wider px-4 py-3 rounded-xl hover:bg-white transition-colors flex justify-center items-center gap-2 text-sm"
              >
                {chargeLoading ? <Loader2 size={18} className="animate-spin" /> : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
