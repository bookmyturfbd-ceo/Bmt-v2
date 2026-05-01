'use client';
import { useState, useEffect } from 'react';
import { ShieldCheck, Mail, Wallet, Plus, Loader2 } from 'lucide-react';

export default function OrganizerListTab() {
  const [organizers, setOrganizers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInviting, setIsInviting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);

  const loadOrganizers = async () => {
    try {
      const res = await fetch('/api/organizers');
      const data = await res.json();
      if (data.success) {
        setOrganizers(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrganizers();
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
        alert(`Invite created! URL: \${data.data.inviteUrl}`);
        setIsInviting(false);
        setInviteEmail('');
      } else {
        alert(data.error);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setInviteLoading(false);
    }
  };

  if (loading) {
    return <div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin text-accent" /></div>;
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex justify-between items-center mb-5 shrink-0">
        <h3 className="text-lg font-black uppercase tracking-wider">Tournament Organizers</h3>
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
                Tournaments: <span className="text-white">{org._count.tournaments}</span>
              </div>
              <div className="flex items-center gap-1.5 text-accent font-black">
                <Wallet size={16} />
                <span>৳ {org.wallet?.balance || 0}</span>
              </div>
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
    </div>
  );
}
