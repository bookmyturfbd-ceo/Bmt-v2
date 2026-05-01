'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, ArrowLeft, Users, Trophy, Play, GitMerge, Link as LinkIcon, AlertCircle, Calendar, Gavel } from 'lucide-react';
import dynamic from 'next/dynamic';
const AuctionOrganizerPanel = dynamic(() => import('@/components/admin/tournaments/AuctionOrganizerPanel'), { ssr: false });

export default function OrganizerTournamentDetails() {
  const { id: tournamentId } = useParams();
  const router = useRouter();

  const [tournament, setTournament] = useState<any>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'matches' | 'auction'>('matches');

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

  const handleGenerateScorerToken = async (matchId: string) => {
    try {
      const res = await fetch(`/api/t-matches/\${matchId}/assign-scorer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email_or_phone: 'organizer_generated' })
      });
      const data = await res.json();
      if (data.success) {
        // Copy to clipboard
        navigator.clipboard.writeText(data.data.url);
        alert('Scorer link generated and copied to clipboard! Send this to the scorer device.');
        await loadData();
      } else {
        alert(data.error);
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="animate-spin text-accent w-10 h-10" /></div>;
  }

  if (!tournament) return null;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <header className="bg-black border-b border-white/5 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-4">
          <button onClick={() => router.push('/organizer/dashboard')} className="p-2 hover:bg-neutral-900 rounded-lg transition-colors text-neutral-400 hover:text-white">
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <h1 className="font-black text-sm uppercase tracking-widest truncate">{tournament.name}</h1>
          </div>
          <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full shrink-0 \${
            tournament.status === 'ACTIVE' ? 'bg-[#00ff41]/20 text-[#00ff41]' :
            tournament.status === 'DRAFT' ? 'bg-neutral-800 text-neutral-400' :
            'bg-blue-500/20 text-blue-400'
          }`}>
            {tournament.status.replace('_', ' ')}
          </span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row gap-8">
        
        {/* Left Column: Details & Actions */}
        <div className="w-full md:w-80 flex flex-col gap-6 shrink-0">
          <div className="bg-neutral-900 border border-white/5 rounded-2xl p-6">
            <h2 className="text-xl font-black uppercase tracking-wider mb-4">Details</h2>
            <div className="space-y-4 text-sm font-bold text-neutral-400">
              <div className="flex justify-between">
                <span>Sport</span>
                <span className="text-white flex items-center gap-2"><Trophy size={14} /> {tournament.sport}</span>
              </div>
              <div className="flex justify-between">
                <span>Format</span>
                <span className="text-white">{tournament.formatType}</span>
              </div>
              <div className="flex justify-between">
                <span>Registration</span>
                <span className="text-white">{tournament.registrationType}</span>
              </div>
              <div className="flex justify-between">
                <span>Participants</span>
                <span className="text-white">{tournament._count.registrations} / {tournament.maxParticipants}</span>
              </div>
            </div>
          </div>

          <div className="bg-accent/5 border border-accent/20 rounded-2xl p-6">
            <h2 className="text-xl font-black uppercase tracking-wider mb-4 text-accent">Actions</h2>
            <div className="flex flex-col gap-3">
              {tournament.status === 'DRAFT' && (
                <button onClick={() => handleAction('open-registration')} disabled={actionLoading} className="w-full bg-accent text-black font-black uppercase tracking-wider px-4 py-3 rounded-xl text-sm hover:bg-white transition-colors">
                  Open Registration
                </button>
              )}
              {tournament.status === 'REGISTRATION_OPEN' && (
                <button onClick={() => handleAction('close-registration')} disabled={actionLoading} className="w-full bg-white text-black font-black uppercase tracking-wider px-4 py-3 rounded-xl text-sm hover:bg-neutral-200 transition-colors">
                  Close Registration
                </button>
              )}
              {tournament.status === 'DRAFTING' && tournament.formatType === 'GROUP_KNOCKOUT' && tournament.groups.length === 0 && (
                <button onClick={() => handleAction('groups/draw')} disabled={actionLoading} className="w-full bg-blue-500 text-white font-black uppercase tracking-wider px-4 py-3 rounded-xl text-sm hover:bg-blue-400 transition-colors flex items-center justify-center gap-2">
                  <Users size={16} /> Draw Groups
                </button>
              )}
              {tournament.status === 'DRAFTING' && (tournament.formatType !== 'GROUP_KNOCKOUT' || tournament.groups.length > 0) && (
                <button onClick={() => handleAction('generate-fixtures')} disabled={actionLoading} className="w-full bg-purple-500 text-white font-black uppercase tracking-wider px-4 py-3 rounded-xl text-sm hover:bg-purple-400 transition-colors flex items-center justify-center gap-2">
                  <GitMerge size={16} /> Generate Fixtures
                </button>
              )}
              {tournament.status === 'SCHEDULED' && (
                <button onClick={() => handleAction('activate')} disabled={actionLoading} className="w-full bg-[#00ff41] text-black font-black uppercase tracking-wider px-4 py-3 rounded-xl text-sm hover:bg-[#00cc33] transition-colors flex items-center justify-center gap-2">
                  <Play size={16} fill="currentColor" /> Activate
                </button>
              )}
              {tournament.status === 'ACTIVE' && (
                <div className="text-xs font-bold text-neutral-400 text-center flex items-center gap-2 justify-center p-2">
                  <AlertCircle size={14} /> Tournament is Live
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Matches / Auction */}
        <div className="flex-1 bg-neutral-900 border border-white/5 rounded-2xl overflow-hidden flex flex-col">
          {/* Tab toggle */}
          {tournament.auctionEnabled && (
            <div className="flex border-b border-white/5 shrink-0">
              <button
                onClick={() => setActiveTab('matches')}
                className={`flex-1 py-3.5 text-xs font-black uppercase tracking-widest transition-all ${
                  activeTab === 'matches'
                    ? 'text-accent border-b-2 border-accent'
                    : 'text-neutral-500 hover:text-white'
                }`}
              >
                Match Schedule
              </button>
              <button
                onClick={() => setActiveTab('auction')}
                className={`flex-1 py-3.5 text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'auction'
                    ? 'text-yellow-400 border-b-2 border-yellow-400'
                    : 'text-neutral-500 hover:text-white'
                }`}
              >
                <Gavel size={14} /> Auction Room
              </button>
            </div>
          )}

          <div className="flex-1 p-6 overflow-y-auto">
            {activeTab === 'auction' && tournament.auctionEnabled ? (
              <AuctionOrganizerPanel tournamentId={String(tournamentId)} />
            ) : (
              <>
                <h2 className="text-xl font-black uppercase tracking-wider mb-6">Match Schedule</h2>
                {matches.length === 0 ? (
                  <div className="py-20 text-center flex flex-col items-center">
                    <Calendar size={48} className="text-neutral-800 mb-4" />
                    <p className="text-neutral-500 font-bold">No matches scheduled yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {matches.map(m => (
                      <div key={m.id} className="bg-black/50 border border-white/5 hover:border-white/10 transition-colors rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2">
                            Match {m.matchNumber} • {m.stage}
                          </div>
                          <div className="font-bold text-lg">
                            {m.teamAId} <span className="text-accent text-sm mx-3">vs</span> {m.teamBId}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg ${
                            m.status === 'COMPLETED' ? 'bg-[#00ff41]/20 text-[#00ff41]' :
                            m.status === 'LIVE' ? 'bg-red-500/20 text-red-500' :
                            m.status === 'SCORER_ASSIGNED' ? 'bg-blue-500/20 text-blue-400' :
                            'bg-neutral-800 text-neutral-400'
                          }`}>
                            {m.status.replace('_', ' ')}
                          </span>
                          
                          {['SCHEDULED', 'SCORER_ASSIGNED'].includes(m.status) && tournament.status === 'ACTIVE' && (
                            <button 
                              onClick={() => handleGenerateScorerToken(m.id)}
                              className="p-2 bg-neutral-800 text-neutral-300 hover:text-accent hover:bg-neutral-700 rounded-lg transition-colors"
                              title="Copy Scorer Link"
                            >
                              <LinkIcon size={18} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

      </main>
    </div>
  );
}
