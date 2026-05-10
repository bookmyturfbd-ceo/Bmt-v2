'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, usePathname } from 'next/navigation';
import { ArrowLeft, Trophy, Users, Calendar, Loader2, AlertTriangle, ChevronDown } from 'lucide-react';

export default function TournamentDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const locale = pathname.split('/')[1] || 'en';

  const [tournament, setTournament] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'overview' | 'matches' | 'standings'>('overview');
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    fetch(`/api/arena/tournaments/${id}`)
      .then(r => r.json())
      .then(data => { if (data.success) setTournament(data.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="animate-spin text-yellow-400 w-10 h-10" /></div>;
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-white">
        <Trophy size={48} className="text-neutral-700 mb-4" />
        <h2 className="text-2xl font-black mb-2">Tournament Not Found</h2>
        <button onClick={() => router.back()} className="mt-4 text-yellow-400 font-bold">← Go Back</button>
      </div>
    );
  }

  const groupedStandings = tournament.standings.reduce((acc: any, s: any) => {
    const key = s.groupId || 'overall';
    if (!acc[key]) acc[key] = [];
    acc[key].push(s);
    return acc;
  }, {});

  const groupNames: Record<string, string> = {};
  tournament.groups.forEach((g: any) => { groupNames[g.id] = g.name; });

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pb-28">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0a0a0a]/90 backdrop-blur-md border-b border-white/5 px-4 py-4 flex items-center gap-4">
        <button onClick={() => router.back()} className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
          <ArrowLeft size={18} />
        </button>
        <h1 className="font-black text-base truncate flex-1">{tournament.name}</h1>
        <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full shrink-0 ${
          tournament.status === 'ACTIVE' ? 'bg-[#00ff41]/20 text-[#00ff41]' :
          tournament.status === 'REGISTRATION_OPEN' ? 'bg-blue-500/20 text-blue-400' :
          'bg-neutral-800 text-neutral-400'
        }`}>
          {tournament.status.replace(/_/g, ' ')}
        </span>
      </header>

      {/* Hero Banner */}
      <div className="relative bg-gradient-to-br from-yellow-950/60 via-amber-900/30 to-[#0a0a0a] px-6 py-10 border-b border-white/5 overflow-hidden">
        <div className="absolute right-4 top-4 opacity-10 pointer-events-none">
          <Trophy size={120} className="text-yellow-400" />
        </div>
        <div className="relative z-10">
          <p className="text-[10px] font-black uppercase tracking-widest text-yellow-400/60 mb-1">{tournament.sport} · {tournament.formatType?.replace(/_/g, ' ')}</p>
          <h2 className="text-3xl font-black text-white mb-4 leading-tight">{tournament.name}</h2>
          <div className="flex flex-wrap gap-4 text-xs font-bold text-[var(--muted)]">
            <div className="flex items-center gap-1.5"><Users size={14} /><span>{tournament._count?.registrations} / {tournament.maxParticipants} Teams</span></div>
            {tournament.prizePoolTotal > 0 && <div className="flex items-center gap-1.5 text-yellow-400"><Trophy size={14} /><span>{tournament.prizePoolTotal.toLocaleString()} Coins Prize</span></div>}
            {tournament.entryFee > 0 && <div className="flex items-center gap-1.5"><Calendar size={14} /><span>{tournament.entryFee} Coins Entry</span></div>}
          </div>
        </div>
      </div>

      {/* Register CTA */}
      {tournament.status === 'REGISTRATION_OPEN' && (
        <div className="px-4 py-4 border-b border-white/5 bg-blue-500/5">
          <button
            onClick={() => setIsRegistering(true)}
            className="w-full bg-blue-500 text-white font-black uppercase tracking-widest py-4 rounded-2xl hover:bg-blue-400 transition-colors"
          >
            Register Your Team
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-white/5 sticky top-[73px] z-30 bg-[#0a0a0a]">
        {(['overview', 'matches', 'standings'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3.5 text-xs font-black uppercase tracking-widest transition-all ${
              tab === t
                ? 'text-yellow-400 border-b-2 border-yellow-400'
                : 'text-neutral-500 hover:text-white'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="px-4 pt-5">
        {/* Overview Tab */}
        {tab === 'overview' && (
          <div className="flex flex-col gap-6">
            {tournament.description && (
              <div className="bg-neutral-900 border border-white/5 rounded-2xl p-5">
                <h3 className="text-xs font-black uppercase tracking-widest text-[var(--muted)] mb-3">About</h3>
                <p className="text-sm text-neutral-300 leading-relaxed">{tournament.description}</p>
              </div>
            )}

            <div className="bg-neutral-900 border border-white/5 rounded-2xl p-5">
              <h3 className="text-xs font-black uppercase tracking-widest text-[var(--muted)] mb-4">Tournament Info</h3>
              <div className="space-y-3 text-sm">
                {[
                  ['Format', tournament.formatType?.replace(/_/g, ' ')],
                  ['Sport', tournament.sport],
                  ['Registration', tournament.registrationType === 'TEAM' ? 'Team-based' : 'Individual Players'],
                  ['Max Participants', tournament.maxParticipants],
                  ['Entry Fee', tournament.entryFee > 0 ? `${tournament.entryFee} Coins` : 'Free'],
                  ['Prize Pool', tournament.prizePoolTotal > 0 ? `${tournament.prizePoolTotal.toLocaleString()} Coins` : 'Trophy Only'],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
                    <span className="font-bold text-neutral-400">{label}</span>
                    <span className="font-black text-white">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {tournament.groups.length > 0 && (
              <div className="bg-neutral-900 border border-white/5 rounded-2xl p-5">
                <h3 className="text-xs font-black uppercase tracking-widest text-[var(--muted)] mb-4">Groups</h3>
                <div className="grid grid-cols-2 gap-3">
                  {tournament.groups.map((g: any) => (
                    <div key={g.id} className="bg-black/40 border border-white/5 rounded-xl p-4">
                      <p className="font-black text-yellow-400 mb-2">{g.name}</p>
                      <p className="text-xs text-neutral-400 font-bold">{g.teamIds?.length || 0} Teams</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Matches Tab */}
        {tab === 'matches' && (
          <div className="flex flex-col gap-3">
            {tournament.matches.length === 0 ? (
              <div className="py-20 text-center flex flex-col items-center">
                <Calendar size={48} className="text-neutral-800 mb-4" />
                <p className="text-neutral-500 font-bold">No matches scheduled yet.</p>
              </div>
            ) : tournament.matches.map((m: any) => (
              <div key={m.id} className={`bg-neutral-900 border rounded-2xl p-5 ${
                m.status === 'LIVE' ? 'border-red-500/30 bg-red-500/5' : 'border-white/5'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Match {m.matchNumber} · {m.stage}</span>
                  <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${
                    m.status === 'COMPLETED' ? 'bg-[#00ff41]/20 text-[#00ff41]' :
                    m.status === 'LIVE' ? 'bg-red-500/20 text-red-500' :
                    'bg-neutral-800 text-neutral-400'
                  }`}>{m.status.replace(/_/g, ' ')}</span>
                </div>
                <div className="flex items-center justify-center gap-4 text-center">
                  <div className="flex-1">
                    <div className="w-10 h-10 rounded-xl bg-neutral-800 flex items-center justify-center mx-auto mb-2">
                      <Users size={18} className="text-neutral-400" />
                    </div>
                    <p className="text-xs font-black text-white truncate">{m.teamAId === 'TBD' ? 'TBD' : m.teamAId.slice(0, 8)}</p>
                  </div>
                  <div className="px-3 py-1.5 bg-neutral-800 rounded-lg">
                    <p className="text-xs font-black text-[var(--muted)]">VS</p>
                  </div>
                  <div className="flex-1">
                    <div className="w-10 h-10 rounded-xl bg-neutral-800 flex items-center justify-center mx-auto mb-2">
                      <Users size={18} className="text-neutral-400" />
                    </div>
                    <p className="text-xs font-black text-white truncate">{m.teamBId === 'TBD' ? 'TBD' : m.teamBId.slice(0, 8)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Standings Tab */}
        {tab === 'standings' && (
          <div className="flex flex-col gap-6">
            {Object.keys(groupedStandings).length === 0 ? (
              <div className="py-20 text-center flex flex-col items-center">
                <Trophy size={48} className="text-neutral-800 mb-4" />
                <p className="text-neutral-500 font-bold">No standings yet — matches still in progress.</p>
              </div>
            ) : Object.entries(groupedStandings).map(([groupId, group]: [string, any]) => (
              <div key={groupId} className="bg-neutral-900 border border-white/5 rounded-2xl overflow-hidden">
                <div className="px-5 py-3 bg-yellow-500/10 border-b border-yellow-500/20">
                  <h3 className="font-black uppercase tracking-widest text-sm text-yellow-400">
                    {groupId === 'overall' ? 'Overall Standings' : groupNames[groupId] || 'Group'}
                  </h3>
                </div>
                <div className="divide-y divide-white/5">
                  {group.sort((a: any, b: any) => a.position - b.position).map((s: any) => (
                    <div key={s.id} className="flex items-center gap-4 px-5 py-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${s.position <= 2 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-neutral-800 text-neutral-400'}`}>
                        {s.position}
                      </span>
                      <span className="flex-1 font-bold text-sm text-white truncate">{s.teamId.slice(0, 16)}</span>
                      <div className="flex items-center gap-4 text-xs font-bold text-neutral-400 shrink-0">
                        <span title="Played">{s.played}P</span>
                        <span title="Won" className="text-[#00ff41]">{s.won}W</span>
                        <span title="Lost" className="text-red-400">{s.lost}L</span>
                        <span title="Points" className="text-white font-black text-sm">{s.points}pts</span>
                      </div>
                      {s.qualified && <span className="text-[9px] text-[#00ff41] font-black uppercase bg-[#00ff41]/10 px-2 py-0.5 rounded-full">Q</span>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
