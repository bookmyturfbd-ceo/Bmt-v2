'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ShieldCheck, LogOut, Wallet, Trophy, Plus, Calendar, Users } from 'lucide-react';

export default function OrganizerDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [organizer, setOrganizer] = useState<any>(null);

  useEffect(() => {
    fetch('/api/organizers/me')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setOrganizer(data.data);
        } else {
          router.push('/organizer/login');
        }
      })
      .catch(() => router.push('/organizer/login'))
      .finally(() => setLoading(false));
  }, [router]);

  const handleLogout = async () => {
    // Basic logout: in a real app, hit an API to clear the cookie
    document.cookie = 'org_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    router.push('/organizer/login');
  };

  if (loading) {
    return <div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="animate-spin text-accent w-10 h-10" /></div>;
  }

  if (!organizer) return null;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <header className="bg-black border-b border-white/5 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h1 className="font-black text-sm uppercase tracking-widest">{organizer.name}</h1>
              <span className="text-[10px] text-neutral-500 font-bold uppercase">Organizer Portal</span>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 text-xs font-bold text-neutral-400 hover:text-white transition-colors">
            <LogOut size={16} /> Logout
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Wallet Banner */}
        <div className="bg-gradient-to-r from-accent/20 to-black border border-accent/30 rounded-2xl p-6 md:p-8 mb-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-accent/10 rounded-2xl flex items-center justify-center text-accent">
              <Wallet size={28} />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-accent mb-1">Wallet Balance</p>
              <h2 className="text-4xl font-black">৳ {organizer.wallet?.balance || 0}</h2>
            </div>
          </div>
          <div className="text-right max-w-sm">
            <p className="text-sm text-neutral-400 font-bold">Your wallet is charged ৳40 automatically when a tournament match goes LIVE. Contact Super Admin to top up.</p>
          </div>
        </div>

        {/* Tournaments Section */}
        <div className="flex justify-between items-end mb-6">
          <div>
            <h2 className="text-2xl font-black uppercase tracking-wider">Your Tournaments</h2>
            <p className="text-sm text-neutral-400 font-bold mt-1">Manage and score your active events</p>
          </div>
          {/* Note: Creating tournaments for organizers can either be self-serve or via Super Admin. We'll add a placeholder button. */}
          <button className="bg-white text-black font-black uppercase tracking-wider px-5 py-2.5 rounded-xl text-sm hover:bg-neutral-200 transition-colors flex items-center gap-2">
            <Plus size={16} /> New Tournament
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {organizer.tournaments.map((t: any) => (
            <div 
              key={t.id} 
              onClick={() => router.push(`/organizer/tournaments/\${t.id}`)}
              className="bg-black border border-white/5 rounded-2xl p-6 hover:border-accent/50 cursor-pointer transition-all hover:translate-y-[-2px] group"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-neutral-900 flex items-center justify-center text-accent">
                    <Trophy size={24} />
                  </div>
                </div>
                <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full \${
                  t.status === 'ACTIVE' ? 'bg-[#00ff41]/20 text-[#00ff41]' :
                  t.status === 'DRAFT' ? 'bg-neutral-800 text-neutral-400' :
                  'bg-blue-500/20 text-blue-400'
                }`}>
                  {t.status.replace('_', ' ')}
                </span>
              </div>
              
              <h3 className="text-lg font-black text-white group-hover:text-accent transition-colors mb-1">{t.name}</h3>
              <p className="text-xs text-neutral-400 font-bold uppercase tracking-wider mb-6">{t.sport} • {t.formatType}</p>

              <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs font-bold text-neutral-400">
                <div className="flex items-center gap-1.5">
                  <Users size={14} />
                  <span>{t._count.registrations} / {t.maxParticipants}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar size={14} />
                  <span>{new Date(t.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))}

          {organizer.tournaments.length === 0 && (
            <div className="col-span-full py-24 border border-dashed border-white/10 rounded-2xl text-center flex flex-col items-center">
              <Trophy size={48} className="text-neutral-800 mb-4" />
              <h3 className="text-xl font-black text-white mb-2">No Tournaments Yet</h3>
              <p className="text-neutral-500 font-bold">You haven't hosted any tournaments.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
