'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter, usePathname } from 'next/navigation';
import { Loader2, ArrowLeft, Users, Trophy, Play, GitMerge, Link as LinkIcon, AlertCircle, Calendar, Gavel, ChevronDown, ChevronUp, Shield, Star } from 'lucide-react';
import dynamic from 'next/dynamic';
const AuctionOrganizerPanel = dynamic(() => import('@/components/admin/tournaments/AuctionOrganizerPanel'), { ssr: false });
import TournamentSponsorsTab from '@/components/admin/tournaments/TournamentSponsorsTab';
import { getSupabaseClient } from '@/lib/supabaseRealtime';

export default function OrganizerTournamentDetails() {
  const params = useParams();
  const tournamentId = params?.id as string;
  const locale = (params?.locale as string) || 'en';
  const router = useRouter();

  const [tournament, setTournament] = useState<any>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [standings, setStandings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'matches' | 'auction' | 'registrations' | 'sponsors' | 'standings'>('registrations');
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);

  // Build team name and logo map
  const teamNameMap: Record<string, string> = {};
  const teamLogoMap: Record<string, string> = {};
  if (tournament && tournament.registrations) {
    tournament.registrations.forEach((r: any) => {
      const isTeam = r.entityType === 'TEAM';
      const entity = isTeam ? r.team : r.player;
      if (entity) {
        teamNameMap[r.entityId] = entity.name || entity.fullName || '';
        if (entity.logoUrl || entity.avatarUrl) {
          teamLogoMap[r.entityId] = entity.logoUrl || entity.avatarUrl;
        }
      }
    });
  }

  // Build group name lookup
  const groupNames: Record<string, string> = {};
  if (tournament && tournament.groups) {
    tournament.groups.forEach((g: any) => { groupNames[g.id] = g.name; });
  }

  const getScore = (m: any, side: 'A' | 'B') => {
    if (!m.resultSummary) return null;
    const rs = m.resultSummary as any;
    if (tournament?.sport === 'FOOTBALL') {
      return side === 'A' ? rs.goalsA ?? 0 : rs.goalsB ?? 0;
    }
    if (tournament?.sport === 'CRICKET') {
      const runs = side === 'A' ? rs.runsA : rs.runsB;
      if (runs === undefined || runs === null) return null;
      const wickets = side === 'A' ? rs.wicketsA : rs.wicketsB;
      const overs = side === 'A' ? rs.oversA : rs.oversB;
      
      const w = wickets !== undefined && wickets !== null ? wickets : 0;
      if (overs === undefined || overs === null || overs === 0) {
        return `${runs}/${w}`;
      }
      const totalBalls = Math.round(overs * 6);
      return `${runs}/${w} (${Math.floor(totalBalls / 6)}.${totalBalls % 6} ov)`;
    }
    return null;
  };

  const loadData = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const [tRes, mRes, sRes] = await Promise.all([
        fetch(`/api/tournaments/${tournamentId}`),
        fetch(`/api/tournaments/${tournamentId}/matches`),
        fetch(`/api/tournaments/${tournamentId}/standings`)
      ]);
      const tData = await tRes.json();
      const mData = await mRes.json();
      const sData = await sRes.json();
      
      if (tData.success) {
        setTournament(tData.data);
      } else {
        setFetchError(tData.error || 'Failed to fetch tournament data');
      }
      
      if (mData.success) {
        setMatches(mData.data);
      }

      if (sData.success) {
        setStandings(sData.data || []);
      }
    } catch (e: any) {
      console.error(e);
      setFetchError(e.message || 'Network error fetching tournament');
    } finally {
      if (isInitial) setLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    if (tournamentId) {
      loadData(true);
    }
  }, [tournamentId, loadData]);

  useEffect(() => {
    if (!tournamentId) return;
    const supabase = getSupabaseClient();
    
    const ch = supabase.channel(`org-tournament-details:${tournamentId}`);
    ch
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tournament_matches' },
        (payload: any) => {
          const rec = payload.new || payload.old;
          if (rec && (rec.tournamentId === tournamentId || rec.tournament_id === tournamentId)) {
            loadData();
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tournament_standings' },
        (payload: any) => {
          const rec = payload.new || payload.old;
          if (rec && (rec.tournamentId === tournamentId || rec.tournament_id === tournamentId)) {
            loadData();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [tournamentId, loadData]);

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

  const handleFillTournament = async () => {
    if (!tournamentId) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/dev/fill-tournament', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tournamentId })
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message || 'Tournament registrations successfully filled!');
        await loadData();
      } else {
        alert('Failed to fill registrations: ' + data.error);
      }
    } catch (e) {
      console.error(e);
      alert('Network error trying to fill tournament.');
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
        // Construct the URL using window.location.origin to support Tailscale/localhost origins correctly
        const scorerUrl = `${window.location.origin}/${locale}/score/${data.data.token}`;
        navigator.clipboard.writeText(scorerUrl);
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
                <button onClick={() => handleAction('open-registration')} disabled={actionLoading} className="w-full bg-accent text-black font-black uppercase tracking-wider px-4 py-3 rounded-xl text-sm hover:bg-white transition-colors flex items-center justify-center gap-2">
                  {actionLoading ? <Loader2 className="animate-spin w-4 h-4" /> : 'Open Registration'}
                </button>
              )}
              {tournament.status === 'REGISTRATION_OPEN' && (
                <button onClick={() => handleAction('close-registration')} disabled={actionLoading} className="w-full bg-white text-black font-black uppercase tracking-wider px-4 py-3 rounded-xl text-sm hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2">
                  {actionLoading ? <Loader2 className="animate-spin w-4 h-4" /> : 'Close Registration'}
                </button>
              )}
              {tournament.status === 'DRAFTING' && tournament.formatType === 'GROUP_KNOCKOUT' && tournament.groups.length === 0 && (
                <button onClick={() => handleAction('groups/draw')} disabled={actionLoading} className="w-full bg-blue-500 text-white font-black uppercase tracking-wider px-4 py-3 rounded-xl text-sm hover:bg-blue-400 transition-colors flex items-center justify-center gap-2">
                  {actionLoading ? <Loader2 className="animate-spin w-4 h-4" /> : (
                    <>
                      <Users size={16} /> Draw Groups
                    </>
                  )}
                </button>
              )}
              {tournament.status === 'DRAFTING' && (tournament.formatType !== 'GROUP_KNOCKOUT' || tournament.groups.length > 0) && (
                <button onClick={() => handleAction('generate-fixtures')} disabled={actionLoading} className="w-full bg-purple-500 text-white font-black uppercase tracking-wider px-4 py-3 rounded-xl text-sm hover:bg-purple-400 transition-colors flex items-center justify-center gap-2">
                  {actionLoading ? <Loader2 className="animate-spin w-4 h-4" /> : (
                    <>
                      <GitMerge size={16} /> Generate Fixtures
                    </>
                  )}
                </button>
              )}
              {tournament.status === 'SCHEDULED' && (
                <button onClick={() => handleAction('activate')} disabled={actionLoading} className="w-full bg-[#00ff41] text-black font-black uppercase tracking-wider px-4 py-3 rounded-xl text-sm hover:bg-[#00cc33] transition-colors flex items-center justify-center gap-2">
                  {actionLoading ? <Loader2 className="animate-spin w-4 h-4" /> : (
                    <>
                      <Play size={16} fill="currentColor" /> Start Tournament
                    </>
                  )}
                </button>
              )}
              {tournament.status === 'ACTIVE' && (
                <div className="text-xs font-bold text-neutral-400 text-center flex items-center gap-2 justify-center p-2">
                  <AlertCircle size={14} /> Tournament is Live
                </div>
              )}
            </div>
          </div>

          {process.env.NODE_ENV !== 'production' && (
            <div className="bg-purple-950/20 border border-purple-500/30 rounded-2xl p-6 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              <h2 className="text-xl font-black uppercase tracking-wider mb-4 text-purple-400 flex items-center gap-2">
                <span>🧪 Dev Sandbox</span>
              </h2>
              <p className="text-xs font-semibold text-neutral-400 mb-4 leading-relaxed">
                Use this to fill registrations with mock teams/players to capacity and test matches or bracket engine in development mode.
              </p>
              <button
                onClick={handleFillTournament}
                disabled={actionLoading || tournament._count.registrations >= tournament.maxParticipants}
                className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-white font-black uppercase tracking-wider px-4 py-3 rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-950/50 hover:shadow-purple-500/20 border border-purple-400/20 cursor-pointer"
              >
                {actionLoading ? (
                  <Loader2 className="animate-spin w-4 h-4" />
                ) : (
                  "Fill Tournament"
                )}
              </button>
            </div>
          )}
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
            <button
              onClick={() => setActiveTab('sponsors')}
              className={`flex-1 min-w-[120px] py-3.5 text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                activeTab === 'sponsors'
                  ? 'text-yellow-400 border-b-2 border-yellow-400'
                  : 'text-neutral-500 hover:text-white'
              }`}
            >
              <Star size={14} /> Sponsors
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
            <button
              onClick={() => setActiveTab('standings')}
              className={`flex-1 min-w-[120px] py-3.5 text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                activeTab === 'standings'
                  ? 'text-yellow-400 border-b-2 border-yellow-400'
                  : 'text-neutral-500 hover:text-white'
              }`}
            >
              <Trophy size={14} /> Standings
            </button>
          </div>

          <div className="flex-1 p-6 overflow-y-auto">
            {activeTab === 'auction' && tournament.auctionEnabled ? (
              <AuctionOrganizerPanel tournamentId={String(tournamentId)} />
            ) : activeTab === 'sponsors' ? (
              <TournamentSponsorsTab tournamentId={String(tournamentId)} />
            ) : activeTab === 'standings' ? (
              <StandingsTab standings={standings} tournament={tournament} teamNameMap={teamNameMap} />
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
            ) : activeTab === 'matches' ? (
              <>
                <h2 className="text-xl font-black uppercase tracking-wider mb-6">Match Schedule</h2>

                {matches.length === 0 ? (
                  <div className="py-20 text-center flex flex-col items-center">
                    <Calendar size={48} className="text-neutral-800 mb-4" />
                    <p className="text-neutral-500 font-bold">No matches scheduled yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {matches.map(m => {
                      const scoreA = getScore(m, 'A');
                      const scoreB = getScore(m, 'B');
                      const hasScore = m.status === 'LIVE' || m.status === 'COMPLETED' || m.resultSummary?.forfeited;
                      return (
                        <div key={m.id} className="bg-black/50 border border-white/5 hover:border-white/10 transition-colors rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div>
                            <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2">
                              Match {m.matchNumber}{m.groupId && groupNames[m.groupId] && ` • ${groupNames[m.groupId]}`}{m.stage !== 'GROUP' && ` • ${m.stage}`}
                            </div>
                            <div className="font-bold text-lg flex items-center gap-2 flex-wrap">
                              <span className="text-white">{teamNameMap[m.teamAId] || m.teamAId}</span>
                              {hasScore && (
                                <span className="bg-neutral-900 border border-white/10 px-2.5 py-0.5 rounded-lg text-sm font-black text-[#00ff41] font-mono mx-1">
                                  {scoreA} - {scoreB}
                                </span>
                              )}
                              <span className="text-neutral-500 text-sm font-medium">vs</span>
                              <span className="text-white">{teamNameMap[m.teamBId] || m.teamBId}</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg ${
                              m.resultSummary?.forfeited ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30' :
                              m.status === 'COMPLETED' ? 'bg-[#00ff41]/20 text-[#00ff41]' :
                              m.status === 'LIVE' ? 'bg-red-500/20 text-red-500' :
                              m.status === 'SCORER_ASSIGNED' ? 'bg-blue-500/20 text-blue-400' :
                              'bg-neutral-800 text-neutral-400'
                            }`}>
                              {m.resultSummary?.forfeited ? 'FORFEITED' : m.status.replace(/_/g, ' ')}
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
                      );
                    })}
                  </div>
                )}
              </>
            ) : null}
          </div>
        </div>

      </main>
    </div>
  );
}

function StandingsTab({
  standings,
  tournament,
  teamNameMap,
}: {
  standings: any[];
  tournament: any;
  teamNameMap: Record<string, string>;
}) {
  if (!standings || standings.length === 0) {
    return (
      <div className="py-20 flex flex-col items-center text-center">
        <Trophy size={48} className="text-neutral-800 mb-4" />
        <p className="text-neutral-500 font-bold">No standings yet.</p>
        <p className="text-neutral-600 text-xs mt-1">Matches still in progress.</p>
      </div>
    );
  }

  // Build group name lookup from tournament.groups
  const groupNames: Record<string, string> = {};
  if (tournament && tournament.groups) {
    tournament.groups.forEach((g: any) => { groupNames[g.id] = g.name; });
  }

  // Group standings by groupId (null → 'overall')
  const grouped: Record<string, any[]> = {};
  standings.forEach((s: any) => {
    const key = s.groupId || 'overall';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(s);
  });

  const isCricket = tournament.sport === 'CRICKET';
  const isFootball = tournament.sport === 'FOOTBALL';

  return (
    <div className="flex flex-col gap-5">
      {Object.entries(grouped).map(([groupId, rows]) => {
        const sorted = [...rows].sort((a, b) => a.position - b.position);
        const label = groupId === 'overall'
          ? 'Overall Standings'
          : groupNames[groupId] || 'Group';

        return (
          <div key={groupId} className="bg-neutral-900 border border-white/5 rounded-2xl overflow-hidden shadow-lg">

            {/* Group header */}
            <div className="px-4 py-3 bg-yellow-500/10 border-b border-yellow-500/20 flex items-center justify-between">
              <h3 className="font-black uppercase tracking-widest text-sm text-yellow-400">{label}</h3>
              <span className="text-[10px] font-bold text-neutral-500">{sorted.length} teams</span>
            </div>

            {/* Column headers */}
            <div className="grid grid-cols-[2rem_1fr_auto] gap-0 px-4 py-2 border-b border-white/5 bg-black/20">
              <span className="text-[9px] font-black uppercase tracking-widest text-neutral-600">#</span>
              <span className="text-[9px] font-black uppercase tracking-widest text-neutral-600">Team</span>
              <div className="flex items-center gap-3 text-[9px] font-black uppercase tracking-widest text-neutral-600">
                <span className="w-5 text-center" title="Played">P</span>
                <span className="w-5 text-center" title="Won">W</span>
                <span className="w-5 text-center" title="Lost">L</span>
                {isFootball && <span className="w-5 text-center" title="Drawn">D</span>}
                {isCricket  && <span className="w-5 text-center" title="No Result">NR</span>}
                {isFootball && <span className="w-6 text-center" title="Goal Difference">GD</span>}
                {isCricket  && <span className="w-8 text-center" title="Net Run Rate">NRR</span>}
                <span className="w-7 text-center text-white" title="Points">Pts</span>
              </div>
            </div>

            {/* Rows */}
            <div className="divide-y divide-white/5">
              {sorted.map((s: any, idx: number) => {
                const teamName = teamNameMap[s.teamId] || s.teamId.slice(0, 12) + '…';
                const isTop = idx < 2;
                const nrr = s.nrr >= 0 ? `+${s.nrr.toFixed(3)}` : s.nrr.toFixed(3);
                const gd = s.goalDifference >= 0 ? `+${s.goalDifference}` : String(s.goalDifference);

                return (
                  <div key={s.id} className={`grid grid-cols-[2rem_1fr_auto] gap-0 items-center px-4 py-3 ${
                    isTop ? 'bg-yellow-500/[0.03]' : ''
                  }`}>
                    {/* Position */}
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                      idx === 0 ? 'bg-yellow-500/25 text-yellow-400' :
                      idx === 1 ? 'bg-neutral-400/20 text-neutral-300' :
                      idx === 2 ? 'bg-amber-700/20 text-amber-600' :
                      'bg-white/5 text-neutral-500'
                    }`}>
                      {s.position}
                    </span>

                    {/* Team name + qualified badge */}
                    <div className="flex items-center gap-2 min-w-0 pl-2">
                      <span className="text-sm font-bold text-white truncate">{teamName}</span>
                      {s.qualified && (
                        <span className="shrink-0 text-[8px] font-black uppercase tracking-widest text-[#00ff41] bg-[#00ff41]/10 px-1.5 py-0.5 rounded-full">
                          Q
                        </span>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-3 text-xs font-black shrink-0">
                      <span className="w-5 text-center text-neutral-400">{s.played}</span>
                      <span className="w-5 text-center text-[#00ff41]">{s.won}</span>
                      <span className="w-5 text-center text-red-400">{s.lost}</span>
                      {isFootball && <span className="w-5 text-center text-neutral-400">{s.drawn}</span>}
                      {isCricket  && <span className="w-5 text-center text-neutral-400">{s.noResult}</span>}
                      {isFootball && (
                        <span className={`w-6 text-center text-xs font-bold ${
                          s.goalDifference > 0 ? 'text-[#00ff41]' :
                          s.goalDifference < 0 ? 'text-red-400' : 'text-neutral-500'
                        }`}>{gd}</span>
                      )}
                      {isCricket && (
                        <span className={`w-8 text-center text-xs font-bold ${
                          s.nrr > 0 ? 'text-[#00ff41]' :
                          s.nrr < 0 ? 'text-red-400' : 'text-neutral-500'
                        }`}>{nrr}</span>
                      )}
                      <span className="w-7 text-center text-white font-black">{s.points}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
