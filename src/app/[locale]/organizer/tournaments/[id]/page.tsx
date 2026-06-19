'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter, usePathname } from 'next/navigation';
import { Loader2, ArrowLeft, Users, Trophy, Play, GitMerge, Link as LinkIcon, AlertCircle, Calendar, Gavel, ChevronDown, ChevronUp, Shield, Star, X, Edit, Check } from 'lucide-react';
import dynamic from 'next/dynamic';
const AuctionOrganizerPanel = dynamic(() => import('@/components/admin/tournaments/AuctionOrganizerPanel'), { ssr: false });
import TournamentSponsorsTab from '@/components/admin/tournaments/TournamentSponsorsTab';
import { getSupabaseClient } from '@/lib/supabaseRealtime';
import TournamentBracket from '@/components/shared/TournamentBracket';

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
  const [activeTab, setActiveTab] = useState<'matches' | 'auction' | 'registrations' | 'sponsors' | 'standings' | 'timeline'>('registrations');
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);
  const [selectedStage, setSelectedStage] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'list' | 'bracket'>('list');

  // Edit Match & Group Modals State
  const [editingMatch, setEditingMatch] = useState<any>(null);
  const [editMatchModalOpen, setEditMatchModalOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editGroupModalOpen, setEditGroupModalOpen] = useState(false);

  useEffect(() => {
    if (matches && matches.length > 0) {
      const hasKnockouts = matches.some(m => ['ROUND_OF_16', 'QUARTER', 'SEMI', 'FINAL'].includes(m.stage));
      if (hasKnockouts) {
        setViewMode('bracket');
      }
    }
  }, [matches]);

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

  const handleCompleteStage = async (stage: string) => {
    if (!tournamentId) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/dev/tournaments/${tournamentId}/complete-stage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage })
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message || `Stage ${stage} matches successfully simulated and completed!`);
        await loadData();
      } else {
        alert('Failed to complete stage: ' + data.error);
      }
    } catch (e) {
      console.error(e);
      alert('Network error trying to complete stage.');
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
                <div className="flex flex-col gap-3">
                  {matches.some(m => m.groupId !== null) && 
                   matches.filter(m => m.groupId !== null).every(m => m.status === 'COMPLETED') && 
                   matches.every(m => m.groupId !== null) ? (
                    <button
                      onClick={() => handleAction('advance')}
                      disabled={actionLoading}
                      className="w-full bg-[#00ff41] text-black font-black uppercase tracking-wider px-4 py-3 rounded-xl text-sm hover:bg-[#00cc33] transition-colors flex items-center justify-center gap-2 shadow-lg shadow-[#00ff41]/25 cursor-pointer"
                    >
                      {actionLoading ? <Loader2 className="animate-spin w-4 h-4" /> : 'Advance to Knockouts'}
                    </button>
                  ) : (
                    <div className="text-xs font-bold text-neutral-400 text-center flex items-center gap-2 justify-center p-2">
                      <AlertCircle size={14} /> Tournament is Live
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {process.env.NODE_ENV !== 'production' && (
            <div className="bg-purple-950/20 border border-purple-500/30 rounded-2xl p-6 relative overflow-hidden group flex flex-col gap-3">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              <h2 className="text-xl font-black uppercase tracking-wider mb-1 text-purple-400 flex items-center gap-2">
                <span>🧪 Dev Sandbox</span>
              </h2>
              <p className="text-xs font-semibold text-neutral-400 leading-relaxed mb-1">
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
              {tournament.status === 'ACTIVE' && matches.some((m: any) => m.stage === 'GROUP' && m.status !== 'COMPLETED') && (
                <button
                  onClick={() => handleCompleteStage('GROUP')}
                  disabled={actionLoading}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-white font-black uppercase tracking-wider px-4 py-3 rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-lg border border-blue-400/20 cursor-pointer"
                >
                  {actionLoading ? <Loader2 className="animate-spin w-4 h-4" /> : "Complete Group Stage"}
                </button>
              )}
              {tournament.status === 'ACTIVE' && matches.some((m: any) => m.stage === 'QUARTER' && m.status !== 'COMPLETED' && m.teamAId !== 'TBD' && m.teamBId !== 'TBD') && (
                <button
                  onClick={() => handleCompleteStage('QUARTER')}
                  disabled={actionLoading}
                  className="w-full bg-orange-600 hover:bg-orange-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-white font-black uppercase tracking-wider px-4 py-3 rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-lg border border-orange-400/20 cursor-pointer"
                >
                  {actionLoading ? <Loader2 className="animate-spin w-4 h-4" /> : "Complete Quarter Finals"}
                </button>
              )}
              {tournament.status === 'ACTIVE' && matches.some((m: any) => m.stage === 'SEMI' && m.status !== 'COMPLETED' && m.teamAId !== 'TBD' && m.teamBId !== 'TBD') && (
                <button
                  onClick={() => handleCompleteStage('SEMI')}
                  disabled={actionLoading}
                  className="w-full bg-pink-600 hover:bg-pink-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-white font-black uppercase tracking-wider px-4 py-3 rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-lg border border-pink-400/20 cursor-pointer"
                >
                  {actionLoading ? <Loader2 className="animate-spin w-4 h-4" /> : "Complete Semi Finals"}
                </button>
              )}
              {tournament.status === 'ACTIVE' && matches.some((m: any) => m.stage === 'FINAL' && m.status !== 'COMPLETED' && m.teamAId !== 'TBD' && m.teamBId !== 'TBD') && (
                <button
                  onClick={() => handleCompleteStage('FINAL')}
                  disabled={actionLoading}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-black font-black uppercase tracking-wider px-4 py-3 rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-lg border border-emerald-400/20 cursor-pointer"
                >
                  {actionLoading ? <Loader2 className="animate-spin w-4 h-4" /> : "Complete Finals"}
                </button>
              )}
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
            <button
              onClick={() => setActiveTab('timeline')}
              className={`flex-1 min-w-[120px] py-3.5 text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                activeTab === 'timeline'
                  ? 'text-yellow-400 border-b-2 border-yellow-400'
                  : 'text-neutral-500 hover:text-white'
              }`}
            >
              <Calendar size={14} /> Timeline
            </button>
          </div>

          <div className="flex-1 p-6 overflow-y-auto">
            {activeTab === 'auction' && tournament.auctionEnabled ? (
              <AuctionOrganizerPanel tournamentId={String(tournamentId)} />
            ) : activeTab === 'sponsors' ? (
              <TournamentSponsorsTab tournamentId={String(tournamentId)} />
            ) : activeTab === 'standings' ? (
              <StandingsTab standings={standings} tournament={tournament} teamNameMap={teamNameMap} matches={matches} onEditGroup={(gid) => { setEditingGroupId(gid); setEditGroupModalOpen(true); }} />
            ) : activeTab === 'timeline' ? (
              <TimelineTab tournament={tournament} />
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
            ) : activeTab === 'matches' ? (() => {
              const stageOrder: Record<string, number> = {
                'GROUP': 1,
                'ROUND_OF_16': 2,
                'QUARTER': 3,
                'SEMI': 4,
                'FINAL': 5
              };

              const sortedMatches = [...matches].sort((a, b) => {
                const orderA = stageOrder[a.stage] || 99;
                const orderB = stageOrder[b.stage] || 99;
                if (orderA !== orderB) return orderA - orderB;
                return a.matchNumber - b.matchNumber;
              });

              const availableStages = Array.from(new Set(matches.map(m => m.stage)));
              const hasKnockouts = matches.some(m => ['ROUND_OF_16', 'QUARTER', 'SEMI', 'FINAL'].includes(m.stage));

              const filteredMatches = selectedStage === 'ALL'
                ? sortedMatches
                : sortedMatches.filter(m => m.stage === selectedStage);

              return (
                <>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-4">
                      <h2 className="text-xl font-black uppercase tracking-wider">Match Schedule</h2>
                      
                      {/* List vs Bracket view toggle */}
                      {hasKnockouts && (
                        <div className="inline-flex bg-neutral-950 border border-white/5 p-1 rounded-xl shadow-lg shrink-0">
                          <button
                            onClick={() => setViewMode('bracket')}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                              viewMode === 'bracket'
                                ? 'bg-yellow-500 text-black shadow-md shadow-yellow-500/10'
                                : 'text-neutral-500 hover:text-white'
                            }`}
                          >
                            Bracket
                          </button>
                          <button
                            onClick={() => setViewMode('list')}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                              viewMode === 'list'
                                ? 'bg-yellow-500 text-black shadow-md shadow-yellow-500/10'
                                : 'text-neutral-500 hover:text-white'
                            }`}
                          >
                            List
                          </button>
                        </div>
                      )}
                    </div>

                    {viewMode === 'list' && availableStages.length > 1 && (
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Stage:</span>
                        <select
                          value={selectedStage}
                          onChange={(e) => setSelectedStage(e.target.value)}
                          className="bg-black/45 border border-white/10 text-white font-black text-xs uppercase tracking-widest rounded-xl px-4 py-2.5 focus:outline-none focus:border-accent cursor-pointer"
                        >
                          <option value="ALL">Show All Stages</option>
                          {availableStages.includes('GROUP') && <option value="GROUP">Group Stage</option>}
                          {availableStages.includes('ROUND_OF_16') && <option value="ROUND_OF_16">Round of 16</option>}
                          {availableStages.includes('QUARTER') && <option value="QUARTER">Quarter Finals</option>}
                          {availableStages.includes('SEMI') && <option value="SEMI">Semi Finals</option>}
                          {availableStages.includes('FINAL') && <option value="FINAL">Finals</option>}
                        </select>
                      </div>
                    )}
                  </div>

                  {viewMode === 'bracket' ? (
                    <TournamentBracket
                      matches={matches}
                      teamNameMap={teamNameMap}
                      teamLogoMap={teamLogoMap}
                      sport={tournament.sport}
                    />
                  ) : filteredMatches.length === 0 ? (
                    <div className="py-20 text-center flex flex-col items-center">
                      <Calendar size={48} className="text-neutral-800 mb-4" />
                      <p className="text-neutral-500 font-bold">No matches found for this stage.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredMatches.map(m => {
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
                              <button
                                onClick={() => { setEditingMatch(m); setEditMatchModalOpen(true); }}
                                className="p-2 bg-neutral-800 text-neutral-300 hover:text-accent hover:bg-neutral-700 rounded-lg transition-colors cursor-pointer flex items-center justify-center shrink-0"
                                title="Edit Match Details / Score"
                              >
                                <Edit size={16} />
                              </button>

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
                                  className="p-2 bg-neutral-800 text-neutral-300 hover:text-accent hover:bg-neutral-700 rounded-lg transition-colors cursor-pointer"
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
              );
            })() : null}
          </div>
        </div>

      </main>

      {editMatchModalOpen && editingMatch && (
        <EditMatchModal
          match={editingMatch}
          tournament={tournament}
          onClose={() => { setEditingMatch(null); setEditMatchModalOpen(false); }}
          onSaved={async () => {
            setEditingMatch(null);
            setEditMatchModalOpen(false);
            await loadData();
          }}
        />
      )}

      {editGroupModalOpen && editingGroupId && (
        <EditGroupModal
          groupId={editingGroupId}
          tournament={tournament}
          onClose={() => { setEditingGroupId(null); setEditGroupModalOpen(false); }}
          onSaved={async () => {
            setEditingGroupId(null);
            setEditGroupModalOpen(false);
            await loadData();
          }}
        />
      )}
    </div>
  );
}

function StandingsTab({
  standings,
  tournament,
  teamNameMap,
  matches,
  onEditGroup
}: {
  standings: any[];
  tournament: any;
  teamNameMap: Record<string, string>;
  matches: any[];
  onEditGroup: (groupId: string) => void;
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

  const isCricket = tournament.sport === 'CRICKET';
  const isFootball = tournament.sport === 'FOOTBALL';

  // Group standings by groupId
  const groupStandings: Record<string, any[]> = {};
  standings.forEach((s: any) => {
    if (!s.groupId) return;
    if (!groupStandings[s.groupId]) groupStandings[s.groupId] = [];
    groupStandings[s.groupId].push(s);
  });

  const groupIds = Object.keys(groupStandings);
  const groupStageComplete = groupIds.length > 0 && groupIds.every(gid =>
    (groupStandings[gid] || []).every((s: any) => {
      const groupMatches = matches.filter((m: any) => m.groupId === gid);
      return groupMatches.length > 0 && groupMatches.every((m: any) => m.status === 'COMPLETED');
    })
  );

  const isGroupStageFinished = matches.length > 0 && matches.some(m => m.stage !== 'GROUP');

  // ── Knockout stage analysis ─────────────────────────────────────────────────
  const qfMatches = matches.filter((m: any) => m.stage === 'QUARTER');
  const sfMatches = matches.filter((m: any) => m.stage === 'SEMI');
  const finalMatches = matches.filter((m: any) => m.stage === 'FINAL');

  const qfDone = qfMatches.length > 0 && qfMatches.every((m: any) => m.status === 'COMPLETED');
  const sfDone = sfMatches.length > 0 && sfMatches.every((m: any) => m.status === 'COMPLETED');
  const finalDone = finalMatches.length > 0 && finalMatches.every((m: any) => m.status === 'COMPLETED');

  // Teams advancing through knockout stages
  const qfTeamIds = qfMatches.length > 0
    ? [...new Set(qfMatches.flatMap((m: any) => [m.teamAId, m.teamBId]).filter(Boolean))]
    : [];
  const sfTeamIds = sfMatches.length > 0
    ? [...new Set(sfMatches.flatMap((m: any) => [m.teamAId, m.teamBId]).filter(Boolean))]
    : [];
  const finalTeamIds = finalMatches.length > 0
    ? [...new Set(finalMatches.flatMap((m: any) => [m.teamAId, m.teamBId]).filter(Boolean))]
    : [];
  const championId = finalDone ? finalMatches[0]?.winnerId : null;

  // ── Overall team standings ──────────────────────────────────────────────────
  const allTeamIds = tournament.registrations
    ? tournament.registrations.filter((r: any) => r.entityType === 'TEAM').map((r: any) => r.entityId)
    : [];

  function stageReached(teamId: string): number {
    if (championId === teamId) return 6;
    if (finalTeamIds.includes(teamId)) return 5;
    if (sfTeamIds.includes(teamId)) return 4;
    if (qfTeamIds.includes(teamId)) return 3;
    if (groupStageComplete && standings.some((s: any) => s.teamId === teamId && s.qualified)) return 2;
    return 1;
  }

  function isEliminated(teamId: string): boolean {
    if (groupStageComplete) {
      const s = standings.find((x: any) => x.teamId === teamId);
      if (s && !s.qualified && !qfTeamIds.includes(teamId)) return true;
    }
    if (qfDone && qfTeamIds.includes(teamId) && !sfTeamIds.includes(teamId)) return true;
    if (sfDone && sfTeamIds.includes(teamId) && !finalTeamIds.includes(teamId)) return true;
    if (finalDone && finalTeamIds.includes(teamId) && championId !== teamId) return true;
    return false;
  }

  const sortedOverall = [...allTeamIds].sort((a, b) => {
    const elimA = isEliminated(a);
    const elimB = isEliminated(b);
    if (elimA !== elimB) return elimA ? 1 : -1;
    const stageA = stageReached(a);
    const stageB = stageReached(b);
    if (stageA !== stageB) return stageB - stageA;
    const standingA = standings.find((s: any) => s.teamId === a);
    const standingB = standings.find((s: any) => s.teamId === b);
    return (standingB?.points ?? 0) - (standingA?.points ?? 0);
  });

  const stageLabel: Record<string, string> = {
    QUARTER: 'Quarter Finals',
    SEMI: 'Semi Finals',
    FINAL: 'Grand Final',
  };

  function StandingRow({ s, idx }: { s: any; idx: number }) {
    const teamName = teamNameMap[s.teamId] || s.teamId;
    const logo = s.team?.logoUrl || s.player?.avatarUrl;
    const isTop = idx < 2;
    const nrr = s.nrr >= 0 ? `+${s.nrr.toFixed(2)}` : s.nrr.toFixed(2);
    const gd = s.goalDifference >= 0 ? `+${s.goalDifference}` : String(s.goalDifference);
    return (
      <div className={`grid grid-cols-[1.5rem_1fr_auto] sm:grid-cols-[2rem_1fr_auto] gap-0 items-center px-2 sm:px-4 py-2.5 sm:py-3 ${isTop ? 'bg-yellow-500/[0.03]' : ''}`}>
        <span className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-black ${
          idx === 0 ? 'bg-yellow-500/25 text-yellow-400' :
          idx === 1 ? 'bg-neutral-400/20 text-neutral-300' :
          'bg-white/5 text-neutral-500'
        }`}>{s.position || idx + 1}</span>
        <div className="flex items-center gap-1.5 min-w-0 pl-1 sm:pl-2">
          {logo && <img src={logo} alt="" className="w-4 h-4 sm:w-5 sm:h-5 rounded-full object-cover shrink-0 border border-white/10" />}
          <span className="text-xs sm:text-sm font-bold text-white break-words leading-tight pr-1">{teamName}</span>
          {s.qualified && (
            <span className="shrink-0 text-[7px] sm:text-[8px] font-black uppercase tracking-widest text-[#00ff41] bg-[#00ff41]/10 px-1 sm:px-1.5 py-0.5 rounded-full">Q</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 sm:gap-3 text-[10px] sm:text-xs font-black shrink-0">
          <span className="w-4 sm:w-5 text-center text-neutral-400">{s.played}</span>
          <span className="w-4 sm:w-5 text-center text-[#00ff41]">{s.won}</span>
          <span className="w-4 sm:w-5 text-center text-red-400">{s.lost}</span>
          {isFootball && <span className="w-4 sm:w-5 text-center text-neutral-400">{s.drawn}</span>}
          {isCricket && <span className="w-4 sm:w-5 text-center text-neutral-400">{s.noResult}</span>}
          {isFootball && <span className={`w-5 sm:w-6 text-center text-[10px] sm:text-xs font-bold ${s.goalDifference > 0 ? 'text-[#00ff41]' : s.goalDifference < 0 ? 'text-red-400' : 'text-neutral-500'}`}>{gd}</span>}
          {isCricket && <span className={`w-6 sm:w-8 text-center text-[10px] sm:text-xs font-bold ${s.nrr > 0 ? 'text-[#00ff41]' : s.nrr < 0 ? 'text-red-400' : 'text-neutral-500'}`}>{nrr}</span>}
          <span className="w-6 sm:w-7 text-center text-white font-black">{s.points}</span>
        </div>
      </div>
    );
  }

  function StandingColHeaders() {
    return (
      <div className="grid grid-cols-[1.5rem_1fr_auto] sm:grid-cols-[2rem_1fr_auto] gap-0 px-2 sm:px-4 py-2 border-b border-white/5 bg-black/20">
        <span className="text-[9px] font-black uppercase tracking-widest text-neutral-600">#</span>
        <span className="text-[9px] font-black uppercase tracking-widest text-neutral-600 pl-1 sm:pl-2">Team</span>
        <div className="flex items-center gap-1.5 sm:gap-3 text-[9px] font-black uppercase tracking-widest text-neutral-600">
          <span className="w-4 sm:w-5 text-center" title="Played">P</span>
          <span className="w-4 sm:w-5 text-center" title="Won">W</span>
          <span className="w-4 sm:w-5 text-center" title="Lost">L</span>
          {isFootball && <span className="w-4 sm:w-5 text-center" title="Drawn">D</span>}
          {isCricket && <span className="w-4 sm:w-5 text-center" title="No Result">NR</span>}
          {isFootball && <span className="w-5 sm:w-6 text-center" title="Goal Difference">GD</span>}
          {isCricket && <span className="w-6 sm:w-8 text-center" title="Net Run Rate">NRR</span>}
          <span className="w-6 sm:w-7 text-center text-white" title="Points">Pts</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Group Stage Standings */}
      {groupIds.length > 0 && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-black uppercase tracking-widest text-neutral-400">Group Stage</h3>
            {groupStageComplete && (
              <span className="text-[9px] font-black uppercase tracking-widest text-[#00ff41] bg-[#00ff41]/10 px-2 py-0.5 rounded-full">Concluded ✓</span>
            )}
          </div>

          {groupIds
            .sort((a, b) => (groupNames[a] || '').localeCompare(groupNames[b] || ''))
            .map(groupId => {
              const rows = [...(groupStandings[groupId] || [])].sort((a, b) => a.position - b.position || b.points - a.points);
              const label = groupNames[groupId] || 'Group';

              return (
                <div key={groupId} className="bg-neutral-900 border border-white/5 rounded-2xl overflow-hidden shadow-lg">
                  <div className="px-4 py-3 bg-yellow-500/10 border-b border-yellow-500/20 flex items-center justify-between">
                    <h3 className="font-black uppercase tracking-widest text-sm text-yellow-400 flex items-center gap-2">
                      {label}
                      {isGroupStageFinished && (
                        <span className="text-[9px] font-black uppercase tracking-widest text-neutral-400 bg-neutral-800 px-2 py-0.5 rounded">
                          CONCLUDED
                        </span>
                      )}
                    </h3>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => onEditGroup(groupId)}
                        className="px-2 py-1 text-[10px] font-black uppercase tracking-wider border border-accent/20 bg-accent/5 text-accent hover:bg-accent/20 hover:text-white rounded transition-colors cursor-pointer"
                      >
                        Edit Group
                      </button>
                      <span className="text-[10px] font-bold text-neutral-500">{rows.length} teams</span>
                    </div>
                  </div>

                  <StandingColHeaders />
                  <div className="divide-y divide-white/5">
                    {rows.map((s: any, idx: number) => <StandingRow key={s.id} s={s} idx={idx} />)}
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* Knockout Stage Progress */}
      {(qfMatches.length > 0 || sfMatches.length > 0 || finalMatches.length > 0) && (
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-black uppercase tracking-widest text-neutral-400">Knockout Stages</h3>

          {[
            { stage: 'QUARTER', teamIds: qfTeamIds, done: qfDone, matches: qfMatches },
            { stage: 'SEMI', teamIds: sfTeamIds, done: sfDone, matches: sfMatches },
            { stage: 'FINAL', teamIds: finalTeamIds, done: finalDone, matches: finalMatches },
          ].filter(({ teamIds }) => teamIds.length > 0).map(({ stage, teamIds, done, matches: stageMatches }) => (
            <div key={stage} className={`border rounded-2xl overflow-hidden ${
              stage === 'FINAL' ? 'border-yellow-500/20 bg-yellow-950/10' :
              stage === 'SEMI' ? 'border-purple-500/20 bg-purple-950/10' :
              'border-blue-500/20 bg-blue-950/10'
            }`}>
              <div className={`px-4 py-2.5 border-b flex items-center justify-between ${
                stage === 'FINAL' ? 'border-yellow-500/20' :
                stage === 'SEMI' ? 'border-purple-500/20' :
                'border-blue-500/20'
              }`}>
                <h4 className={`font-black uppercase tracking-widest text-xs ${
                  stage === 'FINAL' ? 'text-yellow-400' :
                  stage === 'SEMI' ? 'text-purple-400' :
                  'text-blue-400'
                }`}>{stageLabel[stage]}</h4>
                {done && <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full text-[#00ff41] bg-[#00ff41]/10">Done ✓</span>}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3">
                {teamIds.map(tid => {
                  const isWinner = done && stageMatches.some((m: any) => m.winnerId === tid);
                  const isLoser = done && stageMatches.some((m: any) => m.winnerId && m.winnerId !== tid && (m.teamAId === tid || m.teamBId === tid));
                  return (
                    <div key={tid} className={`flex items-center gap-2 rounded-xl px-3 py-2 ${
                      tid === championId ? 'bg-yellow-500/10 border border-yellow-500/20' :
                      isWinner ? 'bg-[#00ff41]/5 border border-[#00ff41]/10' :
                      isLoser ? 'opacity-40 bg-black/20 border border-white/5' :
                      'bg-black/20 border border-white/5'
                    }`}>
                      <div className="w-6 h-6 rounded-full bg-neutral-900 border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                        <Shield size={12} className="text-neutral-600" />
                      </div>
                      <span className={`text-[10px] font-black truncate ${
                        tid === championId ? 'text-yellow-400' : isWinner ? 'text-[#00ff41]' : 'text-white'
                      }`}>
                        {teamNameMap[tid] || '?'}
                      </span>
                      {tid === championId && <Trophy size={10} className="text-yellow-400 shrink-0" />}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Overall team rankings */}
      {sortedOverall.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-black uppercase tracking-widest text-neutral-400">Overall Team Rankings</h3>
          <div className="bg-neutral-900 border border-white/5 rounded-2xl overflow-hidden">
            <div className="divide-y divide-white/5">
              {sortedOverall.map((teamId, rank) => {
                const name = teamNameMap[teamId] || teamId;
                const elim = isEliminated(teamId);
                const stage = stageReached(teamId);
                const stageBadge = championId === teamId ? { label: '🏆 Champion', cls: 'text-yellow-400 bg-yellow-500/10' }
                  : stage >= 5 ? { label: 'Finalist', cls: 'text-yellow-400/70 bg-yellow-500/10' }
                  : stage >= 4 ? { label: 'Semi Finals', cls: 'text-purple-400 bg-purple-500/10' }
                  : stage >= 3 ? { label: 'Quarter Finals', cls: 'text-blue-400 bg-blue-500/10' }
                  : stage >= 2 ? { label: 'Qualified', cls: 'text-[#00ff41] bg-[#00ff41]/10' }
                  : null;

                return (
                  <div key={teamId} className={`flex items-center gap-2 sm:gap-3 px-2 sm:px-4 py-2.5 sm:py-3 transition-all ${elim ? 'opacity-40' : ''}`}>
                    <span className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-black shrink-0 ${
                      rank === 0 ? 'bg-yellow-500/25 text-yellow-400' :
                      rank === 1 ? 'bg-neutral-400/20 text-neutral-300' :
                      rank === 2 ? 'bg-amber-700/20 text-amber-600' :
                      'bg-white/5 text-neutral-500'
                    }`}>{rank + 1}</span>
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-neutral-950 border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                      <Shield size={14} className="text-neutral-600" />
                    </div>
                    <div className="flex-1 min-w-0 pl-1">
                      <p className="text-xs sm:text-sm font-black text-white break-words leading-tight pr-1">{name}</p>
                      {elim && <p className="text-[8px] sm:text-[9px] font-bold text-neutral-600 uppercase tracking-wider mt-0.5">Eliminated</p>}
                    </div>
                    {stageBadge && (
                      <span className={`text-[8px] sm:text-[9px] font-black uppercase tracking-widest px-1.5 sm:px-2 py-0.5 rounded-full shrink-0 ${stageBadge.cls}`}>
                        {stageBadge.label}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TimelineTab({ tournament }: { tournament: any }) {
  const events = Array.isArray(tournament.timeline)
    ? [...tournament.timeline].sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    : [];

  if (events.length === 0) {
    return (
      <div className="py-20 flex flex-col items-center text-center">
        <Calendar size={48} className="text-neutral-800 mb-4" />
        <p className="text-neutral-500 font-bold">No timeline updates yet.</p>
        <p className="text-neutral-600 text-xs mt-1">Changes made by you will appear here.</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto py-4">
      <h3 className="text-xs font-black uppercase tracking-widest text-neutral-400 mb-6">Tournament Timeline</h3>
      <div className="relative border-l-2 border-white/10 pl-6 space-y-8 ml-2">
        {events.map((e: any) => (
          <div key={e.id} className="relative">
            <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-yellow-500 border-4 border-[#0a0a0a]" />
            <div className="text-xs text-neutral-500 font-bold">
              {new Date(e.timestamp).toLocaleString()}
            </div>
            <h4 className="text-sm font-black text-white mt-1 leading-relaxed">
              {e.message}
            </h4>
            <span className="inline-block mt-2 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-white/5 border border-white/10 text-neutral-400">
              {e.type.replace(/_/g, ' ')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function EditMatchModal({
  match,
  tournament,
  onClose,
  onSaved
}: {
  match: any;
  tournament: any;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [status, setStatus] = useState(match.status);
  const [venue, setVenue] = useState(match.venue || '');
  const [scheduledAt, setScheduledAt] = useState(
    match.scheduledAt ? new Date(match.scheduledAt).toISOString().slice(0, 16) : ''
  );
  const [winnerId, setWinnerId] = useState(match.winnerId || 'none');

  // Score states
  const isFootball = tournament.sport === 'FOOTBALL';
  const isCricket = tournament.sport === 'CRICKET';

  // Football scores
  const [goalsA, setGoalsA] = useState(match.resultSummary?.goalsA ?? 0);
  const [goalsB, setGoalsB] = useState(match.resultSummary?.goalsB ?? 0);

  // Cricket scores
  const [runsA, setRunsA] = useState(match.resultSummary?.runsA ?? 0);
  const [wicketsA, setWicketsA] = useState(match.resultSummary?.wicketsA ?? 0);
  const [oversA, setOversA] = useState(match.resultSummary?.oversA ?? 0);
  const [runsB, setRunsB] = useState(match.resultSummary?.runsB ?? 0);
  const [wicketsB, setWicketsB] = useState(match.resultSummary?.wicketsB ?? 0);
  const [oversB, setOversB] = useState(match.resultSummary?.oversB ?? 0);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Fetch team names
  const teamNameMap: Record<string, string> = {};
  if (tournament.registrations) {
    tournament.registrations.forEach((r: any) => {
      const isTeam = r.entityType === 'TEAM';
      const entity = isTeam ? r.team : r.player;
      if (entity) teamNameMap[r.entityId] = entity.name || entity.fullName || '';
    });
  }

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const payload: any = {
        status,
        venue,
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
        winnerId: winnerId === 'none' ? null : winnerId,
        resultSummary: {}
      };

      if (isFootball) {
        payload.resultSummary = { goalsA: Number(goalsA), goalsB: Number(goalsB) };
      } else if (isCricket) {
        payload.resultSummary = {
          runsA: Number(runsA), wicketsA: Number(wicketsA), oversA: Number(oversA),
          runsB: Number(runsB), wicketsB: Number(wicketsB), oversB: Number(oversB)
        };
      }

      const res = await fetch(`/api/t-matches/${match.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        onSaved();
      } else {
        setError(data.error || 'Failed to update match');
      }
    } catch (e: any) {
      setError(e.message || 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
      <div className="bg-zinc-950 border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden flex flex-col shadow-2xl">
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-black/40">
          <h3 className="font-black text-lg text-white">Edit Match {match.matchNumber}</h3>
          <button onClick={onClose} className="p-1 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white transition-colors cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto font-bold text-sm text-neutral-300">
          {error && <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-center font-semibold">{error}</div>}

          {/* Teams Header */}
          <div className="text-center py-2 border-b border-white/5 mb-4">
            <span className="text-white text-base font-black">
              {teamNameMap[match.teamAId] || match.teamAId} vs {teamNameMap[match.teamBId] || match.teamBId}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase tracking-wider text-neutral-500">Status</label>
              <select value={status} onChange={e => setStatus(e.target.value)} className="bg-black/50 border border-white/10 text-white rounded-xl px-3 py-2 focus:outline-none focus:border-accent">
                <option value="SCHEDULED">Scheduled</option>
                <option value="SCORER_ASSIGNED">Scorer Assigned</option>
                <option value="LIVE">Live</option>
                <option value="COMPLETED">Completed</option>
                <option value="WALKOVER">Walkover</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase tracking-wider text-neutral-500">Winner</label>
              <select value={winnerId} onChange={e => setWinnerId(e.target.value)} className="bg-black/50 border border-white/10 text-white rounded-xl px-3 py-2 focus:outline-none focus:border-accent">
                <option value="none">None / Draw</option>
                <option value={match.teamAId}>{teamNameMap[match.teamAId] || match.teamAId}</option>
                <option value={match.teamBId}>{teamNameMap[match.teamBId] || match.teamBId}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase tracking-wider text-neutral-500">Scheduled Date/Time</label>
              <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} className="bg-black/50 border border-white/10 text-white rounded-xl px-3 py-2 focus:outline-none focus:border-accent" />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase tracking-wider text-neutral-500">Venue</label>
              <input type="text" value={venue} onChange={e => setVenue(e.target.value)} placeholder="Pitch name / Turf location" className="bg-black/50 border border-white/10 text-white rounded-xl px-3 py-2 focus:outline-none focus:border-accent" />
            </div>
          </div>

          {/* Football Scores */}
          {isFootball && (status === 'COMPLETED' || status === 'LIVE') && (
            <div className="bg-black/20 p-4 border border-white/5 rounded-xl space-y-3">
              <h4 className="text-[10px] uppercase tracking-wider text-neutral-400">Goals Summary</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-neutral-400">{teamNameMap[match.teamAId] || 'Team A'}</label>
                  <input type="number" min="0" value={goalsA} onChange={e => setGoalsA(Number(e.target.value))} className="bg-black/50 border border-white/10 text-white rounded-xl px-3 py-2 focus:outline-none focus:border-accent" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-neutral-400">{teamNameMap[match.teamBId] || 'Team B'}</label>
                  <input type="number" min="0" value={goalsB} onChange={e => setGoalsB(Number(e.target.value))} className="bg-black/50 border border-white/10 text-white rounded-xl px-3 py-2 focus:outline-none focus:border-accent" />
                </div>
              </div>
            </div>
          )}

          {/* Cricket Scores */}
          {isCricket && (status === 'COMPLETED' || status === 'LIVE') && (
            <div className="bg-black/20 p-4 border border-white/5 rounded-xl space-y-4">
              <h4 className="text-[10px] uppercase tracking-wider text-neutral-400">Cricket Scores Summary</h4>
              
              {/* Team A */}
              <div className="space-y-2">
                <p className="text-xs font-black text-white">{teamNameMap[match.teamAId] || 'Team A'}</p>
                <div className="grid grid-cols-3 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] text-neutral-500">Runs</label>
                    <input type="number" min="0" value={runsA} onChange={e => setRunsA(Number(e.target.value))} className="bg-black/50 border border-white/10 text-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-accent text-xs" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] text-neutral-500">Wickets</label>
                    <input type="number" min="0" max="10" value={wicketsA} onChange={e => setWicketsA(Number(e.target.value))} className="bg-black/50 border border-white/10 text-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-accent text-xs" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] text-neutral-500">Overs</label>
                    <input type="number" step="0.1" min="0" value={oversA} onChange={e => setOversA(Number(e.target.value))} className="bg-black/50 border border-white/10 text-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-accent text-xs" />
                  </div>
                </div>
              </div>

              {/* Team B */}
              <div className="space-y-2">
                <p className="text-xs font-black text-white">{teamNameMap[match.teamBId] || 'Team B'}</p>
                <div className="grid grid-cols-3 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] text-neutral-500">Runs</label>
                    <input type="number" min="0" value={runsB} onChange={e => setRunsB(Number(e.target.value))} className="bg-black/50 border border-white/10 text-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-accent text-xs" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] text-neutral-500">Wickets</label>
                    <input type="number" min="0" max="10" value={wicketsB} onChange={e => setWicketsB(Number(e.target.value))} className="bg-black/50 border border-white/10 text-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-accent text-xs" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] text-neutral-500">Overs</label>
                    <input type="number" step="0.1" min="0" value={oversB} onChange={e => setOversB(Number(e.target.value))} className="bg-black/50 border border-white/10 text-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-accent text-xs" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-white/5 bg-black/40 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 bg-neutral-900 border border-white/5 text-neutral-400 hover:text-white rounded-xl uppercase font-black tracking-wider text-xs transition-colors cursor-pointer">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-3 bg-accent text-black hover:brightness-110 rounded-xl uppercase font-black tracking-wider text-xs transition-all shadow-[0_4px_15px_rgba(0,255,65,0.2)] flex items-center justify-center gap-2 cursor-pointer">
            {saving ? <Loader2 className="animate-spin w-4 h-4" /> : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditGroupModal({
  groupId,
  tournament,
  onClose,
  onSaved
}: {
  groupId: string;
  tournament: any;
  onClose: () => void;
  onSaved: () => void;
}) {
  const group = tournament.groups.find((g: any) => g.id === groupId);
  const [name, setName] = useState(group?.name || '');
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>(group?.teamIds || []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const registeredTeams = tournament.registrations
    ? tournament.registrations.filter((r: any) => r.entityType === 'TEAM' && r.team)
    : [];

  const handleToggleTeam = (teamId: string) => {
    setSelectedTeamIds(prev =>
      prev.includes(teamId)
        ? prev.filter(id => id !== teamId)
        : [...prev, teamId]
    );
  };

  const handleSave = async () => {
    if (!name.trim()) return setError('Group name is required');
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/tournaments/${tournament.id}/groups`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId,
          name: name.trim(),
          teamIds: selectedTeamIds
        })
      });
      const data = await res.json();
      if (data.success) {
        onSaved();
      } else {
        setError(data.error || 'Failed to update group');
      }
    } catch (e: any) {
      setError(e.message || 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
      <div className="bg-zinc-950 border border-white/10 rounded-2xl w-full max-w-md overflow-hidden flex flex-col shadow-2xl">
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-black/40">
          <h3 className="font-black text-lg text-white">Edit Group</h3>
          <button onClick={onClose} className="p-1 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white transition-colors cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto font-bold text-sm text-neutral-300">
          {error && <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-center font-semibold">{error}</div>}

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase tracking-wider text-neutral-500">Group Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Group A" className="bg-black/50 border border-white/10 text-white rounded-xl px-3 py-2 focus:outline-none focus:border-accent" />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] uppercase tracking-wider text-neutral-500">Select Teams in Group</label>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {registeredTeams.map((r: any) => {
                const isSelected = selectedTeamIds.includes(r.entityId);
                return (
                  <button
                    key={r.id}
                    onClick={() => handleToggleTeam(r.entityId)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-accent/10 border-accent text-accent'
                        : 'bg-black/30 border-white/5 text-white hover:border-white/20'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-neutral-900 border border-white/10 flex items-center justify-center shrink-0 overflow-hidden">
                      {r.team.logoUrl ? (
                        <img src={r.team.logoUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Shield size={14} className="text-neutral-500" />
                      )}
                    </div>
                    <span className="flex-1 text-sm truncate">{r.team.name}</span>
                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'border-accent bg-accent text-black' : 'border-white/20'}`}>
                      {isSelected && <Check size={10} strokeWidth={4} />}
                    </div>
                  </button>
                );
              })}
              {registeredTeams.length === 0 && (
                <p className="text-xs text-neutral-500 text-center py-4">No registered teams yet.</p>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-white/5 bg-black/40 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 bg-neutral-900 border border-white/5 text-neutral-400 hover:text-white rounded-xl uppercase font-black tracking-wider text-xs transition-colors cursor-pointer">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-3 bg-accent text-black hover:brightness-110 rounded-xl uppercase font-black tracking-wider text-xs transition-all shadow-[0_4px_15px_rgba(0,255,65,0.2)] flex items-center justify-center gap-2 cursor-pointer">
            {saving ? <Loader2 className="animate-spin w-4 h-4" /> : 'Save Group'}
          </button>
        </div>
      </div>
    </div>
  );
}
