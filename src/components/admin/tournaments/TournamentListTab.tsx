'use client';
import { useState, useEffect } from 'react';
import { Plus, Trophy, Calendar, Users, Loader2 } from 'lucide-react';
import CreateTournamentWizard from './CreateTournamentWizard';
import TournamentDetailsModal from './TournamentDetailsModal';

export default function TournamentListTab() {
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState<string | null>(null);

  const loadTournaments = async () => {
    try {
      const res = await fetch('/api/tournaments');
      const data = await res.json();
      if (data.success) {
        setTournaments(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTournaments();
  }, []);

  if (isCreating) {
    return <CreateTournamentWizard onCancel={() => setIsCreating(false)} onSuccess={() => { setIsCreating(false); loadTournaments(); }} />;
  }

  if (loading) {
    return <div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin text-accent" /></div>;
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex justify-between items-center mb-5 shrink-0">
        <h3 className="text-lg font-black uppercase tracking-wider">All Tournaments</h3>
        <button 
          onClick={() => setIsCreating(true)}
          className="bg-accent text-black font-black uppercase tracking-wider px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-white transition-colors text-sm"
        >
          <Plus size={16} />
          Create Tournament
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {tournaments.map(t => (
          <div 
            key={t.id} 
            onClick={() => setSelectedTournament(t.id)}
            className="bg-black/40 border border-white/5 rounded-2xl p-5 hover:border-accent/50 cursor-pointer transition-colors group flex flex-col"
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-neutral-800 flex items-center justify-center text-accent">
                  <Trophy size={20} />
                </div>
                <div>
                  <h4 className="font-black text-white group-hover:text-accent transition-colors">{t.name}</h4>
                  <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">{t.sport} • {t.formatType}</p>
                </div>
              </div>
              <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full \${
                t.status === 'ACTIVE' ? 'bg-[#00ff41]/20 text-[#00ff41]' :
                t.status === 'DRAFT' ? 'bg-neutral-800 text-neutral-400' :
                'bg-blue-500/20 text-blue-400'
              }`}>
                {t.status.replace('_', ' ')}
              </span>
            </div>

            <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between text-xs font-bold text-neutral-400">
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

        {tournaments.length === 0 && (
          <div className="col-span-full py-20 text-center flex flex-col items-center">
            <Trophy size={48} className="text-neutral-800 mb-4" />
            <p className="text-neutral-500 font-bold">No tournaments found.</p>
          </div>
        )}
      </div>

      {selectedTournament && (
        <TournamentDetailsModal 
          tournamentId={selectedTournament} 
          onClose={() => { setSelectedTournament(null); loadTournaments(); }} 
        />
      )}
    </div>
  );
}
