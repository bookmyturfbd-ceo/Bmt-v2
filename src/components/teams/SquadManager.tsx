'use client';
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Settings2, Plus, UserCircle2, X, Search, Loader2, UserPlus, Crown, ChevronRight, Trophy, Swords, Medal } from 'lucide-react';
import { getRankData } from '@/lib/rankUtils';
import { useParams } from 'next/navigation';

interface SquadManagerProps {
  team: any;
  setTeam: (t: any) => void;
  myRole: string;
  tournamentMatches?: any[];
}

const FUTSAL_POSITIONS = ['Goalkeeper', 'Defender', 'Winger', 'Pivot'];
const CRICKET_ROLES     = ['Batsman', 'Bowler', 'Wicket Keeper', 'Allrounder'];
const GENERIC_POSITIONS  = ['GK', 'DEF', 'MID', 'FWD'];

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

// Configurable Formations coordinates as % of pitch width/height
const FORMATIONS_CONFIG: Record<string, Record<string, { label: string; slots: { role: string; x: number; y: number }[] }>> = {
  '5v5': {
    '1-2-1': {
      label: '1-2-1 Diamond (default)',
      slots: [
        { role: 'GK', x: 50, y: 90 },
        { role: 'DEF', x: 50, y: 68 },
        { role: 'MID', x: 20, y: 44 }, // Ala L
        { role: 'MID', x: 80, y: 44 }, // Ala R
        { role: 'FWD', x: 50, y: 18 }  // Pivô
      ]
    },
    '2-2': {
      label: '2-2 Square',
      slots: [
        { role: 'GK', x: 50, y: 90 },
        { role: 'DEF', x: 28, y: 68 },
        { role: 'DEF', x: 72, y: 68 },
        { role: 'FWD', x: 28, y: 24 },
        { role: 'FWD', x: 72, y: 24 }
      ]
    },
    '2-1-1': {
      label: '2-1-1',
      slots: [
        { role: 'GK', x: 50, y: 90 },
        { role: 'DEF', x: 28, y: 72 },
        { role: 'DEF', x: 72, y: 72 },
        { role: 'MID', x: 50, y: 46 },
        { role: 'FWD', x: 50, y: 18 }
      ]
    },
    '1-1-2': {
      label: '1-1-2',
      slots: [
        { role: 'GK', x: 50, y: 90 },
        { role: 'DEF', x: 50, y: 72 },
        { role: 'MID', x: 50, y: 46 },
        { role: 'FWD', x: 28, y: 20 },
        { role: 'FWD', x: 72, y: 20 }
      ]
    },
    '1-2-1-y': {
      label: '1-2-1 Y',
      slots: [
        { role: 'GK', x: 50, y: 90 },
        { role: 'DEF', x: 50, y: 74 },
        { role: 'MID', x: 28, y: 36 },
        { role: 'MID', x: 72, y: 36 },
        { role: 'FWD', x: 50, y: 16 }
      ]
    }
  },
  '6v6': {
    '2-2-1': {
      label: '2-2-1 (default)',
      slots: [
        { role: 'GK', x: 50, y: 90 },
        { role: 'DEF', x: 28, y: 72 },
        { role: 'DEF', x: 72, y: 72 },
        { role: 'MID', x: 28, y: 42 },
        { role: 'MID', x: 72, y: 42 },
        { role: 'FWD', x: 50, y: 18 }
      ]
    },
    '1-2-2': {
      label: '1-2-2',
      slots: [
        { role: 'GK', x: 50, y: 90 },
        { role: 'DEF', x: 50, y: 72 },
        { role: 'MID', x: 28, y: 44 },
        { role: 'MID', x: 72, y: 44 },
        { role: 'FWD', x: 28, y: 20 },
        { role: 'FWD', x: 72, y: 20 }
      ]
    },
    '2-1-2': {
      label: '2-1-2',
      slots: [
        { role: 'GK', x: 50, y: 90 },
        { role: 'DEF', x: 28, y: 72 },
        { role: 'DEF', x: 72, y: 72 },
        { role: 'MID', x: 50, y: 44 },
        { role: 'FWD', x: 28, y: 20 },
        { role: 'FWD', x: 72, y: 20 }
      ]
    },
    '3-1-1': {
      label: '3-1-1',
      slots: [
        { role: 'GK', x: 50, y: 90 },
        { role: 'DEF', x: 20, y: 72 },
        { role: 'DEF', x: 50, y: 74 },
        { role: 'DEF', x: 80, y: 72 },
        { role: 'MID', x: 50, y: 44 },
        { role: 'FWD', x: 50, y: 18 }
      ]
    }
  },
  '7v7': {
    '2-3-1': {
      label: '2-3-1 (default)',
      slots: [
        { role: 'GK', x: 50, y: 90 },
        { role: 'DEF', x: 28, y: 74 },
        { role: 'DEF', x: 72, y: 74 },
        { role: 'MID', x: 18, y: 44 },
        { role: 'MID', x: 50, y: 44 },
        { role: 'MID', x: 82, y: 44 },
        { role: 'FWD', x: 50, y: 18 }
      ]
    },
    '3-2-1': {
      label: '3-2-1',
      slots: [
        { role: 'GK', x: 50, y: 90 },
        { role: 'DEF', x: 20, y: 74 },
        { role: 'DEF', x: 50, y: 76 },
        { role: 'DEF', x: 80, y: 74 },
        { role: 'MID', x: 32, y: 42 },
        { role: 'MID', x: 68, y: 42 },
        { role: 'FWD', x: 50, y: 18 }
      ]
    },
    '2-1-2-1': {
      label: '2-1-2-1',
      slots: [
        { role: 'GK', x: 50, y: 90 },
        { role: 'DEF', x: 28, y: 74 },
        { role: 'DEF', x: 72, y: 74 },
        { role: 'MID', x: 50, y: 54 },
        { role: 'MID', x: 28, y: 34 },
        { role: 'MID', x: 72, y: 34 },
        { role: 'FWD', x: 50, y: 14 }
      ]
    },
    '1-3-2': {
      label: '1-3-2',
      slots: [
        { role: 'GK', x: 50, y: 90 },
        { role: 'DEF', x: 50, y: 74 },
        { role: 'MID', x: 18, y: 44 },
        { role: 'MID', x: 50, y: 44 },
        { role: 'MID', x: 82, y: 44 },
        { role: 'FWD', x: 28, y: 20 },
        { role: 'FWD', x: 72, y: 20 }
      ]
    },
    '3-1-2': {
      label: '3-1-2',
      slots: [
        { role: 'GK', x: 50, y: 90 },
        { role: 'DEF', x: 20, y: 74 },
        { role: 'DEF', x: 50, y: 76 },
        { role: 'DEF', x: 80, y: 74 },
        { role: 'MID', x: 50, y: 44 },
        { role: 'FWD', x: 28, y: 20 },
        { role: 'FWD', x: 72, y: 20 }
      ]
    }
  },
  '11v11': {
    '4-3-3': {
      label: '4-3-3 (default)',
      slots: [
        { role: 'GK', x: 50, y: 90 },
        { role: 'DEF', x: 15, y: 72 },
        { role: 'DEF', x: 38, y: 74 },
        { role: 'DEF', x: 62, y: 74 },
        { role: 'DEF', x: 85, y: 72 },
        { role: 'MID', x: 25, y: 44 },
        { role: 'MID', x: 50, y: 46 },
        { role: 'MID', x: 75, y: 44 },
        { role: 'FWD', x: 20, y: 18 },
        { role: 'FWD', x: 50, y: 16 },
        { role: 'FWD', x: 80, y: 18 }
      ]
    },
    '4-4-2': {
      label: '4-4-2',
      slots: [
        { role: 'GK', x: 50, y: 90 },
        { role: 'DEF', x: 15, y: 72 },
        { role: 'DEF', x: 38, y: 74 },
        { role: 'DEF', x: 62, y: 74 },
        { role: 'DEF', x: 85, y: 72 },
        { role: 'MID', x: 15, y: 44 },
        { role: 'MID', x: 38, y: 46 },
        { role: 'MID', x: 62, y: 46 },
        { role: 'MID', x: 85, y: 44 },
        { role: 'FWD', x: 35, y: 18 },
        { role: 'FWD', x: 65, y: 18 }
      ]
    },
    '4-2-3-1': {
      label: '4-2-3-1',
      slots: [
        { role: 'GK', x: 50, y: 90 },
        { role: 'DEF', x: 15, y: 72 },
        { role: 'DEF', x: 38, y: 74 },
        { role: 'DEF', x: 62, y: 74 },
        { role: 'DEF', x: 85, y: 72 },
        { role: 'MID', x: 35, y: 54 },
        { role: 'MID', x: 65, y: 54 },
        { role: 'MID', x: 15, y: 32 },
        { role: 'MID', x: 50, y: 30 },
        { role: 'MID', x: 85, y: 32 },
        { role: 'FWD', x: 50, y: 14 }
      ]
    },
    '3-5-2': {
      label: '3-5-2',
      slots: [
        { role: 'GK', x: 50, y: 90 },
        { role: 'DEF', x: 25, y: 74 },
        { role: 'DEF', x: 50, y: 75 },
        { role: 'DEF', x: 75, y: 74 },
        { role: 'MID', x: 12, y: 44 },
        { role: 'MID', x: 34, y: 46 },
        { role: 'MID', x: 50, y: 48 },
        { role: 'MID', x: 66, y: 46 },
        { role: 'MID', x: 88, y: 44 },
        { role: 'FWD', x: 35, y: 18 },
        { role: 'FWD', x: 65, y: 18 }
      ]
    },
    '4-5-1': {
      label: '4-5-1',
      slots: [
        { role: 'GK', x: 50, y: 90 },
        { role: 'DEF', x: 15, y: 72 },
        { role: 'DEF', x: 38, y: 74 },
        { role: 'DEF', x: 62, y: 74 },
        { role: 'DEF', x: 85, y: 72 },
        { role: 'MID', x: 15, y: 44 },
        { role: 'MID', x: 34, y: 46 },
        { role: 'MID', x: 50, y: 48 },
        { role: 'MID', x: 66, y: 46 },
        { role: 'MID', x: 88, y: 44 },
        { role: 'FWD', x: 50, y: 18 }
      ]
    }
  }
};

function RoleBadge({ role }: { role: string }) {
  if (role === 'owner')        return <Crown size={11} className="text-amber-400 shrink-0" />;
  if (role === 'manager')      return <span className="text-[8px] font-black bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-md border border-amber-500/30 shrink-0">M</span>;
  if (role === 'captain')      return <span className="text-[8px] font-black bg-fuchsia-500/20 text-fuchsia-400 px-1.5 py-0.5 rounded-md border border-fuchsia-500/30 shrink-0">C</span>;
  if (role === 'vice_captain') return <span className="text-[8px] font-black bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded-md border border-purple-500/30 shrink-0">VC</span>;
  return null;
}

function CaptainBadge() {
  return (
    <div className="absolute -top-1.5 -right-1.5 w-4.5 h-4.5 rounded-full bg-amber-500 border border-black flex items-center justify-center shadow-md z-30" title="Captain">
      <Crown size={9} className="text-black" />
    </div>
  );
}

function RankBadge({ mmr, inline = false }: { mmr: number, inline?: boolean }) {
  const d = getRankData(mmr);
  if (inline) return <span className="inline-flex items-center gap-1.5"><img src={d.icon} className="h-6 w-auto object-contain drop-shadow-md" alt="Rank" /><span className={`font-black text-xs`} style={{ color: d.color }}>{d.label}</span></span>;
  return (
    <div className={`flex flex-col items-center justify-center px-4 py-2.5 rounded-xl bg-neutral-900/50 border border-white/10 shadow-lg shadow-black/50 overflow-hidden relative`}>
      <img src={d.icon} className="h-8 w-auto object-contain mb-1 drop-shadow-lg relative z-10" alt="Rank" />
      <span className="text-[10px] uppercase font-black tracking-widest drop-shadow-md relative z-10 leading-none" style={{ color: d.color }}>{d.tier}</span>
      {d.division && <span className="text-[8px] font-black mt-0.5 opacity-80 relative z-10 leading-none" style={{ color: d.color }}>{d.division}</span>}
    </div>
  );
}

function StatDonut({ w, l, d, size = 64 }: { w: number, l: number, d: number, size?: number }) {
  const total = w + l + d;
  if (total === 0) return <div className="rounded-full border-4 border-neutral-800 flex items-center justify-center" style={{ width: size, height: size }}><span className="text-[10px] text-[var(--muted)]">0/0</span></div>;
  const wPct = (w / total) * 100;
  const lPct = (l / total) * 100;
  const conic = `conic-gradient(from 0deg, #00ff41 0% ${wPct}%, #ef4444 ${wPct}% ${wPct + lPct}%, #3b82f6 ${wPct + lPct}% 100%)`;
  return (
    <div className="relative rounded-full flex items-center justify-center shadow-lg shadow-black/40 shrink-0" style={{ width: size, height: size, background: conic }}>
      <div className="absolute inset-[4px] bg-neutral-900 rounded-full flex flex-col items-center justify-center">
        <span className="text-[12px] font-black leading-none">{Math.round(wPct)}%</span>
        <span className="text-[7px] text-[var(--muted)] tracking-widest leading-none mt-1">WIN</span>
      </div>
    </div>
  );
}

function PlayerCard({ m, isOMC, isPitch, onClick, isCricket }: { m: any; isOMC: boolean; isPitch: boolean; onClick: () => void; isCricket: boolean }) {
  const pMmr = isCricket ? (m.player.cricketMmr ?? 1000) : (m.player.footballMmr ?? m.player.mmr ?? 1000);
  return (
    <div
      className="relative flex items-center gap-3 px-3 py-2.5 rounded-xl border border-white/5 bg-neutral-800/50 hover:bg-neutral-800 transition-all cursor-pointer group"
      onClick={onClick}
    >
      {isPitch && (
        <span className="absolute top-1.5 right-2 text-[7px] font-black uppercase tracking-widest text-accent bg-accent/10 border border-accent/30 px-1.5 py-0.5 rounded-full">Pitch</span>
      )}

      {/* Avatar */}
      <div className="w-9 h-9 rounded-full overflow-hidden bg-neutral-900 border border-white/10 shrink-0 flex items-center justify-center relative">
        {m.player.avatarUrl
          ? <img src={m.player.avatarUrl} className="w-full h-full object-cover" />
          : <UserCircle2 size={18} className="text-[var(--muted)]" />}
        {m.role === 'captain' && <CaptainBadge />}
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
            : <span className="text-[9px] text-white/30 italic">No preferred position</span>}
        </div>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <span className="text-[10px] font-black bg-neutral-800 px-2 py-0.5 rounded-md border border-white/10 text-white/70">{pMmr} <span className="text-[#00ff41]">MMR</span></span>
          <RankBadge mmr={pMmr} inline={true} />
        </div>
      </div>

      {isOMC && <ChevronRight size={14} className="text-white/20 group-hover:text-white/50 transition-colors shrink-0" />}
    </div>
  );
}

export default function SquadManager({ team, setTeam, myRole, tournamentMatches = [] }: SquadManagerProps) {
  const params = useParams();
  const locale = params?.locale || 'en';

  const isFutsal   = team.sportType?.startsWith('FUTSAL') || team.sportType === 'FUTSAL';
  const isCricket  = team.sportType?.startsWith('CRICKET') || team.sportType === 'CRICKET';
  const isFootball = team.sportType?.startsWith('FOOTBALL') || team.sportType === 'FOOTBALL';

  const roleOptions = isFutsal 
    ? FUTSAL_POSITIONS 
    : (isCricket ? CRICKET_ROLES : GENERIC_POSITIONS);

  const isOMC = ['owner', 'manager', 'captain'].includes(myRole);
  const isOM  = ['owner', 'manager'].includes(myRole);

  const rankedMmr = isCricket ? (team.cricketMmr ?? 1000) : (team.footballMmr ?? 1000);
  const tournamentMmr = isCricket ? (team.tournamentCricketMmr ?? 1000) : (team.tournamentFootballMmr ?? 1000);

  // Available match formats based on team's sport family
  const formatsList = useMemo(() => {
    if (isFutsal) return ['5v5', '6v6', '7v7'];
    if (isCricket) return ['7v7', '11v11'];
    return ['11v11']; // Football has no toggle, always 11
  }, [isFutsal, isCricket]);

  // Initial format defaults
  const [activeFormat, setActiveFormat] = useState<string>(() => {
    if (isFutsal) return '5v5';
    if (isCricket) return '7v7';
    return '11v11';
  });

  // DB templates states
  const [templates, setTemplates] = useState<any[]>([]);
  const [activeFormation, setActiveFormation] = useState<string>('1-2-1');
  const [activePositions, setActivePositions] = useState<Record<number, string | null>>({});

  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const pendingSaveRef = useRef<{ format: string; formation: string; positionsMap: Record<number, string | null> } | null>(null);
  const prevFormatRef = useRef<string | null>(null);

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [activeSlot,   setActiveSlot]   = useState<number | null>(null);
  const [playerModal,  setPlayerModal]  = useState<any | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQ,      setSearchQ]      = useState('');
  const [searchResults,setSearchResults]= useState<any[]>([]);
  const [searching,    setSearching]    = useState(false);
  const [adding,       setAdding]       = useState<string | null>(null);
  const [removing,     setRemoving]     = useState(false);
  const [sentRequests, setSentRequests] = useState<string[]>([]);
  const [loadingRole,  setLoadingRole]  = useState(false);

  const templatesRef = useRef<any[]>([]);
  useEffect(() => { templatesRef.current = templates; }, [templates]);

  // Load lineup templates from database on mount
  useEffect(() => {
    fetch(`/api/teams/${team.id}/lineup-templates`)
      .then(r => r.json())
      .then(data => {
        if (data.success && data.templates) {
          setTemplates(data.templates);
          setInitialLoadDone(true);
        }
      })
      .catch(() => {});
  }, [team.id]);

  // Sync from DB template ONLY when:
  //   (a) initial load just completed (prevFormatRef is still null), OR
  //   (b) the active format tab actually changes
  // Local state edits (setActivePositions) are always authoritative between these events.
  useEffect(() => {
    if (!initialLoadDone) return;

    const prevFmt = prevFormatRef.current;
    const isFirstLoad = prevFmt === null;
    const formatChanged = !isFirstLoad && prevFmt !== activeFormat;

    // Only proceed on first load or actual format tab switch
    if (!isFirstLoad && !formatChanged) return;

    prevFormatRef.current = activeFormat;

    const formatMap: Record<string, string> = {
      '5v5': 'F_5v5',
      '6v6': 'F_6v6',
      '7v7': 'F_7v7',
      '11v11': 'F_11v11',
    };
    const dbFormat = formatMap[activeFormat] || activeFormat;
    // Use ref so templates changes never re-trigger this effect
    const t = templatesRef.current.find(item => item.format === dbFormat);
    if (t) {
      setActiveFormation(t.formation);
      const posMap: Record<number, string | null> = {};
      const list = t.positions as any[];
      if (Array.isArray(list)) {
        list.forEach(p => { posMap[p.slotIndex] = p.playerId; });
      }
      setActivePositions(posMap);
    } else {
      const defaultFormations: Record<string, string> = {
        '5v5': '1-2-1',
        '6v6': '2-2-1',
        '7v7': '2-3-1',
        '11v11': '4-3-3',
      };
      setActiveFormation(defaultFormations[activeFormat] || '4-3-3');
      setActivePositions({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFormat, initialLoadDone]);


  // Formations list for active format
  const availableFormations = useMemo(() => {
    return FORMATIONS_CONFIG[activeFormat] || {};
  }, [activeFormat]);

  const activeCoordConfig = useMemo(() => {
    return availableFormations[activeFormation]?.slots || [];
  }, [availableFormations, activeFormation]);

  // Graphical Pitch starters mapping
  const starters = useMemo(() => {
    const arr: (any | null)[] = new Array(activeCoordConfig.length).fill(null);
    activeCoordConfig.forEach((_, i) => {
      const pid = activePositions[i];
      if (pid) {
        const found = team.members.find((m: any) => m.playerId === pid);
        if (found) arr[i] = found;
      }
    });
    return arr;
  }, [activeCoordConfig, activePositions, team.members]);

  // Bench strip: rostered players not in a starter slot
  const benchPlayers = useMemo(() => {
    const activeStarterIds = Object.values(activePositions).filter(Boolean);
    return team.members.filter((m: any) => !activeStarterIds.includes(m.playerId));
  }, [team.members, activePositions]);

  // Full roster list
  const fullRoster = useMemo(() => {
    return [...team.members].sort((a: any, b: any) => (ROLE_WEIGHT[b.role] || 0) - (ROLE_WEIGHT[a.role] || 0));
  }, [team.members]);

  // Match statistics calculations
  const rankedMatches = useMemo(() => {
    const all = [...(team.matchesAsTeamA || []), ...(team.matchesAsTeamB || [])];
    return all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [team.matchesAsTeamA, team.matchesAsTeamB]);

  const tMatches = useMemo(() => {
    const all = tournamentMatches || [];
    return [...all].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [tournamentMatches]);

  const rankedStats = useMemo(() => {
    let w = 0, l = 0, d = 0;
    rankedMatches.forEach(m => {
      if (m.status !== 'COMPLETED') return;
      if (m.winnerId === team.id) w++;
      else if (m.winnerId === null && m.scoreA === m.scoreB) d++;
      else l++;
    });
    return { w, l, d, played: w + l + d };
  }, [rankedMatches, team.id]);

  const tournamentStats = useMemo(() => {
    let w = 0, l = 0, d = 0;
    tMatches.forEach(m => {
      if (m.status !== 'COMPLETED') return;
      if (m.winnerId === team.id) w++;
      else if (m.winnerId === null) d++;
      else l++;
    });
    return { w, l, d, played: w + l + d };
  }, [tMatches, team.id]);

  const getTournamentMatchScore = useCallback((m: any) => {
    if (!m.resultSummary) return { myScore: '-', oppScore: '-' };
    const rs = m.resultSummary as any;
    const isTeamA = m.teamAId === team.id;
    if (isCricket) {
      const runsA = rs.runsA ?? 0;
      const wicketsA = rs.wicketsA ?? 0;
      const runsB = rs.runsB ?? 0;
      const wicketsB = rs.wicketsB ?? 0;
      
      const scoreAStr = `${runsA}/${wicketsA}`;
      const scoreBStr = `${runsB}/${wicketsB}`;
      
      return {
        myScore: isTeamA ? scoreAStr : scoreBStr,
        oppScore: isTeamA ? scoreBStr : scoreAStr
      };
    } else {
      const goalsA = rs.goalsA ?? 0;
      const goalsB = rs.goalsB ?? 0;
      return {
        myScore: isTeamA ? goalsA : goalsB,
        oppScore: isTeamA ? goalsB : goalsA
      };
    }
  }, [isCricket, team.id]);

  const getTournamentMmrChange = useCallback((m: any) => {
    if (!m.tournament || !m.tournament.mmrEnabled || m.status !== 'COMPLETED') return 0;
    const mult = m.tournament.mmrMultiplier ?? 1;
    if (m.winnerId === team.id) {
      return 25 * mult;
    } else if (m.winnerId === null) {
      return 5 * mult;
    } else {
      return -15 * mult;
    }
  }, [team.id]);

  // Debounced auto-saving to DB
  const executeSave = async () => {
    if (!pendingSaveRef.current) return;
    const { format, formation, positionsMap } = pendingSaveRef.current;
    pendingSaveRef.current = null;
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    const positionsList = Object.keys(positionsMap).map(k => ({
      slotIndex: Number(k),
      playerId: positionsMap[Number(k)]
    }));

    try {
      const res = await fetch(`/api/teams/${team.id}/lineup-templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format, formation, positions: positionsList })
      });
      if (res.ok) {
        setSaveStatus('saved');
        const data = await res.json();
        setTemplates(prev => {
          const filtered = prev.filter(t => t.format !== data.template.format);
          return [...filtered, data.template];
        });
        setTimeout(() => setSaveStatus('idle'), 2000);
      } else {
        setSaveStatus('idle');
      }
    } catch (e) {
      console.error(e);
      setSaveStatus('idle');
    }
  };

  const triggerSave = (format: string, formation: string, positionsMap: Record<number, string | null>) => {
    setSaveStatus('saving');
    pendingSaveRef.current = { format, formation, positionsMap };

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      await executeSave();
    }, 800);
  };

  const handleSetFormation = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const f = e.target.value;
    setActiveFormation(f);
    triggerSave(activeFormat, f, activePositions);
  };

  const handleFormatChange = async (fmt: string) => {
    if (pendingSaveRef.current) {
      await executeSave();
    }
    setActiveFormat(fmt);
    setActiveSlot(null);
  };

  const handleAssignSlot = (memberId: string, positionIndex: number) => {
    const member = team.members.find((m: any) => m.id === memberId);
    if (!member) return;

    const newPositions = { ...activePositions };
    // If player already in another slot, clear that slot
    Object.keys(newPositions).forEach(key => {
      const k = Number(key);
      if (newPositions[k] === member.playerId) {
        newPositions[k] = null;
      }
    });

    newPositions[positionIndex] = member.playerId;
    setActivePositions(newPositions);
    setActiveSlot(null);
    triggerSave(activeFormat, activeFormation, newPositions);
  };

  const handleRemoveFromSlot = (positionIndex: number) => {
    const newPositions = { ...activePositions };
    newPositions[positionIndex] = null;
    setActivePositions(newPositions);
    triggerSave(activeFormat, activeFormation, newPositions);
  };

  const patch = (body: object) =>
    fetch(`/api/teams/${team.id}`, { method: 'PATCH', body: JSON.stringify(body) });

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
    setSearchResults(Array.isArray(data) ? data : (data.players || []));
    setSearching(false);
  }, []);

  const handleAddPlayer = async (playerId: string) => {
    setAdding(playerId);
    try {
      const res = await patch({ action: 'add_member', payload: { targetPlayerId: playerId } });
      const data = await res.json();
      if (res.ok) {
        if (data.invitationSent) {
          setSentRequests(prev => [...prev, playerId]);
        } else if (data.member) {
          setTeam({ ...team, members: [...team.members, data.member] });
        }
      } else {
        alert(data.error || 'Failed to send invitation.');
      }
    } catch (err: any) {
      alert(err.message || 'An error occurred.');
    } finally {
      setAdding(null);
    }
  };

  const getSlotLabel = (format: string, slotIndex: number, role: string): string => {
    if (format === '5v5') {
      if (slotIndex === 0) return 'Goalkeeper (GK)';
      if (slotIndex === 1) return 'Defender (DEF)';
      if (slotIndex === 2 || slotIndex === 3) return 'Winger (ALA)';
      if (slotIndex === 4) return 'Pivot (FWD)';
    }
    return role;
  };

  return (
    <div className="w-full flex flex-col gap-5">

      {/* ── Add Player button — FIRST, full-width, primary green ── */}
      {isOM && (
        <button
          onClick={() => { setShowAddModal(true); setSearchQ(''); setSearchResults([]); }}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-sm transition-all"
          style={{ background: 'var(--accent)', color: '#000', boxShadow: '0 0 20px rgba(0,255,65,0.25)' }}
        >
          <UserPlus size={16} />
          + Add Player
        </button>
      )}

      {/* Format Toggle & Formation Selector Bar */}
      <div className="glass-panel px-4 py-3 rounded-xl border border-[var(--panel-border)] flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Toggle (shows only if formats > 1) */}
        {formatsList.length > 1 ? (
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black uppercase tracking-widest text-[#a1a1aa] mr-1">Format:</span>
            <div className="flex bg-neutral-800/80 p-0.5 rounded-lg border border-white/5">
              {formatsList.map(fmt => (
                <button
                  key={fmt}
                  onClick={() => handleFormatChange(fmt)}
                  className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-md transition-colors ${
                    activeFormat === fmt
                      ? 'bg-accent text-black font-black'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  {fmt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black uppercase tracking-widest text-accent">{activeFormat} Template</span>
          </div>
        )}

        {/* Formation dropdown & save status */}
        <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-2">
            <Settings2 size={13} className="text-accent" />
            <select
              value={activeFormation}
              onChange={handleSetFormation}
              disabled={!isOMC}
              className="bg-neutral-900 border border-white/10 rounded-lg px-3 py-1.5 text-[11px] font-bold focus:outline-none focus:border-accent cursor-pointer"
            >
              {Object.keys(availableFormations).map(k => (
                <option key={k} value={k}>{availableFormations[k].label}</option>
              ))}
            </select>
          </div>

          {/* Saved Status Indicator */}
          {saveStatus !== 'idle' && (
            <span className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 ${
              saveStatus === 'saved' ? 'text-green-400' : 'text-accent animate-pulse'
            }`}>
              {saveStatus === 'saved' ? '✓ Saved' : 'Saving...'}
            </span>
          )}
        </div>
      </div>

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

        {/* Pitch Slots */}
        {activeCoordConfig.map((pos, i) => {
          const occupant = starters[i];
          const label = getSlotLabel(activeFormat, i, pos.role);
          return (
            <div
              key={i}
              className="absolute z-20 flex flex-col items-center -translate-x-1/2 -translate-y-1/2"
              style={{ top: `${pos.y}%`, left: `${pos.x}%` }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                if (!isOMC) return;
                const playerId = e.dataTransfer.getData('text/plain');
                const sourceType = e.dataTransfer.getData('sourceType');
                const sourceSlotStr = e.dataTransfer.getData('sourceSlotIndex');

                if (sourceType === 'pitch' && sourceSlotStr) {
                  const srcIdx = Number(sourceSlotStr);
                  const newPositions = { ...activePositions };
                  const targetOccupantId = newPositions[i];
                  newPositions[i] = newPositions[srcIdx];
                  newPositions[srcIdx] = targetOccupantId || null;
                  setActivePositions(newPositions);
                  triggerSave(activeFormat, activeFormation, newPositions);
                } else if (sourceType === 'bench') {
                  const member = team.members.find((m: any) => m.playerId === playerId);
                  if (member) handleAssignSlot(member.id, i);
                }
              }}
            >
              {occupant ? (
                <div
                  draggable={isOMC}
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', occupant.playerId);
                    e.dataTransfer.setData('sourceType', 'pitch');
                    e.dataTransfer.setData('sourceSlotIndex', String(i));
                  }}
                  className="flex flex-col items-center cursor-pointer group"
                >
                  <div
                    onClick={() => isOMC && handleRemoveFromSlot(i)}
                    className="w-10 h-10 rounded-full border-2 border-accent bg-neutral-900 shadow-xl overflow-hidden flex items-center justify-center relative"
                  >
                    {occupant.player.avatarUrl ? (
                      <img src={occupant.player.avatarUrl} className="w-full h-full object-cover" />
                    ) : (
                      <UserCircle2 size={20} className="text-[var(--muted)]" />
                    )}
                    {occupant.role === 'captain' && <CaptainBadge />}
                    {isOMC && (
                      <div className="absolute inset-0 bg-red-500/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                        <X size={14} className="text-white" />
                      </div>
                    )}
                  </div>
                  <div className="bg-black/80 backdrop-blur-md px-1.5 py-0.5 mt-1 rounded text-center shadow-lg min-w-[50px] max-w-[70px]">
                    <p className="text-[8px] font-bold truncate text-white leading-tight">
                      {occupant.player.fullName.split(' ')[0]}
                    </p>
                    <p className="text-[6px] font-black uppercase text-accent tracking-widest leading-none mt-0.5">
                      {label}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <button
                    onClick={() => isOMC && setActiveSlot(activeSlot === i ? null : i)}
                    className={`w-9 h-9 rounded-full border border-dashed flex items-center justify-center transition-all bg-black/40
                      ${activeSlot === i ? 'border-accent text-accent scale-110 shadow-[0_0_15px_rgba(0,255,65,0.4)]' : 'border-white/30 text-white/30 hover:border-white/60 hover:text-white/60'}`}
                  >
                    <Plus size={16} />
                  </button>
                  <p className="text-[7px] text-white/40 uppercase tracking-wider font-bold mt-1 bg-black/50 px-1 rounded">
                    {label}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bench Strip Dropzone/Horizontal Row */}
      <div 
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          if (!isOMC) return;
          const sourceType = e.dataTransfer.getData('sourceType');
          const sourceSlotStr = e.dataTransfer.getData('sourceSlotIndex');
          if (sourceType === 'pitch' && sourceSlotStr) {
            handleRemoveFromSlot(Number(sourceSlotStr));
          }
        }}
        className="w-full max-w-md mx-auto"
      >
        <p className="text-[9px] font-black uppercase tracking-widest text-[#a1a1aa] mb-2 px-1">
          Bench ({benchPlayers.length} Players)
        </p>
        <div className="flex overflow-x-auto gap-3 py-3 px-3 bg-neutral-950/40 rounded-2xl border border-white/5 scrollbar-none snap-x snap-mandatory min-h-[68px]">
          {benchPlayers.length === 0 ? (
            <p className="text-[10px] text-white/30 italic m-auto py-1">No players on the bench</p>
          ) : (
            benchPlayers.map((sub: any) => {
              const pMmr = isCricket ? (sub.player.cricketMmr ?? 1000) : (sub.player.footballMmr ?? sub.player.mmr ?? 1000);
              return (
                <div
                  key={sub.id}
                  draggable={isOMC}
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', sub.id);
                    e.dataTransfer.setData('sourceType', 'bench');
                  }}
                  onClick={() => isOMC && setPlayerModal(sub)}
                  className="snap-start shrink-0 flex items-center gap-2.5 px-3 py-2 bg-neutral-900 border border-white/5 hover:border-white/10 rounded-xl cursor-pointer transition-all select-none relative group"
                >
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-neutral-950 border border-white/10 flex items-center justify-center shrink-0 relative">
                    {sub.player.avatarUrl ? (
                      <img src={sub.player.avatarUrl} className="w-full h-full object-cover" />
                    ) : (
                      <UserCircle2 size={16} className="text-white/40" />
                    )}
                    {sub.role === 'captain' && <CaptainBadge />}
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-[10px] font-bold text-white truncate max-w-[64px] leading-tight">
                      {sub.player.fullName.split(' ')[0]}
                    </span>
                    <span className="text-[8px] font-black uppercase tracking-wider text-accent leading-none mt-0.5">
                      {sub.sportRole || 'No Pos'}
                    </span>
                  </div>
                  <div className="shrink-0 text-[8px] font-black text-white/50 bg-black/40 border border-white/5 px-1.5 py-0.5 rounded flex items-center gap-1">
                    <span>{pMmr}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>


      {/* Full Roster Renders */}
      <div className="glass-panel rounded-2xl border border-[var(--panel-border)] overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
          <span className="w-2 h-2 rounded-full bg-accent shrink-0 animate-pulse" />
          <h3 className="font-black text-[11px] uppercase tracking-widest">Full Roster ({fullRoster.length}/15)</h3>
        </div>
        <div className="p-2 flex flex-col gap-1.5">
          {fullRoster.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-xs text-white/30 italic">No rostered players yet. Recruit players to your squad!</p>
            </div>
          ) : (
            fullRoster.map((m: any) => {
              const isStarter = Object.values(activePositions).includes(m.playerId);
              return (
                <PlayerCard
                  key={m.id}
                  m={m}
                  isOMC={isOMC}
                  isPitch={isStarter}
                  onClick={() => isOMC && setPlayerModal(m)}
                  isCricket={isCricket}
                />
              );
            })
          )}
        </div>
      </div>

      {/* ── Slot (Subs Picker) Modal ── */}
      {activeSlot !== null && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-5" onClick={() => setActiveSlot(null)}>
          <div className="w-full max-w-xs bg-neutral-900 border border-[var(--panel-border)] rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
              <p className="text-sm font-black">Assign Starter Player</p>
              <button onClick={() => setActiveSlot(null)} className="p-1 rounded-lg hover:bg-white/10"><X size={16} /></button>
            </div>
            <div className="max-h-72 overflow-y-auto p-2 flex flex-col gap-1.5">
              {benchPlayers.length === 0 ? (
                <p className="text-xs text-center text-white/40 py-6">No players available on the bench.</p>
              ) : (
                benchPlayers.map((sub: any) => (
                  <button
                    key={sub.id}
                    onClick={() => handleAssignSlot(sub.id, activeSlot!)}
                    className="flex items-center gap-3 p-2.5 hover:bg-neutral-800 rounded-xl text-left transition-colors w-full border border-white/5 hover:border-accent/30"
                  >
                    <div className="w-8 h-8 rounded-full bg-neutral-800 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center relative">
                      {sub.player.avatarUrl ? <img src={sub.player.avatarUrl} className="w-full h-full object-cover" /> : <UserCircle2 size={16} className="text-[var(--muted)]" />}
                      {sub.role === 'captain' && <CaptainBadge />}
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

      {/* ── Player Action Modal (centered popup) ── */}
      {playerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/70 backdrop-blur-sm" onClick={() => setPlayerModal(null)}>
          <div className="w-full max-w-sm bg-neutral-900 border border-[var(--panel-border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-4 border-b border-white/5 bg-neutral-800/60">
              <div className="w-10 h-10 rounded-full bg-neutral-900 border border-white/10 overflow-hidden flex items-center justify-center shrink-0 relative">
                {playerModal.player.avatarUrl ? <img src={playerModal.player.avatarUrl} className="w-full h-full object-cover" /> : <UserCircle2 size={20} />}
                {playerModal.role === 'captain' && <CaptainBadge />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <RoleBadge role={playerModal.role} />
                  <p className="font-black text-sm truncate">{playerModal.player.fullName}</p>
                </div>
                {(() => {
                  const pmMmr = isCricket ? (playerModal.player.cricketMmr ?? 1000) : (playerModal.player.footballMmr ?? playerModal.player.mmr ?? 1000);
                  return <p className="text-[9px] text-[var(--muted)] mt-0.5">MMR {pmMmr} · <RankBadge mmr={pmMmr} inline={true} /></p>;
                })()}
              </div>
              <button onClick={() => setPlayerModal(null)} className="p-1.5 rounded-xl hover:bg-white/10 shrink-0"><X size={16} /></button>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto" style={{ maxHeight: '60vh' }}>

              {/* Sport Position Preference */}
              <div className="px-4 pt-4">
                <p className="text-[9px] font-black uppercase tracking-widest text-[var(--muted)] mb-2">Preferred Position</p>
                <div className="grid grid-cols-2 gap-2">
                  {roleOptions.map(posLabel => (
                    <button
                      key={posLabel}
                      onClick={() => handleSetRole(playerModal.id, posLabel)}
                      disabled={loadingRole}
                      className={`py-2.5 px-3 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all border flex items-center justify-center gap-1.5
                        ${playerModal.sportRole === posLabel
                          ? 'bg-accent/20 border-accent text-accent'
                          : 'bg-neutral-800 border-white/5 hover:border-accent/40 hover:bg-neutral-700 text-white/80'}`}
                    >
                      {posLabel}
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
                <p className="text-[10px] text-[var(--muted)] mt-0.5">Search by name, phone, email or unique Player Code</p>
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
                  placeholder="Name, email, phone or player code (e.g. P-XXXXXX)..."
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
                  const requestSent = sentRequests.includes(player.id);
                  return (
                    <div key={player.id} className="flex items-center gap-3 p-3 rounded-xl bg-neutral-800/60 border border-white/5 hover:border-white/10">
                      <div className="w-10 h-10 rounded-full bg-neutral-900 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center relative">
                        {player.avatarUrl ? <img src={player.avatarUrl} className="w-full h-full object-cover" /> : <UserCircle2 size={20} className="text-[var(--muted)]" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate">{player.fullName}</p>
                        <p className="text-[10px] text-[var(--muted)] truncate">
                          {player.email} {player.playerCode && `· ${player.playerCode}`}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[9px] font-black text-accent">MMR {isCricket ? (player.cricketMmr ?? 1000) : (player.footballMmr ?? player.mmr ?? 1000)}</span>
                          <span className="text-[9px] text-[var(--muted)]">LVL {player.level}</span>
                        </div>
                      </div>
                      {alreadyMember ? (
                        <span className="text-[10px] font-black text-green-500 uppercase px-2 py-1 bg-green-500/10 rounded-lg shrink-0">✓ On Team</span>
                      ) : requestSent ? (
                        <span className="text-[10px] font-black text-amber-500 uppercase px-2 py-1 bg-amber-500/10 border border-amber-500/20 rounded-lg shrink-0 shadow-[0_0_10px_rgba(245,158,11,0.1)]">Request Sent</span>
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

    </div>
  );
}
