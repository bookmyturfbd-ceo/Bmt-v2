'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter, usePathname } from 'next/navigation';
import { Loader2, ArrowLeft, Users, Trophy, Play, GitMerge, Link as LinkIcon, AlertCircle, Calendar, Gavel, ChevronDown, ChevronUp, Shield } from 'lucide-react';
import dynamic from 'next/dynamic';
const AuctionOrganizerPanel = dynamic(() => import('@/components/admin/tournaments/AuctionOrganizerPanel'), { ssr: false });

export default function OrganizerTournamentDetails() {
  const params = useParams();
  const tournamentId = params?.id as string;
  const locale = (params?.locale as string) || 'en';
  const router = useRouter();

  const [tournament, setTournament] = useState<any>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'matches' | 'auction' | 'registrations'>('registrations');
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [tRes, mRes] = await Promise.all([
        fetch(`/api/tournaments/${tournamentId}`),
        fetch(`/api/tournaments/${tournamentId}/matches`)
      ]);
      const tData = await tRes.json();
      const mData = await mRes.json();
      
      if (tData.success) {
        setTournament(tData.data);
      } else {
        setFetchError(tData.error || 'Failed to fetch tournament data');
      }
      
      if (mData.success) {
        setMatches(mData.data);
      }
    } catch (e: any) {
      console.error(e);
      setFetchError(e.message || 'Network error fetching tournament');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tournamentId) {
      loadData();
    }
  }, [tournamentId]);

  const handleAction = async (endpoint: string) => {
    if (!tournamentId) return;
    setActionLoading(true);
    try {
      await fetch(`/api/tournaments/${tournamentId}/${endpoint}`, { method: 'POST' });
      await loadData();
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleGenerateScorerToken = async (matchId: string) => {
    try {
      const res = await fetch(`/api/t-matches/${matchId}/assign-scorer`, {
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

  if (!tournamentId || loading) {
    return <div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="animate-spin text-accent w-10 h-10" /></div>;
  }

  if (fetchError) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-4">
        <AlertCircle size={48} className="text-red-500 mb-4" />
        <h1 className="text-2xl font-black mb-2 text-center">Failed to Load Tournament</h1>
        <p className="text-neutral-400 text-center bg-black border border-red-500/20 p-4 rounded-xl font-mono text-sm max-w-lg break-words">
          {fetchError}
        </p>
        <button onClick={() => router.push(`/${locale}/organizer/dashboard`)} className="mt-6 px-6 py-3 bg-white text-black font-black uppercase rounded-xl hover:bg-neutral-200">
          Go Back
        </button>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-4">
        <AlertCircle size={48} className="text-yellow-500 mb-4" />
        <h1 className="text-2xl font-black mb-2 text-center">Tournament Not Found</h1>
        <p className="text-neutral-400 text-center">The tournament data could not be loaded or is null.</p>
        <button onClick={() => router.push(`/${locale}/organizer/dashboard`)} className="mt-6 px-6 py-3 bg-white text-black font-black uppercase rounded-xl hover:bg-neutral-200">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <header className="bg-black border-b border-white/5 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-4">
          <button onClick={() => router.push(`/${locale}/organizer/dashboard`)} className="p-2 hover:bg-neutral-900 rounded-lg transition-colors text-neutral-400 hover:text-white">
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
          <div className="flex border-b border-white/5 shrink-0 overflow-x-auto [scrollbar-width:none]">
            <button
              onClick={() => setActiveTab('registrations')}
              className={`flex-1 min-w-[120px] py-3.5 text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                activeTab === 'registrations'
                  ? 'text-accent border-b-2 border-accent'
                  : 'text-neutral-500 hover:text-white'
              }`}
            >
              <Users size={14} /> Registered Teams
            </button>
            <button
              onClick={() => setActiveTab('matches')}
              className={`flex-1 min-w-[120px] py-3.5 text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                activeTab === 'matches'
                  ? 'text-accent border-b-2 border-accent'
                  : 'text-neutral-500 hover:text-white'
              }`}
            >
              <Calendar size={14} /> Match Schedule
            </button>
            {tournament.auctionEnabled && (
              <button
                onClick={() => setActiveTab('auction')}
                className={`flex-1 min-w-[120px] py-3.5 text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'auction'
                    ? 'text-yellow-400 border-b-2 border-yellow-400'
                    : 'text-neutral-500 hover:text-white'
                }`}
              >
                <Gavel size={14} /> Auction Room
              </button>
            )}
          </div>

          <div className="flex-1 p-6 overflow-y-auto">
            {activeTab === 'auction' && tournament.auctionEnabled ? (
              <AuctionOrganizerPanel tournamentId={String(tournamentId)} />
            ) : activeTab === 'registrations' ? (
              <>
                <h2 className="text-xl font-black uppercase tracking-wider mb-6">Registered Teams</h2>
                {(!tournament.registrations || tournament.registrations.length === 0) ? (
                  <div className="py-20 text-center flex flex-col items-center">
                    <Users size={48} className="text-neutral-800 mb-4" />
                    <p className="text-neutral-500 font-bold">No teams registered yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {tournament.registrations.map((r: any) => {
                      const isTeam = r.entityType === 'TEAM';
                      const entity = isTeam ? r.team : r.player;
                      if (!entity) return null; // data not loaded

                      const isExpanded = expandedTeam === r.id;

                      return (
                        <div key={r.id} className="bg-black/50 border border-white/5 rounded-xl overflow-hidden transition-all">
                          <button
                            onClick={() => setExpandedTeam(isExpanded ? null : r.id)}
                            className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors text-left"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-full bg-neutral-900 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                                {entity.logoUrl || entity.avatarUrl ? (
                                  <img src={entity.logoUrl || entity.avatarUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <Shield size={20} className="text-neutral-500" />
                                )}
                              </div>
                              <div>
                                <h3 className="font-black text-lg text-white leading-tight">
                                  {entity.name || entity.fullName}
                                </h3>
                                <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mt-0.5 flex items-center gap-2">
                                  <span>{isTeam ? 'Team' : 'Player'}</span>
                                  {isTeam && <span>• Lvl {entity.level || 1}</span>}
                                  {isTeam && <span>• MMR {entity.footballMmr || entity.teamMmr}</span>}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${
                                r.entryFeePaid ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                              }`}>
                                {r.entryFeePaid ? 'Paid' : 'Unpaid'}
                              </span>
                              {isTeam && (
                                <div className="text-neutral-500 bg-neutral-900 w-8 h-8 rounded-full flex items-center justify-center">
                                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </div>
                              )}
                            </div>
                          </button>

                          {/* Expanded Player List */}
                          {isExpanded && isTeam && entity.members && (
                            <div className="p-4 pt-0 border-t border-white/5 bg-black/30">
                              <div className="mt-3 grid gap-2">
                                {entity.members.map((m: any) => (
                                  <div key={m.id} className="flex items-center justify-between bg-zinc-900/50 p-3 rounded-lg border border-white/5">
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-full bg-neutral-800 overflow-hidden flex items-center justify-center">
                                        {m.player?.avatarUrl ? (
                                          <img src={m.player.avatarUrl} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                          <Users size={14} className="text-neutral-500" />
                                        )}
                                      </div>
                                      <div>
                                        <p className="text-sm font-black text-white leading-tight">{m.player?.fullName}</p>
                                        <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider mt-0.5">
                                          {m.role} {m.sportRole ? `• ${m.sportRole}` : ''}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-xs font-black text-accent">{m.player?.footballMmr} MMR</div>
                                      <div className="text-[10px] text-neutral-500 font-bold">Lvl {m.player?.level}</div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
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
