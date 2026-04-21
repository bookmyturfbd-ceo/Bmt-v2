'use client';
import { useState, useMemo, useCallback } from 'react';
import { Settings2, Plus, UserCircle2, X, Search, Loader2, UserPlus, Crown, ChevronRight, Trophy, Swords, Medal, History, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { getRankData } from '@/lib/rankUtils';

interface SquadManagerProps {
  team: any;
  setTeam: (t: any) => void;
  myRole: string;
}

const FUTSAL_ROLES  = ['Forward', 'Midfielder', 'Defender', 'Goalkeeper'];
const CRICKET_ROLES = ['Batsman', 'Bowler', 'Wicket Keeper', 'Allrounder', 'WK Batsman'];

const TEAM_RANKS = [
  { key: 'manager',      label: 'Make Manager',     color: 'text-amber-400',  bg: 'hover:bg-amber-500/10 border-amber-500/20' },
  { key: 'captain',      label: 'Make Captain',      color: 'text-fuchsia-400',bg: 'hover:bg-fuchsia-500/10 border-fuchsia-500/20' },
  { key: 'vice_captain', label: 'Make Vice-Captain', color: 'text-purple-400', bg: 'hover:bg-purple-500/10 border-purple-500/20' },
  { key: 'member',       label: 'Demote to Member',  color: 'text-red-400',    bg: 'hover:bg-red-500/10 border-red-500/20' },
];

const ROLE_WEIGHT: Record<string, number> = {
  'owner': 5,
  'manager': 4,
  'captain': 3,
  'vice_captain': 2,
  'member': 1,
};

const FORMATIONS: Record<string, { label: string; coords: { x: number; y: number }[] }> = {
  // 5v5 / 6v6 Futsal
  '1-2-1': { label: 'Diamond (1-2-1)', coords: [{ x: 50, y: 85 }, { x: 25, y: 50 }, { x: 75, y: 50 }, { x: 50, y: 20 }, { x: 50, y: 95 }] },
  '2-2':   { label: 'Box (2-2)',       coords: [{ x: 30, y: 70 }, { x: 70, y: 70 }, { x: 30, y: 30 }, { x: 70, y: 30 }, { x: 50, y: 95 }] },
  '1-3':   { label: 'Y-Shape (1-3)',   coords: [{ x: 50, y: 75 }, { x: 20, y: 35 }, { x: 50, y: 20 }, { x: 80, y: 35 }, { x: 50, y: 95 }] },
  '3-1':   { label: 'Pyramid (3-1)',   coords: [{ x: 20, y: 65 }, { x: 50, y: 75 }, { x: 80, y: 65 }, { x: 50, y: 25 }, { x: 50, y: 95 }] },
  '2-2-1': { label: '2-2-1',          coords: [{ x: 30, y: 75 }, { x: 70, y: 75 }, { x: 30, y: 45 }, { x: 70, y: 45 }, { x: 50, y: 20 }, { x: 50, y: 95 }] },
  '2-1-2': { label: '2-1-2',          coords: [{ x: 30, y: 75 }, { x: 70, y: 75 }, { x: 50, y: 50 }, { x: 30, y: 25 }, { x: 70, y: 25 }, { x: 50, y: 95 }] },
  '3-2':   { label: '3-2',            coords: [{ x: 20, y: 70 }, { x: 50, y: 75 }, { x: 80, y: 70 }, { x: 35, y: 30 }, { x: 65, y: 30 }, { x: 50, y: 95 }] },
  // Football 11v11
  '4-4-2': { label: '4-4-2', coords: [{ x: 50, y: 95 }, { x: 20, y: 75 }, { x: 40, y: 75 }, { x: 60, y: 75 }, { x: 80, y: 75 }, { x: 20, y: 45 }, { x: 40, y: 45 }, { x: 60, y: 45 }, { x: 80, y: 45 }, { x: 35, y: 15 }, { x: 65, y: 15 }] },
  '4-3-3': { label: '4-3-3', coords: [{ x: 50, y: 95 }, { x: 20, y: 75 }, { x: 40, y: 75 }, { x: 60, y: 75 }, { x: 80, y: 75 }, { x: 25, y: 45 }, { x: 50, y: 45 }, { x: 75, y: 45 }, { x: 20, y: 15 }, { x: 50, y: 15 }, { x: 80, y: 15 }] },
  '4-2-3-1': { label: '4-2-3-1', coords: [{ x: 50, y: 95 }, { x: 20, y: 75 }, { x: 40, y: 75 }, { x: 60, y: 75 }, { x: 80, y: 75 }, { x: 35, y: 55 }, { x: 65, y: 55 }, { x: 20, y: 35 }, { x: 50, y: 35 }, { x: 80, y: 35 }, { x: 50, y: 15 }] },
  '3-5-2': { label: '3-5-2', coords: [{ x: 50, y: 95 }, { x: 25, y: 75 }, { x: 50, y: 75 }, { x: 75, y: 75 }, { x: 15, y: 45 }, { x: 35, y: 45 }, { x: 50, y: 45 }, { x: 65, y: 45 }, { x: 85, y: 45 }, { x: 35, y: 15 }, { x: 65, y: 15 }] },
  '5-3-2': { label: '5-3-2', coords: [{ x: 50, y: 95 }, { x: 15, y: 75 }, { x: 35, y: 75 }, { x: 50, y: 75 }, { x: 65, y: 75 }, { x: 85, y: 75 }, { x: 25, y: 45 }, { x: 50, y: 45 }, { x: 75, y: 45 }, { x: 35, y: 15 }, { x: 65, y: 15 }] },
  // Cricket Standard & Full
  'oval-7':{ label: 'Standard Field (7v7)', coords: [{ x: 50, y: 70 }, { x: 50, y: 30 }, { x: 50, y: 85 }, { x: 80, y: 60 }, { x: 20, y: 60 }, { x: 75, y: 25 }, { x: 25, y: 25 }] },
  'oval-11':{ label: 'Full Field (11v11)', coords: [{ x: 50, y: 85 }, { x: 50, y: 15 }, { x: 20, y: 50 }, { x: 80, y: 50 }, { x: 30, y: 70 }, { x: 70, y: 70 }, { x: 30, y: 30 }, { x: 70, y: 30 }, { x: 15, y: 30 }, { x: 85, y: 30 }, { x: 50, y: 50 }] },
};

// ── Role Badge ─────────────────────────────────────────────────────────────
function RoleBadge({ role }: { role: string }) {
  if (role === 'owner')        return <Crown size={11} className="text-amber-400 shrink-0" />;
  if (role === 'manager')      return <span className="text-[8px] font-black bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-md border border-amber-500/30 shrink-0">M</span>;
  if (role === 'captain')      return <span className="text-[8px] font-black bg-fuchsia-500/20 text-fuchsia-400 px-1.5 py-0.5 rounded-md border border-fuchsia-500/30 shrink-0">C</span>;
  if (role === 'vice_captain') return <span className="text-[8px] font-black bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded-md border border-purple-500/30 shrink-0">VC</span>;
  return null;
}

// ── Rank Badge ──────────────────────────────────────────────────────────────
function RankBadge({ mmr, inline = false }: { mmr: number, inline?: boolean }) {
  const d = getRankData(mmr);
  const border = `border-[${d.color}]/40`;
  if (inline) return <span className="inline-flex items-center gap-1.5"><img src={d.icon} className="h-6 w-auto object-contain drop-shadow-md" alt="Rank" /><span className={`font-black text-xs`} style={{ color: d.color }}>{d.label}</span></span>;
  return (
    <div className={`flex flex-col items-center justify-center px-4 py-2.5 rounded-xl bg-neutral-900/50 border border-white/10 shadow-lg shadow-black/50 overflow-hidden relative`}>
      <img src={d.icon} className="h-8 w-auto object-contain mb-1 drop-shadow-lg relative z-10" alt="Rank" />
      <span className="text-[10px] uppercase font-black tracking-widest drop-shadow-md relative z-10 leading-none" style={{ color: d.color }}>{d.tier}</span>
      {d.division && <span className="text-[8px] font-black mt-0.5 opacity-80 relative z-10 leading-none" style={{ color: d.color }}>{d.division}</span>}
    </div>
  );
}

// ── Match Donut Chart ──────────────────────────────────────────────────────
function StatDonut({ w, l, d, size = 64 }: { w: number, l: number, d: number, size?: number }) {
  const total = w + l + d;
  if (total === 0) return <div className="rounded-full border-4 border-neutral-800 flex items-center justify-center" style={{ width: size, height: size }}><span className="text-[10px] text-[var(--muted)]">0/0</span></div>;
  const wPct = (w / total) * 100;
  const lPct = (l / total) * 100;
  const conic = `conic-gradient(from 0deg, #00ff41 0% ${wPct}%, #ef4444 ${wPct}% ${wPct + lPct}%, #3b82f6 ${wPct + lPct}% 100%)`;
  return (
    <div className="relative rounded-full flex items-center justify-center shadow-lg shadow-black/40" style={{ width: size, height: size, background: conic }}>
      <div className="absolute inset-[4px] bg-neutral-900 rounded-full flex flex-col items-center justify-center">
        <span className="text-[12px] font-black leading-none">{Math.round(wPct)}%</span>
        <span className="text-[7px] text-[var(--muted)] tracking-widest leading-none mt-1">WIN</span>
      </div>
    </div>
  );
}

// ── Player Card ────────────────────────────────────────────────────────────
function PlayerCard({ m, isOMC, isPitch, onClick }: { m: any; isOMC: boolean; isPitch: boolean; onClick: () => void }) {
  return (
    <div
      className="relative flex items-center gap-3 px-3 py-2.5 rounded-xl border border-white/5 bg-neutral-800/50 hover:bg-neutral-800 transition-all cursor-pointer group"
      onClick={onClick}
    >
      {/* PITCH badge — top-right corner */}
      {isPitch && (
        <span className="absolute top-1.5 right-2 text-[7px] font-black uppercase tracking-widest text-accent bg-accent/10 border border-accent/30 px-1.5 py-0.5 rounded-full">Pitch</span>
      )}

      {/* Avatar */}
      <div className="w-9 h-9 rounded-full overflow-hidden bg-neutral-900 border border-white/10 shrink-0 flex items-center justify-center">
        {m.player.avatarUrl
          ? <img src={m.player.avatarUrl} className="w-full h-full object-cover" />
          : <UserCircle2 size={18} className="text-[var(--muted)]" />}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <RoleBadge role={m.role} />
          <p className="text-sm font-bold truncate leading-tight">{m.player.fullName}</p>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {m.sportRole
            ? <span className="text-[9px] font-black text-accent uppercase tracking-wider">{m.sportRole}</span>
            : <span className="text-[9px] text-white/30 italic">No position</span>}
        </div>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <span className="text-[10px] font-black bg-neutral-800 px-2 py-0.5 rounded-md border border-white/10 text-white/70">{m.player.mmr ?? 1000} <span className="text-[#00ff41]">MMR</span></span>
          <RankBadge mmr={m.player.mmr ?? 1000} inline={true} />
        </div>
      </div>

      {/* Arrow */}
      {isOMC && <ChevronRight size={14} className="text-white/20 group-hover:text-white/50 transition-colors shrink-0" />}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function SquadManager({ team, setTeam, myRole }: SquadManagerProps) {
  const isCricket  = team.sportType?.includes('CRICKET');
  const isFull     = team.sportType?.includes('FULL');
  const roleOptions = isCricket ? CRICKET_ROLES : FUTSAL_ROLES;
  const isOMC = ['owner', 'manager', 'captain'].includes(myRole);
  const isOM  = ['owner', 'manager'].includes(myRole);

  let maxPlayers = 5;
  if (team.sportType === 'FUTSAL_6') maxPlayers = 6;
  if (team.sportType === 'FUTSAL_7' || team.sportType === 'CRICKET_7') maxPlayers = 7;
  if (isFull) maxPlayers = 11;

  const activeFormation = (team.formation && FORMATIONS[team.formation])
    ? team.formation
    : (isCricket ? (isFull ? 'oval-11' : 'oval-7') : (isFull ? '4-3-3' : maxPlayers === 6 ? '2-2-1' : '1-2-1'));

  const coords = FORMATIONS[activeFormation]?.coords || [];

  // ── State ─────────────────────────────────────────────────────────────────
  const [activeSlot,   setActiveSlot]   = useState<number | null>(null);
  const [playerModal,  setPlayerModal]  = useState<any | null>(null); // selected member
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQ,      setSearchQ]      = useState('');
  const [searchResults,setSearchResults]= useState<any[]>([]);
  const [searching,    setSearching]    = useState(false);
  const [adding,       setAdding]       = useState<string | null>(null);
  const [removing,     setRemoving]     = useState(false);
  const [loadingRole,  setLoadingRole]  = useState(false);
  const [cmFee,        setCmFee]        = useState<number | null>(null);
  const [showSubConfirm, setShowSubConfirm] = useState(false);
  const [subscribing,  setSubscribing]  = useState(false);

  // Fetch CM fee for the subscribe button
  useMemo(() => {
    fetch('/api/admin/challenge-market')
      .then(r => r.json())
      .then(d => { if (d.cmFee != null) setCmFee(d.cmFee); })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Derived ───────────────────────────────────────────────────────────────
  const starters = useMemo(() => {
    const arr: (any | null)[] = new Array(maxPlayers).fill(null);
    team.members.forEach((m: any) => {
      if (m.isStarter && m.pitchPosition !== null && m.pitchPosition < maxPlayers)
        arr[m.pitchPosition] = m;
    });
    return arr;
  }, [team.members, maxPlayers]);

  const mainRoster = useMemo(() =>
    team.members
      .filter((m: any) => m.isStarter && m.pitchPosition !== null && m.pitchPosition < maxPlayers)
      .sort((a: any, b: any) => (ROLE_WEIGHT[b.role] || 0) - (ROLE_WEIGHT[a.role] || 0)),
    [team.members, maxPlayers]);

  const subsRoster = useMemo(() =>
    team.members
      .filter((m: any) => !m.isStarter || m.pitchPosition === null || m.pitchPosition >= maxPlayers)
      .sort((a: any, b: any) => (ROLE_WEIGHT[b.role] || 0) - (ROLE_WEIGHT[a.role] || 0)),
    [team.members, maxPlayers]);

  const matches = useMemo(() => {
    const all = [...(team.matchesAsTeamA || []), ...(team.matchesAsTeamB || [])];
    return all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [team.matchesAsTeamA, team.matchesAsTeamB]);

  const stats = useMemo(() => {
    let w = 0, l = 0, d = 0;
    matches.forEach(m => {
      if (m.status !== 'COMPLETED') return;
      if (m.winnerId === team.id) w++;
      else if (m.winnerId === null && m.scoreA === m.scoreB) d++;
      else l++;
    });
    return { w, l, d, played: w + l + d };
  }, [matches, team.id]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const patch = (body: object) =>
    fetch(`/api/teams/${team.id}`, { method: 'PATCH', body: JSON.stringify(body) });

  const handleSetFormation = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const f = e.target.value;
    const res = await patch({ action: 'set_formation', payload: { formation: f } });
    if (res.ok) setTeam({ ...team, formation: f });
  };

  const handleAssignSlot = async (memberId: string, positionIndex: number) => {
    const current = starters[positionIndex];
    const newMembers = team.members
      .map((m: any) => current && m.id === current.id ? { ...m, isStarter: false, pitchPosition: null } : m)
      .map((m: any) => m.id === memberId ? { ...m, isStarter: true, pitchPosition: positionIndex } : m);
    setTeam({ ...team, members: newMembers });
    setActiveSlot(null);
    await patch({
      action: 'set_lineup',
      payload: {
        lineupUpdates: [
          { memberId, isStarter: true, pitchPosition: positionIndex },
          ...(current ? [{ memberId: current.id, isStarter: false, pitchPosition: null }] : [])
        ]
      }
    });
  };

  const handleRemoveFromSlot = async (memberId: string) => {
    setTeam({ ...team, members: team.members.map((m: any) => m.id === memberId ? { ...m, isStarter: false, pitchPosition: null } : m) });
    await patch({ action: 'set_lineup', payload: { lineupUpdates: [{ memberId, isStarter: false, pitchPosition: null }] } });
  };

  const handleSetRole = async (memberId: string, sportRole: string) => {
    setLoadingRole(true);
    const res = await patch({ action: 'set_sport_role', payload: { memberId, sportRole } });
    if (res.ok) {
      setTeam({ ...team, members: team.members.map((m: any) => m.id === memberId ? { ...m, sportRole } : m) });
      setPlayerModal((prev: any) => prev ? { ...prev, sportRole } : null);
    }
    setLoadingRole(false);
  };

  const handleSetTeamRank = async (memberId: string, newRole: string) => {
    setLoadingRole(true);
    const res = await patch({ action: 'set_team_role', payload: { targetMemberId: memberId, newRole } });
    if (res.ok) {
      const refresh = await fetch(`/api/teams/${team.id}`).then(r => r.json());
      setTeam(refresh.team);
      setPlayerModal(null);
    }
    setLoadingRole(false);
  };

  const handleKick = async () => {
    if (!playerModal) return;
    if (!confirm(`Remove ${playerModal.player.fullName} from the team? This cannot be undone.`)) return;
    setRemoving(true);
    const res = await patch({ action: 'kick_member', payload: { targetMemberId: playerModal.id } });
    if (res.ok) {
      setTeam({ ...team, members: team.members.filter((m: any) => m.id !== playerModal.id) });
      setPlayerModal(null);
    }
    setRemoving(false);
  };

  const handleSearchPlayer = useCallback(async (q: string) => {
    setSearchQ(q);
    if (q.length < 3) { setSearchResults([]); return; }
    setSearching(true);
    const data = await fetch(`/api/players/search?q=${encodeURIComponent(q)}`).then(r => r.json());
    setSearchResults(data.players || []);
    setSearching(false);
  }, []);

  const handleAddPlayer = async (playerId: string) => {
    setAdding(playerId);
    const res = await patch({ action: 'add_member', payload: { targetPlayerId: playerId } });
    const data = await res.json();
    if (res.ok && data.member) {
      setTeam({ ...team, members: [...team.members, data.member] });
      setSearchResults(prev => prev.filter(p => p.id !== playerId));
    }
    setAdding(null);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="w-full flex flex-col gap-5">

      {/* Formation Bar */}
      {isOMC && !isCricket && (
        <div className="glass-panel px-4 py-2.5 rounded-xl border border-[var(--panel-border)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings2 size={14} className="text-accent" />
            <span className="text-[11px] font-black uppercase tracking-widest">Formation</span>
          </div>
          <select
            value={activeFormation}
            onChange={handleSetFormation}
            className="bg-neutral-900 border border-white/10 rounded-lg px-3 py-1.5 text-[11px] font-bold focus:outline-none focus:border-accent"
          >
            {Object.keys(FORMATIONS)
              .filter(k => {
                if (isCricket) return false;
                const sum = k.split('-').reduce((a, b) => a + Number(b), 0);
                if (maxPlayers === 11) return sum === 10; // 10 fielders (excl GK which is assumed) -> sum=10. e.g. 4-4-2 = 10, 4-3-3 = 10
                if (maxPlayers === 7) return sum === 6;   // e.g. if we had 7v7 formations (assume sum=6). Actually we don't have 7v7 yet, but just in case.
                return maxPlayers === 5 ? sum === 4 : sum === 5;
              })
              .map(k => <option key={k} value={k}>{FORMATIONS[k].label}</option>)}
          </select>
        </div>
      )}

      {/* Graphical Pitch */}
      <div className="relative w-full aspect-[2/3] md:aspect-[3/4] max-w-md mx-auto rounded-[2rem] border-4 border-white/10 shadow-2xl bg-gradient-to-b from-green-900/40 to-black">
        {/* BG Markings */}
        <div className="absolute inset-0 rounded-[1.75rem] overflow-hidden pointer-events-none">
          {isCricket ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-[90%] h-[90%] rounded-[100%] border-2 border-white/20 flex items-center justify-center">
                <div className="w-[30%] h-[30%] rounded-[100%] border border-white/10 flex items-center justify-center">
                  <div className="w-4 h-16 bg-[#e4d9b3]/80 border-2 border-[#b09d6c] rounded-sm" />
                </div>
              </div>
            </div>
          ) : (
            <div className="absolute inset-0 p-4">
              <div className="w-full h-full border border-white/20 relative">
                <div className="absolute top-1/2 left-0 w-full h-[1px] bg-white/20" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full border border-white/20" />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-16 border-b border-l border-r border-white/20 rounded-b-[2rem]" />
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-16 border-t border-l border-r border-white/20 rounded-t-[2rem]" />
              </div>
            </div>
          )}
        </div>

        {/* Slots */}
        {coords.map((pos, i) => {
          const occupant = starters[i];
          return (
            <div
              key={i}
              className="absolute z-20 flex flex-col items-center -translate-x-1/2 -translate-y-1/2"
              style={{ top: `${pos.y}%`, left: `${pos.x}%` }}
            >
              {occupant ? (
                <>
                  <div
                    onClick={() => isOMC && handleRemoveFromSlot(occupant.id)}
                    className={`${isFull ? 'w-8 h-8 focus:scale-105' : 'w-10 h-10'} rounded-full border-2 border-accent bg-neutral-900 shadow-xl overflow-hidden flex items-center justify-center relative cursor-pointer group`}
                  >
                    {occupant.player.avatarUrl
                      ? <img src={occupant.player.avatarUrl} className="w-full h-full object-cover" />
                      : <UserCircle2 size={isFull ? 18 : 22} className="text-[var(--muted)]" />}
                    {isOMC && (
                      <div className="absolute inset-0 bg-red-500/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                        <X size={14} className="text-white" />
                      </div>
                    )}
                  </div>
                  <div className="bg-black/80 backdrop-blur-md px-1.5 py-0.5 mt-1 rounded text-center shadow-lg" style={{ minWidth: isFull ? 42 : 52, maxWidth: isFull ? 56 : 68 }}>
                    <p className={`${isFull ? 'text-[7px]' : 'text-[9px]'} font-bold truncate text-white`}>{occupant.player.fullName.split(' ')[0]}</p>
                    {occupant.sportRole && <p className={`text-[6px] font-black uppercase text-accent tracking-widest leading-tight`}>{occupant.sportRole}</p>}
                  </div>
                </>
              ) : (
                <button
                  onClick={() => isOMC && setActiveSlot(activeSlot === i ? null : i)}
                  className={`w-10 h-10 rounded-full border border-dashed flex items-center justify-center transition-all bg-black/40
                    ${activeSlot === i ? 'border-accent text-accent scale-110 shadow-[0_0_15px_rgba(0,255,65,0.4)]' : 'border-white/30 text-white/30 hover:border-white/60 hover:text-white/60'}`}
                >
                  <Plus size={18} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Slot (Subs Picker) Modal ── */}
      {activeSlot !== null && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-5" onClick={() => setActiveSlot(null)}>
          <div className="w-full max-w-xs bg-neutral-900 border border-[var(--panel-border)] rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
              <p className="text-sm font-black">Assign to Slot {(activeSlot ?? 0) + 1}</p>
              <button onClick={() => setActiveSlot(null)} className="p-1 rounded-lg hover:bg-white/10"><X size={16} /></button>
            </div>
            <div className="max-h-72 overflow-y-auto p-2 flex flex-col gap-1.5">
              {subsRoster.length === 0 ? (
                <p className="text-xs text-center text-white/40 py-6">No substitutes available.</p>
              ) : (
                subsRoster.map((sub: any) => (
                  <button
                    key={sub.id}
                    onClick={() => handleAssignSlot(sub.id, activeSlot!)}
                    className="flex items-center gap-3 p-2.5 hover:bg-neutral-800 rounded-xl text-left transition-colors w-full border border-white/5 hover:border-accent/30"
                  >
                    <div className="w-8 h-8 rounded-full bg-neutral-800 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center">
                      {sub.player.avatarUrl ? <img src={sub.player.avatarUrl} className="w-full h-full object-cover" /> : <UserCircle2 size={16} className="text-[var(--muted)]" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{sub.player.fullName}</p>
                      <p className="text-[9px] text-accent font-black uppercase tracking-widest">{sub.sportRole || 'No Position'}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Add Player Button ── */}
      {isOM && (
        <button
          onClick={() => { setShowAddModal(true); setSearchQ(''); setSearchResults([]); }}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-dashed border-accent/40 text-accent hover:bg-accent/10 hover:border-accent font-bold text-sm transition-all"
        >
          <UserPlus size={16} />
          Add Player to Roster
        </button>
      )}

      {/* ── Coaching Staff (Placeholder) ── */}
      <div className="glass-panel rounded-2xl border border-[var(--panel-border)] overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
          <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
          <h3 className="font-black text-[11px] uppercase tracking-widest text-[#a1a1aa]">Coaching Staff</h3>
        </div>
        <div className="p-4 text-center">
          <p className="text-xs text-white/40 italic">No coaching staff assigned yet</p>
        </div>
      </div>

      {/* ── Main Roster ── */}
      <div className="glass-panel rounded-2xl border border-[var(--panel-border)] overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
          <span className="w-2 h-2 rounded-full bg-accent shrink-0" />
          <h3 className="font-black text-[11px] uppercase tracking-widest">Starting {mainRoster.length}/{maxPlayers}</h3>
        </div>
        <div className="p-2 flex flex-col gap-1.5">
          {mainRoster.length === 0 ? (
            <p className="text-xs text-center text-white/30 py-4 italic">No starters assigned — tap + on the pitch</p>
          ) : mainRoster.map((m: any) => (
            <PlayerCard key={m.id} m={m} isOMC={isOMC} isPitch={true} onClick={() => isOMC && setPlayerModal(m)} />
          ))}
        </div>
      </div>

      {/* ── Substitutes Roster ── */}
      <div className="glass-panel rounded-2xl border border-[var(--panel-border)] overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
          <span className="w-2 h-2 rounded-full bg-white/30 shrink-0" />
          <h3 className="font-black text-[11px] uppercase tracking-widest text-[var(--muted)]">Substitutes {subsRoster.length}</h3>
        </div>
        <div className="p-2 flex flex-col gap-1.5">
          {subsRoster.length === 0 ? (
            <p className="text-xs text-center text-white/30 py-4 italic">All players are in the starting lineup</p>
          ) : subsRoster.map((m: any) => (
            <PlayerCard key={m.id} m={m} isOMC={isOMC} isPitch={false} onClick={() => isOMC && setPlayerModal(m)} />
          ))}
        </div>
      </div>

      {/* ── Match Stats & History ── */}
      <div className="glass-panel rounded-2xl border border-[var(--panel-border)] overflow-hidden relative">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
          <History size={14} className="text-accent" />
          <h3 className="font-black text-[11px] uppercase tracking-widest">Match History</h3>
          <span className="ml-auto text-[8px] font-black uppercase text-accent bg-accent/10 px-2 py-0.5 rounded-full border border-accent/20">Season 1</span>
        </div>
        <div className="p-4">
          <div className="flex items-center justify-between gap-4 mb-5 p-3 rounded-xl bg-neutral-800/30 border border-white/5">
            <div className="flex items-center gap-4">
              <StatDonut w={stats.w} l={stats.l} d={stats.d} size={60} />
              <div className="flex flex-col">
                <span className="text-xs font-black text-white">{stats.played} <span className="text-[10px] text-[var(--muted)] uppercase tracking-wider font-bold">Played</span></span>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#00ff41]"></span><span className="text-[10px] font-bold text-white">{stats.w} W</span></div>
                  <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span><span className="text-[10px] font-bold text-white">{stats.l} L</span></div>
                  <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span><span className="text-[10px] font-bold text-white">{stats.d} D</span></div>
                </div>
              </div>
            </div>
            <div className="shrink-0 flex flex-col items-center">
              <RankBadge mmr={team.teamMmr} />
            </div>
          </div>

          <h4 className="text-[10px] uppercase font-black tracking-widest text-[var(--muted)] mb-3">Recent Matches</h4>
          {matches.length === 0 ? (
            <p className="text-xs text-white/30 italic text-center py-4 bg-neutral-800/30 rounded-xl border border-white/5">No matches played yet.</p>
          ) : (
            <div className="flex overflow-x-auto snap-x snap-mandatory gap-3 pb-2 scrollbar-none">
              {matches.slice(0, 10).map((match: any) => {
                const isTeamA = match.teamA_Id === team.id;
                const opp = isTeamA ? match.teamB : match.teamA;
                const oppScore = isTeamA ? match.scoreB : match.scoreA;
                const myScore = isTeamA ? match.scoreA : match.scoreB;
                const mmrChg = isTeamA ? match.mmrChangeA : match.mmrChangeB;
                
                let resClass = 'bg-neutral-800/50 border-white/5 text-[var(--muted)]';
                let IconCode = Minus;
                if (match.status === 'COMPLETED') {
                  if (match.winnerId === team.id) { resClass = 'bg-accent/10 border-accent/20 text-accent'; IconCode = TrendingUp; }
                  else if (match.winnerId === null && myScore === oppScore) { resClass = 'bg-blue-500/10 border-blue-500/20 text-blue-400'; IconCode = Minus; }
                  else { resClass = 'bg-red-500/10 border-red-500/20 text-red-500'; IconCode = TrendingDown; }
                }

                return (
                  <div key={match.id} className="snap-start shrink-0 w-[200px] p-3 rounded-xl border bg-neutral-800/80 border-white/10 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${resClass}`}>
                        <IconCode size={14} />
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-black block">{myScore} - {oppScore}</span>
                        {match.status === 'COMPLETED' && (
                          <span className={`text-[10px] font-bold ${mmrChg > 0 ? 'text-accent' : mmrChg < 0 ? 'text-red-500' : 'text-zinc-400'}`}>
                            {mmrChg > 0 ? '+' : ''}{mmrChg} MMR
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                       {opp?.logoUrl ? <img src={opp.logoUrl} className="w-5 h-5 rounded-full object-cover" /> : <div className="w-5 h-5 rounded-full bg-neutral-700" />}
                       <div className="min-w-0">
                         <p className="text-[10px] font-bold truncate">vs {opp?.name || 'Unknown'}</p>
                         <p className="text-[8px] text-[var(--muted)]">{new Date(match.createdAt).toLocaleDateString()}</p>
                       </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Trophy Cabinet ── */}
      <div className="glass-panel rounded-2xl border border-[var(--panel-border)] overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
          <Trophy size={14} className="text-amber-400" />
          <h3 className="font-black text-[11px] uppercase tracking-widest text-[#a1a1aa]">Trophy Cabinet</h3>
        </div>
        <div className="p-6 text-center">
          <Trophy size={32} className="mx-auto text-amber-400/20 mb-2" />
          <p className="text-xs text-white/40 italic">Win Official Tournaments to earn trophies</p>
        </div>
      </div>

      {/* ── Hall of Fame ── */}
      <div className="glass-panel rounded-2xl border border-[var(--panel-border)] overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
          <Medal size={14} className="text-purple-400" />
          <h3 className="font-black text-[11px] uppercase tracking-widest text-[#a1a1aa]">Hall of Fame</h3>
        </div>
        <div className="p-6 text-center">
          <p className="text-xs text-white/40 italic">Top 3 highest ranked players will be showcased here</p>
        </div>
      </div>

      {/* ── Challenge Market Subscribe Button ── */}
      {team.isSubscribed || team.challengeSubscription?.active ? (
        <div className="w-full flex items-center justify-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-fuchsia-900/60 to-purple-900/60 border border-fuchsia-500/30">
          <Swords size={18} className="text-fuchsia-400" />
          <div className="text-left">
            <p className="font-black text-sm text-fuchsia-300">Challenge Market Active</p>
            <p className="text-[10px] text-fuchsia-400/70 uppercase tracking-widest">Your team is listed in the CM</p>
          </div>
          <div className="ml-auto w-2 h-2 rounded-full bg-fuchsia-400 animate-pulse" />
        </div>
      ) : (
        <button 
          onClick={() => setShowSubConfirm(true)}
          className="w-full flex flex-col items-center justify-center p-4 rounded-2xl bg-gradient-to-r from-red-600 to-fuchsia-600 hover:from-red-500 hover:to-fuchsia-500 transition-all shadow-[0_0_20px_rgba(255,0,100,0.2)] border border-white/20 group relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-3 opacity-20 transform translate-x-1/4 -translate-y-1/4 group-hover:scale-110 transition-transform">
            <Swords size={64} />
          </div>
          <div className="flex items-center gap-2 mb-1 relative z-10">
            <Swords size={20} className="text-white" />
            <span className="font-black text-lg text-white capitalize">Enter Challenge Market</span>
          </div>
          <div className="flex items-center gap-2 relative z-10">
            <span className="text-[11px] font-bold text-white/80 uppercase tracking-widest">Monthly Subscription</span>
            {cmFee != null && (
              <span className="text-[11px] font-black text-white bg-white/15 px-2 py-0.5 rounded-full border border-white/20">৳{cmFee}</span>
            )}
          </div>
        </button>
      )}

      {/* ── Player Action Modal (centered popup) ── */}
      {playerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/70 backdrop-blur-sm" onClick={() => setPlayerModal(null)}>
          <div className="w-full max-w-sm bg-neutral-900 border border-[var(--panel-border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-4 border-b border-white/5 bg-neutral-800/60">
              <div className="w-10 h-10 rounded-full bg-neutral-900 border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                {playerModal.player.avatarUrl ? <img src={playerModal.player.avatarUrl} className="w-full h-full object-cover" /> : <UserCircle2 size={20} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <RoleBadge role={playerModal.role} />
                  <p className="font-black text-sm truncate">{playerModal.player.fullName}</p>
                </div>
                <p className="text-[9px] text-[var(--muted)] mt-0.5">MMR {playerModal.player.mmr ?? 1000} · <RankBadge mmr={playerModal.player.mmr ?? 1000} inline={true} /></p>
              </div>
              <button onClick={() => setPlayerModal(null)} className="p-1.5 rounded-xl hover:bg-white/10 shrink-0"><X size={16} /></button>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto" style={{ maxHeight: '60vh' }}>

              {/* Sport Position */}
              <div className="px-4 pt-4">
                <p className="text-[9px] font-black uppercase tracking-widest text-[var(--muted)] mb-2">Sport Position</p>
                <div className="grid grid-cols-2 gap-2">
                  {roleOptions.map(role => (
                    <button
                      key={role}
                      onClick={() => handleSetRole(playerModal.id, role)}
                      disabled={loadingRole}
                      className={`py-2.5 px-3 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all border flex items-center justify-center gap-1.5
                        ${playerModal.sportRole === role
                          ? 'bg-accent/20 border-accent text-accent'
                          : 'bg-neutral-800 border-white/5 hover:border-accent/40 hover:bg-neutral-700 text-white/80'}`}
                    >
                      {loadingRole && playerModal.sportRole !== role ? null : null}
                      {role}
                    </button>
                  ))}
                </div>
              </div>

              {/* Team Rank */}
              {playerModal.role !== 'owner' && (myRole === 'owner' || myRole === 'manager') && (
                <div className="px-4 pt-4">
                  <p className="text-[9px] font-black uppercase tracking-widest text-[var(--muted)] mb-2">Team Rank</p>
                  <div className="flex flex-col gap-2">
                    {TEAM_RANKS
                      .filter(r => {
                        if (r.key === 'manager') return myRole === 'owner';
                        if (r.key === 'member') return playerModal.role !== 'member';
                        return true;
                      })
                      .map(r => (
                        <button
                          key={r.key}
                          onClick={() => handleSetTeamRank(playerModal.id, r.key)}
                          disabled={loadingRole}
                          className={`w-full text-left px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider border transition-all disabled:opacity-50 ${r.color} ${r.bg} bg-neutral-800/80`}
                        >
                          {r.label}
                        </button>
                      ))}
                  </div>
                </div>
              )}

              {/* Remove from Team */}
              {isOM && playerModal.role !== 'owner' && (
                <div className="px-4 pt-4 pb-4">
                  <div className="h-[1px] bg-white/5 mb-4" />
                  <button
                    onClick={handleKick}
                    disabled={removing}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-red-500/30 text-red-400 text-[11px] font-black uppercase tracking-widest hover:bg-red-500/10 transition-all disabled:opacity-50"
                  >
                    {removing ? <Loader2 size={14} className="animate-spin" /> : null}
                    Remove from Team
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Add Player Modal ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm" onClick={() => setShowAddModal(false)}>
          <div
            className="w-full max-w-md bg-neutral-900 border-t border-x border-[var(--panel-border)] rounded-t-3xl shadow-2xl flex flex-col"
            style={{ height: 'calc(100vh - 80px)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-[var(--panel-border)] shrink-0">
              <div>
                <h3 className="font-black text-base flex items-center gap-2"><UserPlus size={18} className="text-accent" /> Add Player</h3>
                <p className="text-[10px] text-[var(--muted)] mt-0.5">Search by name, email or phone</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-2 rounded-xl hover:bg-white/10"><X size={18} /></button>
            </div>
            <div className="p-4 shrink-0">
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
                {searching && <Loader2 size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-accent animate-spin" />}
                <input
                  autoFocus
                  type="text"
                  placeholder="Name, email or phone..."
                  value={searchQ}
                  onChange={e => handleSearchPlayer(e.target.value)}
                  className="w-full bg-neutral-800 border border-[var(--panel-border)] rounded-xl pl-9 pr-9 py-3 text-sm outline-none focus:border-accent"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-4 pb-6 flex flex-col gap-2">
              {searchQ.length < 3 ? (
                <p className="text-xs text-center text-[var(--muted)] py-10">Type at least 3 characters...</p>
              ) : searchResults.length === 0 && !searching ? (
                <p className="text-xs text-center text-[var(--muted)] py-10">No players found.</p>
              ) : (
                searchResults.map(player => {
                  const alreadyMember = team.members.some((m: any) => m.playerId === player.id);
                  return (
                    <div key={player.id} className="flex items-center gap-3 p-3 rounded-xl bg-neutral-800/60 border border-white/5 hover:border-white/10">
                      <div className="w-10 h-10 rounded-full bg-neutral-900 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center">
                        {player.avatarUrl ? <img src={player.avatarUrl} className="w-full h-full object-cover" /> : <UserCircle2 size={20} className="text-[var(--muted)]" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate">{player.fullName}</p>
                        <p className="text-[10px] text-[var(--muted)] truncate">{player.email}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[9px] font-black text-accent">MMR {player.mmr}</span>
                          <span className="text-[9px] text-[var(--muted)]">LVL {player.level}</span>
                        </div>
                      </div>
                      {alreadyMember ? (
                        <span className="text-[10px] font-black text-green-500 uppercase px-2 py-1 bg-green-500/10 rounded-lg shrink-0">✓ On Team</span>
                      ) : (
                        <button
                          onClick={() => handleAddPlayer(player.id)}
                          disabled={adding === player.id}
                          className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-accent text-black font-black text-[11px] uppercase tracking-wider hover:bg-accent/80 disabled:opacity-50 shrink-0"
                        >
                          {adding === player.id ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                          Add
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Challenge Market Sub Modal ── */}
      {showSubConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setShowSubConfirm(false)}>
          <div className="bg-neutral-900 border border-fuchsia-500/30 rounded-3xl p-6 w-full max-w-sm flex flex-col items-center text-center shadow-[0_0_50px_rgba(200,0,255,0.15)] relative overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="absolute top-0 right-0 p-3 opacity-5 pointer-events-none transform translate-x-1/4 -translate-y-1/4">
              <Swords size={120} />
            </div>
            
            <div className="w-16 h-16 rounded-full bg-fuchsia-900/30 text-fuchsia-400 flex items-center justify-center mb-4">
              <Swords size={32} />
            </div>
            
            <h3 className="font-black text-xl mb-2 text-white">Activate Challenge Market</h3>
            <p className="text-[13px] text-fuchsia-200/80 mb-6 font-medium px-2 inline-block">
              Unlock global ranked matchmaking and climb the BMT Ladder!
            </p>

            <div className="w-full bg-black/40 border border-fuchsia-500/20 rounded-2xl p-4 mb-6">
               <div className="flex justify-between items-center mb-2">
                 <span className="text-xs text-[var(--muted)] font-bold uppercase">Monthly Fee</span>
                 <span className="font-black text-white bg-white/10 px-2 py-0.5 rounded-md">৳{cmFee ?? '...'}</span>
               </div>
               <p className="text-[10px] text-[var(--muted)] text-left leading-relaxed">
                 This amount will be deducted from your team owner's wallet automatically. 
                 If the balance falls below zero, a <strong>3-day grace period</strong> is given before suspension.
               </p>
            </div>

            <div className="w-full flex gap-3">
              <button 
                onClick={() => setShowSubConfirm(false)}
                disabled={subscribing}
                className="flex-[1] py-3 bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-xl transition-colors text-sm disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                disabled={subscribing}
                onClick={async () => {
                  setSubscribing(true);
                  const res = await patch({ action: 'subscribe_challenge' });
                  setSubscribing(false);
                  if (res.ok) {
                    setTeam({ ...team, isSubscribed: true });
                    setShowSubConfirm(false);
                  } else {
                    const data = await res.json().catch(() => ({}));
                    alert(data.error || 'Failed to subscribe.');
                  }
                }}
                className="flex-[2] py-3 bg-gradient-to-r from-red-600 to-fuchsia-600 hover:from-red-500 hover:to-fuchsia-500 text-white font-black uppercase tracking-wider rounded-xl transition-all shadow-[0_0_20px_rgba(255,0,100,0.3)] text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {subscribing ? <Loader2 size={16} className="animate-spin" /> : 'Confirm Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
