'use client';
import { useState, useEffect } from 'react';
import { X, Loader2, Play, Users, Calendar, Trophy, GitMerge } from 'lucide-react';

export default function TournamentDetailsModal({ tournamentId, onClose }: { tournamentId: string, onClose: () => void }) {
  const [tournament, setTournament] = useState<any>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = async () => {
    try {
      const [tRes, mRes] = await Promise.all([
        fetch(`/api/tournaments/\${tournamentId}`),
        fetch(`/api/tournaments/\${tournamentId}/matches`)
      ]);
      const tData = await tRes.json();
      const mData = await mRes.json();
      
      if (tData.success) setTournament(tData.data);
      if (mData.success) setMatches(mData.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [tournamentId]);

  const handleAction = async (endpoint: string) => {
    setActionLoading(true);
    try {
      await fetch(`/api/tournaments/\${tournamentId}/\${endpoint}`, { method: 'POST' });
      await loadData();
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-accent w-10 h-10" />
      </div>
    );
  }

  if (!tournament) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex flex-col md:p-10 p-4">
      <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl flex-1 flex flex-col overflow-hidden max-w-6xl w-full mx-auto relative shadow-2xl">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-neutral-900 rounded-full hover:bg-red-500 hover:text-white transition-colors z-10">
          <X size={20} />
        </button>

        <div className="p-6 md:p-8 border-b border-white/5 bg-gradient-to-r from-neutral-900 to-black shrink-0">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-3 \${
                tournament.status === 'ACTIVE' ? 'bg-[#00ff41]/20 text-[#00ff41]' :
                tournament.status === 'DRAFT' ? 'bg-neutral-800 text-neutral-400' :
                'bg-blue-500/20 text-blue-400'
              }`}>
                {tournament.status.replace('_', ' ')}
              </span>
              <h2 className="text-2xl md:text-4xl font-black text-white">{tournament.name}</h2>
              <div className="flex gap-4 mt-3 text-sm font-bold text-neutral-400">
                <span className="flex items-center gap-1.5"><Trophy size={16} /> {tournament.sport} • {tournament.formatType}</span>
                <span className="flex items-center gap-1.5"><Users size={16} /> {tournament._count.registrations} / {tournament.maxParticipants} Registered</span>
              </div>
            </div>

            {/* Lifecycle Actions */}
            <div className="flex gap-3">
              {tournament.status === 'DRAFT' && (
                <button onClick={() => handleAction('open-registration')} disabled={actionLoading} className="bg-accent text-black font-black uppercase tracking-wider px-4 py-2 rounded-xl text-sm hover:bg-white transition-colors">
                  Open Registration
                </button>
              )}
              {tournament.status === 'REGISTRATION_OPEN' && (
                <button onClick={() => handleAction('close-registration')} disabled={actionLoading} className="bg-white text-black font-black uppercase tracking-wider px-4 py-2 rounded-xl text-sm hover:bg-neutral-200 transition-colors">
                  Close Registration
                </button>
              )}
              {tournament.status === 'DRAFTING' && tournament.formatType === 'GROUP_KNOCKOUT' && tournament.groups.length === 0 && (
                <button onClick={() => handleAction('groups/draw')} disabled={actionLoading} className="bg-blue-500 text-white font-black uppercase tracking-wider px-4 py-2 rounded-xl text-sm hover:bg-blue-400 transition-colors flex items-center gap-2">
                  <Users size={16} /> Draw Groups
                </button>
              )}
              {tournament.status === 'DRAFTING' && (tournament.formatType !== 'GROUP_KNOCKOUT' || tournament.groups.length > 0) && (
                <button onClick={() => handleAction('generate-fixtures')} disabled={actionLoading} className="bg-purple-500 text-white font-black uppercase tracking-wider px-4 py-2 rounded-xl text-sm hover:bg-purple-400 transition-colors flex items-center gap-2">
                  <GitMerge size={16} /> Generate Fixtures
                </button>
              )}
              {tournament.status === 'SCHEDULED' && (
                <button onClick={() => handleAction('activate')} disabled={actionLoading} className="bg-[#00ff41] text-black font-black uppercase tracking-wider px-4 py-2 rounded-xl text-sm hover:bg-[#00cc33] transition-colors flex items-center gap-2">
                  <Play size={16} fill="currentColor" /> Activate Tournament
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-8 flex gap-8">
          {/* Matches List */}
          <div className="flex-1">
            <h3 className="text-lg font-black uppercase tracking-widest mb-4 border-b border-white/10 pb-2">Matches ({matches.length})</h3>
            {matches.length === 0 ? (
              <p className="text-neutral-500 font-bold">No matches generated yet.</p>
            ) : (
              <div className="space-y-3">
                {matches.map(m => (
                  <div key={m.id} className="bg-neutral-900 border border-white/5 rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1">
                        Match {m.matchNumber} • {m.stage}
                      </div>
                      <div className="font-bold">
                        {m.teamAId} <span className="text-accent text-xs mx-2">vs</span> {m.teamBId}
                      </div>
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md \${
                      m.status === 'COMPLETED' ? 'bg-[#00ff41]/20 text-[#00ff41]' :
                      m.status === 'LIVE' ? 'bg-red-500/20 text-red-500' :
                      'bg-neutral-800 text-neutral-400'
                    }`}>
                      {m.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
