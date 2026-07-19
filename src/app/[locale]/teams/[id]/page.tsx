'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  MapPin, Tent, Trophy, Users, Star, X, Loader2, Swords,
  Clock, CheckCircle2, XCircle, AlertTriangle, Settings,
  ChevronRight, Zap, Shield, Target, TrendingUp, BarChart2, Award, UserCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SquadManager from '@/components/teams/SquadManager';
import { getRankData } from '@/lib/rankUtils';

// ── Season Countdown ──────────────────────────────────────────────────────
function useCountdown(endDate: string | null) {
  const [remaining, setRemaining] = useState('');
  useEffect(() => {
    if (!endDate) { setRemaining(''); return; }
    const tick = () => {
      const diff = new Date(endDate).getTime() - Date.now();
      if (diff <= 0) { setRemaining('Ended'); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemaining(d > 0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m ${s}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endDate]);
  return remaining;
}

// ── Skeleton components ────────────────────────────────────────────────────
function SkeletonBlock({ className = '' }: { className?: string }) {
  return (
    <div
      className={`bg-[var(--bg-surface-raised)] rounded-xl animate-pulse ${className}`}
    />
  );
}

function SkeletonBanners() {
  return (
    <div className="grid grid-cols-3 gap-2 px-4 py-6">
      <SkeletonBlock className="h-64 rounded-2xl" />
      <div className="flex flex-col items-center gap-3 pt-6">
        <SkeletonBlock className="w-20 h-20 rounded-full" />
        <SkeletonBlock className="h-4 w-28" />
        <SkeletonBlock className="h-3 w-16" />
        <SkeletonBlock className="h-8 w-full rounded-lg" />
        <SkeletonBlock className="h-8 w-full rounded-lg" />
      </div>
      <SkeletonBlock className="h-64 rounded-2xl" />
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bmt-surface p-4 flex flex-col gap-3">
      <SkeletonBlock className="h-4 w-32" />
      <SkeletonBlock className="h-3 w-full" />
      <SkeletonBlock className="h-3 w-3/4" />
    </div>
  );
}

// ── Editable Decree Card ──────────────────────────────────────────────────
function EditableDecree({
  ann, isOMC, isEditing, saving,
  onEdit, onDelete, onSave, onCancel,
}: {
  ann: any; isOMC: boolean; isEditing: boolean; saving: boolean;
  onEdit: () => void; onDelete: () => void;
  onSave: (title: string, content: string) => void; onCancel: () => void;
}) {
  const [editTitle,   setEditTitle]   = useState(ann.title);
  const [editContent, setEditContent] = useState(ann.content);
  useEffect(() => {
    if (isEditing) { setEditTitle(ann.title); setEditContent(ann.content); }
  }, [isEditing, ann.title, ann.content]);

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(166,124,82,0.2)' }}
    >
      {isEditing ? (
        <div className="p-4 flex flex-col gap-2">
          <p style={{ color: 'var(--gold)' }} className="text-[9px] font-black uppercase tracking-widest mb-1">✏️ Edit Decree</p>
          <input
            value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            className="w-full bg-black/50 rounded-xl px-4 py-2.5 text-sm focus:outline-none font-serif italic"
            style={{ border: '1px solid rgba(166,124,82,0.3)', color: '#e6d0a3' }}
          />
          <textarea
            value={editContent}
            onChange={e => setEditContent(e.target.value)}
            rows={3}
            className="w-full bg-black/50 rounded-xl px-4 py-2.5 text-sm focus:outline-none font-serif resize-none"
            style={{ border: '1px solid rgba(166,124,82,0.3)', color: '#e6d0a3' }}
          />
          <div className="flex gap-2 mt-1">
            <button
              onClick={() => onSave(editTitle, editContent)}
              disabled={saving || !editTitle.trim() || !editContent.trim()}
              className="flex-1 py-2 rounded-xl font-black text-sm transition-all disabled:opacity-40"
              style={{ background: 'linear-gradient(90deg,#6b3c10,#a06420,#6b3c10)', color: '#fde8a0', border: `1px solid rgba(212,175,55,0.5)` }}
            >💾 Save</button>
            <button
              onClick={onCancel}
              className="flex-1 py-2 rounded-xl font-black text-sm transition-colors"
              style={{ background: 'var(--bg-surface-raised)', color: '#a67c52', border: '1px solid rgba(166,124,82,0.2)' }}
            >Cancel</button>
          </div>
        </div>
      ) : (
        <div className="p-4">
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <p className="font-serif font-black text-sm leading-snug flex-1" style={{ color: '#e6d0a3' }}>{ann.title}</p>
            {isOMC && (
              <div className="flex gap-1.5 shrink-0">
                <button onClick={onEdit} className="text-[9px] px-2 py-1 rounded-lg font-black uppercase tracking-wider transition-colors" style={{ background: 'rgba(166,124,82,0.1)', border: '1px solid rgba(166,124,82,0.2)', color: '#a67c52' }}>Edit</button>
                <button onClick={onDelete} disabled={saving} className="text-[9px] px-2 py-1 rounded-lg font-black uppercase tracking-wider transition-colors disabled:opacity-40" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>Del</button>
              </div>
            )}
          </div>
          <p className="font-serif text-xs leading-relaxed whitespace-pre-wrap" style={{ color: '#a67c52' }}>{ann.content}</p>
          <p className="text-[9px] font-bold mt-2 uppercase tracking-widest" style={{ color: 'rgba(166,124,82,0.4)' }}>
            {new Date(ann.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>
      )}
    </div>
  );
}

// ── Compact Rank Badge ─────────────────────────────────────────────────────
function CompactRankBadge({
  label, mmr, rankData, isProv, provisionalCount, provTarget,
}: {
  label: string; mmr: number; rankData: any; isProv: boolean;
  provisionalCount: number; provTarget: number;
}) {
  return (
    <div
      className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl flex-1"
      style={{
        background: isProv ? 'var(--bg-surface)' : `rgba(${rankData.glow},0.08)`,
        border: isProv ? '1px solid var(--border-subtle)' : `1px solid rgba(${rankData.glow},0.25)`,
      }}
    >
      <p className="text-[8px] font-black uppercase tracking-widest" style={{ color: isProv ? 'var(--text-muted)' : rankData.color }}>{label}</p>
      {isProv ? (
        <span className="text-[9px] font-black" style={{ color: 'var(--text-muted)' }}>{provisionalCount}/{provTarget}</span>
      ) : (
        <span className="text-[10px] font-black" style={{ color: rankData.color }}>{rankData.label}</span>
      )}
      <span className="text-[8px] font-bold" style={{ color: 'var(--text-muted)' }}>{isProv ? 'Provisional' : mmr + ' MMR'}</span>
    </div>
  );
}

// ── Rank Banner (full size for Overview tab) ───────────────────────────────
function RankBanner({
  label, mmr, rankData, isProv, provisionalCount, provTarget, labelColor,
}: {
  label: string; mmr: number; rankData: any; isProv: boolean;
  provisionalCount: number; provTarget: number; labelColor: string;
}) {
  return (
    <div className="flex flex-col items-center relative z-0">
      <div
        style={{
          clipPath: 'polygon(0% 0%,100% 0%,95% 5%,95% 85%,100% 90%,80% 90%,50% 100%,20% 90%,0% 90%,5% 85%,5% 5%)',
          background: isProv
            ? 'linear-gradient(to bottom,rgba(163,163,163,0.2),rgba(10,10,10,0.9))'
            : `linear-gradient(to bottom,rgba(${rankData.glow},0.4),rgba(10,10,10,0.9))`,
        }}
        className={`w-full h-80 backdrop-blur-md flex flex-col items-center justify-start pt-8 pb-10 shadow-2xl relative overflow-hidden group ${isProv ? 'bmt-shimmer' : ''}`}
      >
        <img
          src="/banners/Banner%2001.svg"
          className="absolute top-0 left-0 w-full h-full object-cover mix-blend-overlay opacity-60 group-hover:scale-105 transition-transform duration-700 pointer-events-none"
          alt=""
        />
        <div
          className="absolute inset-[2px] pointer-events-none"
          style={{
            clipPath: 'polygon(0% 0%,100% 0%,95% 5%,95% 85%,100% 90%,80% 90%,50% 100%,20% 90%,0% 90%,5% 85%,5% 5%)',
            background: isProv
              ? 'linear-gradient(to bottom,rgba(163,163,163,0.1),transparent)'
              : `linear-gradient(to bottom,rgba(${rankData.glow},0.2),transparent)`,
          }}
        />
        <p className="text-[10px] font-bold uppercase tracking-widest leading-tight" style={{ color: labelColor }}>
          {label.toUpperCase()}
        </p>
        <p className="text-[10px] font-bold uppercase tracking-widest leading-tight mb-1" style={{ color: labelColor }}>MMR</p>
        <p className="text-sm font-black tracking-widest">{isProv ? '—' : mmr}</p>
        <div className="w-8 h-[1px] my-2" style={isProv ? { background: 'rgba(163,163,163,0.3)' } : { background: `rgba(${rankData.glow},0.4)` }} />
        <div className="mt-auto flex flex-col items-center w-full">
          {isProv ? (
            <div className="w-16 h-16 rounded-full border-2 border-dashed border-neutral-700 flex items-center justify-center text-neutral-500 text-2xl font-black bg-neutral-900 mb-2">?</div>
          ) : (
            <img src={rankData.icon} className="w-20 h-20 object-contain drop-shadow-[0_4px_16px_rgba(255,255,255,0.25)]" alt="Rank" />
          )}
          <p className="text-[10px] font-bold uppercase tracking-widest mt-1 text-neutral-500">Rank</p>
          <p className="text-xs font-black text-center leading-tight px-1" style={{ color: isProv ? '#a3a3a3' : rankData.color }}>
            {isProv ? `Unranked` : rankData.label}
          </p>
          {isProv && (
            <p className="text-[9px] font-bold text-neutral-500 mt-1 uppercase tracking-wider">{provisionalCount}/{provTarget} Matches</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Tab definitions ────────────────────────────────────────────────────────
const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'squad',    label: 'Squad'    },
  { key: 'stats',    label: 'Stats'    },
] as const;
type TabKey = typeof TABS[number]['key'];

// ── Framer Motion variants ─────────────────────────────────────────────────
const tabVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' as const } },
  exit:    { opacity: 0, y: -4, transition: { duration: 0.15, ease: 'easeIn' as const } },
};

const btnTap = { scale: 0.97 };

// ─────────────────────────────────────────────────────────────────────────────
export default function SingleTeamPage() {
  const { id, locale = 'en' } = useParams() as { id: string; locale?: string };
  const router   = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // ── Tab state ──
  const [activeTab, setActiveTab] = useState<TabKey>(() => {
    const t = searchParams.get('tab') as TabKey | null;
    return TABS.some(tab => tab.key === t) ? (t as TabKey) : 'overview';
  });

  const switchTab = useCallback((t: TabKey) => {
    setActiveTab(t);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', t);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [pathname, router, searchParams]);

  // ── Core data ──
  const [team, setTeam] = useState<any>(null);
  const [activeSeason, setActiveSeason] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);

  // ── Announcement state ──
  const [showAnnouncements, setShowAnnouncements] = useState(false);
  const [announcements,     setAnnouncements]     = useState<any[]>([]);
  const [newAnnTitle,       setNewAnnTitle]       = useState('');
  const [newAnnContent,     setNewAnnContent]     = useState('');
  const [editingAnnId,      setEditingAnnId]      = useState<string | null>(null);

  // ── CM bookings state ──
  const [showCMHistory, setShowCMHistory] = useState(false);
  const [cmSlots,       setCmSlots]       = useState<any[]>([]);

  // ── Role ──
  const [myRole, setMyRole] = useState('none');
  const isOM  = ['owner', 'manager'].includes(myRole);
  const isOMC = ['owner', 'manager', 'captain'].includes(myRole);

  // ── Modals ──
  const [showAreaModal, setShowAreaModal] = useState(false);
  const [showTurfModal, setShowTurfModal] = useState(false);
  const [showSubModal,  setShowSubModal]  = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaving,        setLeaving]        = useState(false);
  const [search, setSearch] = useState('');

  // ── Stats tab state ──
  const [statsMode, setStatsMode] = useState<'ranked' | 'tournament'>('ranked');
  const [matchFilter, setMatchFilter] = useState<'all' | 'ranked' | 'tournament'>('all');
  const [expandedMatch, setExpandedMatch] = useState<string | null>(null);

  // ── Lookup data ──
  const [cities, setCities] = useState<any[]>([]);
  const [turfs,  setTurfs]  = useState<any[]>([]);

  const seasonCountdown = useCountdown(activeSeason?.endDate ?? null);

  useEffect(() => {
    fetch(`/api/teams/${id}?t=${Date.now()}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        setTeam(d.team);
        if (d.activeSeason) setActiveSeason(d.activeSeason);
        if (d.team && d.myPlayerId) {
          const me = d.team.members.find((m: any) => m.playerId === d.myPlayerId);
          setMyRole(me?.role || (d.team.ownerId === d.myPlayerId ? 'owner' : 'none'));
        }
        setLoading(false);
      });

    fetch('/api/bmt/cities').then(r => r.json()).then(d => setCities(Array.isArray(d) ? d : d.cities || []));
    fetch('/api/bmt/turfs').then(r => r.json()).then(d => setTurfs(Array.isArray(d) ? d : d.turfs || []));
    fetch(`/api/teams/${id}/announcements`).then(r => r.json()).then(d => setAnnouncements(Array.isArray(d) ? d : []));
    fetch('/api/bmt/slots').then(r => r.json()).then(d => setCmSlots(Array.isArray(d) ? d : []));
  }, [id]);

  // ── Loading skeleton ──
  if (loading) {
    return (
      <div className="min-h-screen pb-24 font-sans" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
        <SkeletonBanners />
        <div className="max-w-md mx-auto px-4 flex flex-col gap-3 mt-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (!team) return <div className="text-center p-8" style={{ color: 'var(--text-muted)' }}>Team not found</div>;

  // ── Derived values ──
  let sportName = 'Futsal';
  if (team.sportType === 'FOOTBALL' || team.sportType === 'FOOTBALL_FULL') sportName = 'Football';
  else if (team.sportType?.includes('CRICKET')) sportName = 'Cricket';

  const sportEmoji   = team.sportType?.includes('CRICKET') ? '🏏' : '⚽';
  const maxRosterLimit = 15;

  const isCricketSport  = team.sportType?.includes('CRICKET');
  const rankedMmr       = isCricketSport ? (team.cricketMmr ?? 1000) : (team.footballMmr ?? 1000);
  const tournamentMmr   = isCricketSport ? (team.tournamentCricketMmr ?? 1000) : (team.tournamentFootballMmr ?? 1000);

  const rankedRankData     = getRankData(rankedMmr);
  const tournamentRankData = getRankData(tournamentMmr);

  const completedRankedCount =
    (team.matchesAsTeamA || []).filter((m: any) => m.status === 'COMPLETED').length +
    (team.matchesAsTeamB || []).filter((m: any) => m.status === 'COMPLETED').length;
  const completedTournamentCount = (team.tournamentMatches || []).filter((m: any) => m.status === 'COMPLETED').length;

  const isRankedProv      = completedRankedCount < 3;
  const isTournamentProv  = completedTournamentCount < 3;
  const isRankedCalib     = !isRankedProv && completedRankedCount < 5;

  const isSubActive = team.challengeSubscription?.active === true;

  const cmMatches = [...(team?.matchesAsTeamA || []), ...(team?.matchesAsTeamB || [])]
    .filter((m: any) => m.bookingCode)
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleShareTeamCard = async () => {
    const shareUrl = `${window.location.origin}/api/teams/${team.id}/og-image`;
    if (navigator.share) {
      try { await navigator.share({ title: team.name, text: `Check out our team card for ${team.name}!`, url: shareUrl }); }
      catch {}
    } else {
      await navigator.clipboard.writeText(shareUrl);
      alert('Link to Team Card copied!');
    }
  };

  const handleUpdateAreas = async (newCityIds: string[]) => {
    setSaving(true);
    const res = await fetch(`/api/teams/${id}`, {
      method: 'PATCH', body: JSON.stringify({ action: 'set_home_areas', payload: { cityIds: newCityIds } }),
    });
    if (res.ok) { const d = await res.json(); setTeam({ ...team, homeAreas: d.homeAreas }); }
    setSaving(false); setShowAreaModal(false);
  };

  const handleUpdateTurfs = async (newTurfIds: string[]) => {
    setSaving(true);
    const res = await fetch(`/api/teams/${id}`, {
      method: 'PATCH', body: JSON.stringify({ action: 'set_home_turfs', payload: { turfIds: newTurfIds } }),
    });
    if (res.ok) { const d = await res.json(); setTeam({ ...team, homeTurfs: d.homeTurfs }); }
    setSaving(false); setShowTurfModal(false);
  };

  const handleCreateAnnouncement = async () => {
    if (!newAnnTitle || !newAnnContent) return;
    setSaving(true);
    const res = await fetch(`/api/teams/${id}/announcements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newAnnTitle, content: newAnnContent }),
    });
    if (res.ok) { const ann = await res.json(); setAnnouncements([ann, ...announcements]); setNewAnnTitle(''); setNewAnnContent(''); }
    setSaving(false);
  };

  const handleDeleteAnnouncement = async (annId: string) => {
    setSaving(true);
    const res = await fetch(`/api/teams/${id}/announcements?annId=${annId}`, { method: 'DELETE' });
    if (res.ok) setAnnouncements(announcements.filter(a => a.id !== annId));
    setSaving(false);
  };

  const handleSaveEdit = async (annId: string, title: string, content: string) => {
    setSaving(true);
    const res = await fetch(`/api/teams/${id}/announcements?annId=${annId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, content }),
    });
    if (res.ok) { const ann = await res.json(); setAnnouncements(announcements.map(a => a.id === annId ? ann : a)); }
    setEditingAnnId(null); setSaving(false);
  };

  const handleLeaveTeam = async () => {
    if (!confirm('Leave this team? You will lose your roster slot and lineup placement.')) return;
    setSaving(true);
    const res = await fetch(`/api/teams/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'leave_team' }),
    });
    if (res.ok) { router.push(`/${locale}/teams`); }
    else { const d = await res.json(); alert(d.error || 'Failed to leave team.'); setSaving(false); }
  };

  const handleLeaveChallenge = async () => {
    setLeaving(true);
    const res = await fetch(`/api/teams/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'leave_challenge_market' }),
    });
    if (res.ok) {
      setTeam({ ...team, isSubscribed: false, challengeSubscription: { ...team.challengeSubscription, active: false } });
      setShowLeaveModal(false);
    } else {
      const d = await res.json();
      alert(d.error || 'Failed to leave Challenge Market.');
    }
    setLeaving(false);
  };

  const handleJoinChallenge = async () => {
    setSaving(true);
    const res = await fetch(`/api/teams/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'subscribe_challenge' }),
    });
    const d = await res.json();
    if (res.ok) {
      setTeam({
        ...team,
        isSubscribed: true,
        challengeSubscription: {
          ...team.challengeSubscription,
          active: true,
          subscribedAt: new Date().toISOString()
        }
      });
      setShowSubModal(false);
    } else {
      alert(d.error || 'Failed to join Challenge Market.');
    }
    setSaving(false);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen pb-32 font-sans" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>

      {/* CM pulse animation */}
      <style>{`
        @keyframes cm-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(0, 255, 65, 0.5); }
          50% { box-shadow: 0 0 0 5px rgba(0, 255, 65, 0); }
        }
        .cm-dot-pulse { animation: cm-pulse 2s ease-in-out infinite; }
      `}</style>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          STICKY HEADER
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div
        className="sticky top-5 z-40 w-full"
        style={{ background: 'rgba(5,5,5,0.92)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border-subtle)' }}
      >
        <div className="max-w-md mx-auto px-4 pt-3 pb-1">

          {/* Row 1: crest + name + sport chip + gear */}
          <div className="flex items-center gap-2.5 mb-2">
            <div
              className="w-9 h-9 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center"
              style={{ background: 'var(--bg-surface)', border: '2px solid var(--accent)', boxShadow: '0 0 12px rgba(0,255,65,0.2)' }}
            >
              {team.logoUrl
                ? <img src={team.logoUrl} alt={team.name} className="w-full h-full object-cover" />
                : <span className="text-lg">{sportEmoji}</span>
              }
            </div>

            <div className="flex-1 min-w-0">
              <h1 className="font-black text-sm leading-tight truncate">{team.name}</h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px]">{sportEmoji}</span>
                <span className="text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>{sportName}</span>
                {team.teamCode && (
                  <span
                    className="text-[9px] font-black px-1.5 py-0.5 rounded-md"
                    style={{ background: 'var(--accent-soft)', color: 'var(--accent)', border: '1px solid rgba(0,255,65,0.2)' }}
                  >
                    {team.teamCode}
                  </span>
                )}
                {isSubActive && (
                  <span
                    className="text-[8px] font-black px-1.5 py-0.5 rounded-full flex items-center gap-1"
                    style={{ background: 'rgba(0,255,65,0.08)', color: 'var(--accent)', border: '1px solid rgba(0,255,65,0.3)' }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full cm-dot-pulse flex-shrink-0" style={{ background: 'var(--accent)' }} />
                    OPEN TO CHALLENGES
                  </span>
                )}
              </div>
            </div>

            <Link
              href={`/${locale}/teams/${id}/settings`}
              className="w-8 h-8 flex items-center justify-center rounded-full transition-colors"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}
            >
              <Settings size={14} />
            </Link>
          </div>

          {/* Row 2: compact rank badges */}
          <div className="flex items-center gap-2 mb-2">
            <CompactRankBadge
              label="Ranked"
              mmr={rankedMmr}
              rankData={rankedRankData}
              isProv={isRankedProv}
              provisionalCount={completedRankedCount}
              provTarget={3}
            />
            <div className="flex flex-col items-center gap-0.5 px-2">
              <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0" style={{ background: 'var(--bg-surface)' }}>
                {team.logoUrl ? <img src={team.logoUrl} alt="" className="w-full h-full object-cover" /> : <span className="text-base">{sportEmoji}</span>}
              </div>
              <span className="text-[8px] font-bold" style={{ color: 'var(--text-muted)' }}>
                {team.members?.length || 1}/{maxRosterLimit}
              </span>
            </div>
            <CompactRankBadge
              label="Tournament"
              mmr={tournamentMmr}
              rankData={tournamentRankData}
              isProv={isTournamentProv}
              provisionalCount={completedTournamentCount}
              provTarget={3}
            />
          </div>

          {/* Row 3: Challenge Market button */}
          <div className="mb-2.5">
            {isSubActive ? (
              <motion.button
                whileTap={btnTap}
                onClick={() => setShowLeaveModal(true)}
                className="w-full py-2 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-colors"
                style={{ background: 'var(--bg-surface)', color: 'var(--accent)', border: '1px solid rgba(0,255,65,0.35)' }}
              >
                <span className="w-2 h-2 rounded-full cm-dot-pulse flex-shrink-0" style={{ background: 'var(--accent)' }} />
                Listed in Challenge Market ✓
              </motion.button>
            ) : (
              <motion.button
                whileTap={btnTap}
                onClick={() => setShowSubModal(true)}
                className="w-full py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-colors"
                style={{ background: 'var(--accent)', color: '#000', boxShadow: '0 0 16px rgba(0,255,65,0.2)' }}
              >
                <Swords size={12} />
                ⚔️ Join Challenge Market
              </motion.button>
            )}
          </div>

          {/* Tab bar */}
          <div className="flex" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => switchTab(tab.key)}
                className="flex-1 py-2 text-xs font-black uppercase tracking-wider transition-colors relative"
                style={{ color: activeTab === tab.key ? 'var(--accent)' : 'var(--text-muted)' }}
              >
                {tab.label}
                {activeTab === tab.key && (
                  <motion.div
                    layoutId="tab-underline"
                    className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full"
                    style={{ background: 'var(--accent)' }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          TAB CONTENT
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="max-w-md mx-auto px-4 mt-4">
        <AnimatePresence mode="wait">

          {/* ────────────────────── TAB: OVERVIEW ────────────────────────── */}
          {activeTab === 'overview' && (
            <motion.div key="overview" {...tabVariants} className="flex flex-col gap-4">

              {/* MMR Banners */}
              <div className="grid grid-cols-3 items-start gap-2">
                <RankBanner
                  label="Ranked"
                  mmr={rankedMmr}
                  rankData={rankedRankData}
                  isProv={isRankedProv}
                  provisionalCount={completedRankedCount}
                  provTarget={3}
                  labelColor="var(--accent)"
                />
                {/* Center: crest + quick actions */}
                <div className="flex flex-col items-center mt-6">
                  <div
                    className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center"
                    style={{ background: 'var(--bg-surface)', border: '4px solid var(--bg-base)', outline: '2px solid rgba(0,255,65,0.4)', boxShadow: '0 0 20px rgba(0,255,65,0.2)' }}
                  >
                    {team.logoUrl ? <img src={team.logoUrl} alt={team.name} className="w-full h-full object-cover" /> : <span className="text-4xl">{sportEmoji}</span>}
                  </div>
                  <h2 className="mt-2 text-sm font-black text-center leading-tight">{team.name}</h2>
                  <div className="flex flex-col gap-1.5 mt-3 w-full">
                    <motion.button
                      whileTap={btnTap}
                      onClick={() => setShowAnnouncements(true)}
                      className="w-full py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wide flex items-center justify-center gap-1"
                      style={{ background: 'var(--bg-surface-raised)', color: '#d4af37', border: '1px solid rgba(212,175,55,0.25)' }}
                    >
                      📜 Team Scroll
                    </motion.button>
                    <motion.button
                      whileTap={btnTap}
                      onClick={handleShareTeamCard}
                      className="w-full py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wide flex items-center justify-center gap-1"
                      style={{ background: 'var(--bg-surface-raised)', color: 'var(--accent)', border: '1px solid rgba(0,255,65,0.2)' }}
                    >
                      🔗 Share Card
                    </motion.button>
                  </div>
                </div>
                <RankBanner
                  label="Tournament"
                  mmr={tournamentMmr}
                  rankData={tournamentRankData}
                  isProv={isTournamentProv}
                  provisionalCount={completedTournamentCount}
                  provTarget={3}
                  labelColor="var(--gold)"
                />
              </div>

              {/* XP Bar — feature-flagged. Hidden when NEXT_PUBLIC_FEATURE_XP !== 'true' */}
              {process.env.NEXT_PUBLIC_FEATURE_XP === 'true' && (
                <div className="bmt-surface p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-black" style={{ color: 'var(--accent)' }}>Level {team.level}</span>
                    <span className="text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>{team.xp} XP</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-surface-raised)' }}>
                    <motion.div
                      className="h-full rounded-full relative"
                      style={{ background: 'linear-gradient(90deg, rgba(0,255,65,0.5), var(--accent))' }}
                      initial={{ width: '0%' }}
                      animate={{ width: `${Math.min(100, Math.max(5, (team.xp % 100)))}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                    />
                  </div>
                  <p className="text-[10px] mt-1.5" style={{ color: 'var(--text-muted)' }}>Next unlock: Crest Frame at Level 3</p>
                </div>
              )}

              {/* Match History */}
              <div className="bmt-surface overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-soft)' }}>
                    <Clock size={13} style={{ color: 'var(--accent)' }} />
                  </div>
                  <p className="font-black text-sm">Match History</p>
                </div>
                <div className="p-4 flex flex-col gap-2">
                  {[...(team.matchesAsTeamA || []), ...(team.matchesAsTeamB || [])]
                    .filter((m: any) => m.status === 'COMPLETED')
                    .sort((a: any, b: any) => new Date(b.updatedAt ?? b.createdAt).getTime() - new Date(a.updatedAt ?? a.createdAt).getTime())
                    .slice(0, 5)
                    .map((m: any) => {
                      const isTeamA = m.teamA_Id === team.id;
                      const opp = isTeamA ? m.teamB : m.teamA;
                      const teamScore = isTeamA ? m.scoreA : m.scoreB;
                      const oppScore  = isTeamA ? m.scoreB : m.scoreA;
                      const won = teamScore > oppScore;
                      return (
                        <div key={m.id} className="flex items-center justify-between p-2.5 rounded-xl" style={{ background: 'var(--bg-surface-raised)' }}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black"
                              style={{ background: won ? 'rgba(0,255,65,0.15)' : 'rgba(239,68,68,0.15)', color: won ? 'var(--accent)' : '#f87171' }}
                            >
                              {won ? 'W' : 'L'}
                            </div>
                            <span className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>vs {opp?.name || 'Unknown'}</span>
                          </div>
                          <span className="text-xs font-black" style={{ color: won ? 'var(--accent)' : '#f87171' }}>
                            {teamScore ?? '—'} – {oppScore ?? '—'}
                          </span>
                        </div>
                      );
                    })}
                  {[...(team.matchesAsTeamA || []), ...(team.matchesAsTeamB || [])].filter((m: any) => m.status === 'COMPLETED').length === 0 && (
                    <p className="text-center py-4 text-xs font-bold" style={{ color: 'var(--text-muted)' }}>No matches yet</p>
                  )}
                </div>
              </div>

              {/* Trophy Cabinet */}
              {(team.trophies?.length > 0) && (
                <div className="bmt-surface overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(212,175,55,0.1)' }}>
                      <Trophy size={13} style={{ color: 'var(--gold)' }} />
                    </div>
                    <p className="font-black text-sm">Trophy Cabinet</p>
                  </div>
                  <div className="p-4 grid grid-cols-3 gap-3">
                    {team.trophies.map((t: any) => (
                      <div key={t.id} className="flex flex-col items-center gap-1 p-2 rounded-xl" style={{ background: 'var(--bg-surface-raised)' }}>
                        <span className="text-2xl">🏆</span>
                        <p className="text-[9px] font-black text-center leading-tight" style={{ color: 'var(--gold)' }}>{t.name || t.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Hall of Fame */}
              {(team.hallOfFame?.length > 0) && (
                <div className="bmt-surface overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(212,175,55,0.1)' }}>
                      <Star size={13} style={{ color: 'var(--gold)' }} />
                    </div>
                    <p className="font-black text-sm">Hall of Fame</p>
                  </div>
                  <div className="p-4 flex flex-col gap-2">
                    {team.hallOfFame.map((p: any) => (
                      <div key={p.id} className="flex items-center gap-3 p-2.5 rounded-xl" style={{ background: 'var(--bg-surface-raised)' }}>
                        <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center" style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.3)' }}>
                          {p.avatarUrl ? <img src={p.avatarUrl} alt="" className="w-full h-full object-cover" /> : <Star size={14} style={{ color: 'var(--gold)' }} />}
                        </div>
                        <div>
                          <p className="text-xs font-black leading-tight">{p.name || p.username}</p>
                          <p className="text-[10px]" style={{ color: 'var(--gold)' }}>{p.reason || 'Legend'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </motion.div>
          )}

          {/* ────────────────────── TAB: SQUAD ────────────────────────────── */}
          {activeTab === 'squad' && (
            <motion.div key="squad" {...tabVariants} className="flex flex-col gap-4">
              <SquadManager
                team={team}
                setTeam={setTeam}
                myRole={myRole}
                tournamentMatches={team.tournamentMatches || []}
              />
            </motion.div>
          )}

                    {/* ────────────────────── TAB: STATS ────────────────────────────── */}
          {activeTab === 'stats' && (() => {
            const allRanked = [...(team.matchesAsTeamA || []), ...(team.matchesAsTeamB || [])];
            const allTournament = team.tournamentMatches || [];
            const completedRanked = allRanked.filter((m: any) => m.status === 'COMPLETED');
            const completedTourney = allTournament.filter((m: any) => m.status === 'COMPLETED');

            const calcStats = (matches: any[]) => {
              let w = 0, d = 0, l = 0, gf = 0, ga = 0, streak: string[] = [];
              matches.forEach((m: any) => {
                const isA = m.teamA_Id === team.id || m.teamAId === team.id;
                const myG = isA ? (m.scoreA ?? 0) : (m.scoreB ?? 0);
                const opG = isA ? (m.scoreB ?? 0) : (m.scoreA ?? 0);
                gf += myG; ga += opG;
                if (m.winnerId === team.id) { w++; streak.push('W'); }
                else if (!m.winnerId) { d++; streak.push('D'); }
                else { l++; streak.push('L'); }
              });
              const recent = streak.slice(-5).reverse();
              const cur = recent[0] || null;
              let streakStr = '';
              if (cur) { let cnt = 0; for (const r of recent) { if (r === cur) cnt++; else break; } streakStr = cur + cnt; }
              return { played: matches.length, w, d, l, gf, ga, gd: gf - ga,
                winRate: matches.length > 0 ? Math.round((w / matches.length) * 100) : 0, streak: streakStr };
            };

            const rankedSt = calcStats(completedRanked);
            const tourneySt = calcStats(completedTourney);
            const activeStats = statsMode === 'ranked' ? rankedSt : tourneySt;

            // Player stats
            const allPS: any[] = team.playerStats || [];
            const pMap: Record<string, any> = {};
            allPS.forEach((ps: any) => {
              const pid = ps.playerId;
              if (!pid) return;
              if (!pMap[pid]) pMap[pid] = { goals: 0, assists: 0, motm: 0, rs: 0, rc: 0, player: ps.player };
              pMap[pid].goals += ps.goals || 0;
              pMap[pid].assists += ps.assists || 0;
              if (ps.motm) pMap[pid].motm++;
              if (ps.rating) { pMap[pid].rs += ps.rating; pMap[pid].rc++; }
            });
            const pArr = Object.values(pMap);
            const hasPS = pArr.length > 0;
            const topScorer = [...pArr].sort((a: any, b: any) => b.goals - a.goals)[0];
            const topAssist = [...pArr].sort((a: any, b: any) => b.assists - a.assists)[0];
            const topMotm   = [...pArr].sort((a: any, b: any) => b.motm - a.motm)[0];
            const topRating = [...pArr].sort((a: any, b: any) => (b.rc > 0 ? b.rs/b.rc : 0) - (a.rc > 0 ? a.rs/a.rc : 0))[0];

            // Filtered matches
            const rRows = allRanked.filter((m: any) => m.status === 'COMPLETED').map((m: any) => ({ ...m, _t: 'ranked' }));
            const tRows = completedTourney.map((m: any) => ({ ...m, _t: 'tournament' }));
            const filtered = (matchFilter === 'all' ? [...rRows, ...tRows] : matchFilter === 'ranked' ? rRows : tRows)
              .sort((a: any, b: any) => new Date(b.updatedAt ?? b.createdAt).getTime() - new Date(a.updatedAt ?? a.createdAt).getTime());

            const resColor = (m: any) => {
              if (m.winnerId === team.id) return { b: 'var(--accent)', c: '#000', l: 'W' };
              if (!m.winnerId) return { b: '#3b82f6', c: '#fff', l: 'D' };
              return { b: '#ef4444', c: '#fff', l: 'L' };
            };

            return (
              <motion.div key='stats' {...tabVariants} className='flex flex-col gap-4'>

                {/* A) TEAM STATS */}
                <div className='bmt-surface overflow-hidden'>
                  <div className='flex items-center justify-between px-4 py-3' style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <div className='flex items-center gap-2'>
                      <div className='w-7 h-7 rounded-lg flex items-center justify-center' style={{ background: 'var(--accent-soft)' }}>
                        <TrendingUp size={13} style={{ color: 'var(--accent)' }} />
                      </div>
                      <p className='font-black text-sm'>TEAM STATS</p>
                    </div>
                    <div className='flex p-0.5 rounded-lg' style={{ background: 'var(--bg-surface-raised)', border: '1px solid var(--border-subtle)' }}>
                      {(['ranked', 'tournament'] as const).map(mode => (
                        <button key={mode} onClick={() => setStatsMode(mode)}
                          className='text-[9px] font-black uppercase px-2.5 py-1 rounded-md transition-colors capitalize'
                          style={{ background: statsMode === mode ? 'var(--accent)' : 'transparent', color: statsMode === mode ? '#000' : 'var(--text-muted)' }}
                        >{mode}</button>
                      ))}
                    </div>
                  </div>
                  {activeStats.played === 0 ? (
                    <div className='p-6 flex flex-col items-center gap-3'>
                      <div className='w-12 h-12 rounded-2xl flex items-center justify-center' style={{ background: 'var(--bg-surface-raised)' }}>
                        <BarChart2 size={22} style={{ color: 'var(--text-muted)' }} />
                      </div>
                      <p className='text-xs font-bold text-center' style={{ color: 'var(--text-muted)' }}>Stats appear after your first {statsMode} match</p>
                    </div>
                  ) : (
                    <div className='p-4 grid grid-cols-2 gap-3'>
                      {[
                        { label: 'Played', value: String(activeStats.played), accent: false },
                        { label: 'Win Rate', value: activeStats.winRate + '%', accent: true },
                        { label: 'W / D / L', value: activeStats.w + 'W ' + activeStats.d + 'D ' + activeStats.l + 'L', accent: false },
                        { label: 'Goals For / Against', value: activeStats.gf + ' / ' + activeStats.ga, accent: false },
                        { label: 'Goal Difference', value: (activeStats.gd > 0 ? '+' : '') + activeStats.gd, accent: activeStats.gd > 0 },
                        { label: 'Current Streak', value: activeStats.streak || '—', accent: (activeStats.streak || '').startsWith('W') },
                      ].map(row => (
                        <div key={row.label} className='rounded-xl p-3' style={{ background: 'var(--bg-surface-raised)' }}>
                          <p className='text-[9px] font-bold uppercase tracking-widest mb-0.5' style={{ color: 'var(--text-muted)' }}>{row.label}</p>
                          <p className='font-black text-sm' style={{ color: row.accent ? 'var(--accent)' : 'var(--text-primary)' }}>{row.value}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* B) PLAYER STATS */}
                <div className='bmt-surface overflow-hidden'>
                  <div className='flex items-center gap-2 px-4 py-3' style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <div className='w-7 h-7 rounded-lg flex items-center justify-center' style={{ background: 'rgba(212,175,55,0.12)' }}>
                      <Award size={13} style={{ color: 'var(--gold)' }} />
                    </div>
                    <p className='font-black text-sm'>PLAYER STATS</p>
                  </div>
                  {!hasPS ? (
                    <div className='p-6 flex flex-col items-center gap-3'>
                      <div className='w-12 h-12 rounded-2xl flex items-center justify-center' style={{ background: 'var(--bg-surface-raised)' }}>
                        <Users size={22} style={{ color: 'var(--text-muted)' }} />
                      </div>
                      <p className='text-xs font-bold text-center' style={{ color: 'var(--text-muted)' }}>Player stats appear after your first match</p>
                    </div>
                  ) : (
                    <div className='p-3 flex flex-col gap-2'>
                      {([
                        { icon: '\u26bd', label: 'Top Scorer', player: topScorer, stat: (topScorer?.goals || 0) + ' goals' },
                        { icon: '\uD83C\uDFAF', label: 'Most Assists', player: topAssist, stat: (topAssist?.assists || 0) + ' assists' },
                        { icon: '\u2b50', label: 'Most MOTM', player: topMotm, stat: (topMotm?.motm || 0) + '\u00d7 MOTM' },
                        { icon: '\uD83D\uDCCA', label: 'Highest Avg Rating', player: topRating, stat: topRating && topRating.rc > 0 ? (topRating.rs/topRating.rc).toFixed(1) : '\u2014' },
                      ] as any[]).filter(r => r.player).map((row: any) => (
                        <Link key={row.label}
                          href={row.player?.player?.id ? '/' + locale + '/player/' + row.player.player.id : '#'}
                          className='flex items-center gap-3 p-2.5 rounded-xl transition-colors'
                          style={{ background: 'var(--bg-surface-raised)' }}
                        >
                          <span className='text-lg'>{row.icon}</span>
                          <div className='w-8 h-8 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0' style={{ background: 'var(--bg-surface)' }}>
                            {row.player.player?.avatarUrl ? <img src={row.player.player.avatarUrl} className='w-full h-full object-cover' alt='' /> : <UserCircle2 size={18} style={{ color: 'var(--text-muted)' }} />}
                          </div>
                          <div className='flex-1 min-w-0'>
                            <p className='text-[9px] font-black uppercase tracking-widest' style={{ color: 'var(--text-muted)' }}>{row.label}</p>
                            <p className='text-xs font-black truncate'>{row.player.player?.fullName}</p>
                          </div>
                          <span className='text-xs font-black' style={{ color: 'var(--accent)' }}>{row.stat}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                {/* C) MATCH HISTORY */}
                <div className='bmt-surface overflow-hidden'>
                  <div className='flex items-center gap-2 px-4 py-3' style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <div className='w-7 h-7 rounded-lg flex items-center justify-center' style={{ background: 'var(--accent-soft)' }}>
                      <Clock size={13} style={{ color: 'var(--accent)' }} />
                    </div>
                    <p className='font-black text-sm'>MATCH HISTORY</p>
                  </div>
                  <div className='flex gap-2 px-4 pt-3'>
                    {(['all', 'ranked', 'tournament'] as const).map(f => (
                      <button key={f} onClick={() => setMatchFilter(f)}
                        className='text-[10px] font-black px-3 py-1 rounded-full capitalize transition-colors'
                        style={{ background: matchFilter === f ? 'var(--accent)' : 'var(--bg-surface-raised)', color: matchFilter === f ? '#000' : 'var(--text-muted)', border: matchFilter === f ? 'none' : '1px solid var(--border-subtle)' }}
                      >{f}</button>
                    ))}
                  </div>
                  <div className='p-4 flex flex-col gap-2'>
                    {filtered.length === 0 ? (
                      <div className='py-8 flex flex-col items-center gap-3'>
                        <div className='w-12 h-12 rounded-2xl flex items-center justify-center' style={{ background: 'var(--bg-surface-raised)' }}>
                          <Clock size={22} style={{ color: 'var(--text-muted)' }} />
                        </div>
                        <p className='text-xs font-bold' style={{ color: 'var(--text-muted)' }}>No matches yet</p>
                      </div>
                    ) : filtered.map((m: any) => {
                      const isA = m.teamA_Id === team.id || m.teamAId === team.id;
                      const opp = m._t === 'ranked' ? (isA ? m.teamB : m.teamA) : m.opponent;
                      const myScore = isA ? m.scoreA : m.scoreB;
                      const opScore = isA ? m.scoreB : m.scoreA;
                      const res = resColor(m);
                      const isExp = expandedMatch === m.id;
                      const mStats = (m.playerStats || []).filter((ps: any) => team.members?.some((mb: any) => mb.playerId === ps.playerId));
                      return (
                        <div key={m.id}>
                          <button onClick={() => setExpandedMatch(isExp ? null : m.id)}
                            className='w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors'
                            style={{ background: 'var(--bg-surface-raised)', border: isExp ? '1px solid rgba(0,255,65,0.2)' : '1px solid transparent' }}
                          >
                            <span className='w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black flex-shrink-0'
                              style={{ background: res.b, color: res.c }}>{res.l}</span>
                            <span className='text-xs font-bold flex-1 truncate' style={{ color: 'var(--text-secondary)' }}>vs {opp?.name || 'Unknown'}</span>
                            <span className='text-xs font-black' style={{ color: res.b }}>{myScore ?? '\u2014'} \u2013 {opScore ?? '\u2014'}</span>
                            {m._t === 'tournament' && <span className='text-[8px] px-1.5 py-0.5 rounded-full font-black' style={{ background: 'rgba(212,175,55,0.12)', color: 'var(--gold)' }}>CUP</span>}
                            <span className='text-[9px]' style={{ color: 'var(--text-muted)' }}>{new Date(m.updatedAt ?? m.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                          </button>
                          {isExp && (
                            <div className='mt-1 rounded-xl overflow-hidden' style={{ background: 'rgba(0,255,65,0.03)', border: '1px solid rgba(0,255,65,0.1)' }}>
                              {mStats.length === 0 ? (
                                <p className='text-[10px] text-center py-3 font-bold' style={{ color: 'var(--text-muted)' }}>No player data for this match</p>
                              ) : (
                                <div className='overflow-x-auto'>
                                  <table className='w-full text-[10px]'>
                                    <thead><tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                                      <th className='text-left px-3 py-2 font-black uppercase tracking-wider' style={{ color: 'var(--text-muted)' }}>Player</th>
                                      <th className='px-2 py-2 font-black text-center' style={{ color: 'var(--text-muted)' }}>G</th>
                                      <th className='px-2 py-2 font-black text-center' style={{ color: 'var(--text-muted)' }}>A</th>
                                      <th className='px-2 py-2 font-black text-center' style={{ color: 'var(--text-muted)' }}>Rtg</th>
                                      <th className='px-2 py-2 font-black text-center' style={{ color: 'var(--text-muted)' }}>\u2605</th>
                                      <th className='px-2 py-2 font-black text-center' style={{ color: 'var(--text-muted)' }}>MMR</th>
                                    </tr></thead>
                                    <tbody>
                                      {mStats.map((ps: any) => {
                                        const member = team.members?.find((mb: any) => mb.playerId === ps.playerId);
                                        const pick = m.rosterPicks?.find((p: any) => p.memberId === member?.id);
                                        const subEvents = m.events || [];
                                        const played = pick?.isStarter || subEvents.some((e: any) => e.playerOnId === ps.playerId);
                                        const changeVal = ps.mmrChange ?? 0;
                                        const changeStr = changeVal > 0 ? `+${changeVal}` : changeVal === 0 ? '±0' : `${changeVal}`;
                                        const changeColor = changeVal > 0 ? '#00ff41' : changeVal < 0 ? '#ef4444' : 'var(--text-secondary)';

                                        const isBn = locale === 'bn';
                                        const playedLabel = isBn ? 'খেলেছে' : 'played';
                                        const didntPlayLabel = isBn ? 'খেলে নাই' : "didn't play";

                                        return (
                                          <tr key={ps.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                                            <td className='px-3 py-2 font-bold truncate max-w-[120px]'>{ps.player?.fullName || '\u2014'}</td>
                                            <td className='px-2 py-2 text-center font-black' style={{ color: 'var(--accent)' }}>{ps.goals ?? 0}</td>
                                            <td className='px-2 py-2 text-center font-bold'>{ps.assists ?? 0}</td>
                                            <td className='px-2 py-2 text-center font-bold'>{ps.rating ? ps.rating.toFixed(1) : '\u2014'}</td>
                                            <td className='px-2 py-2 text-center'>{ps.motm ? '\u2b50' : ''}</td>
                                            <td className='px-2 py-2 text-center font-bold' style={{ color: changeColor, whiteSpace: 'nowrap' }}>
                                              {played ? `${changeStr} (${playedLabel})` : `\u00b10 (${didntPlayLabel})`}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* D) Trophy Cabinet */}
                {(team.trophies?.length > 0) && (
                  <div className='bmt-surface overflow-hidden'>
                    <div className='flex items-center gap-2 px-4 py-3' style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <div className='w-7 h-7 rounded-lg flex items-center justify-center' style={{ background: 'rgba(212,175,55,0.1)' }}>
                        <Trophy size={13} style={{ color: 'var(--gold)' }} />
                      </div>
                      <p className='font-black text-sm'>Trophy Cabinet</p>
                    </div>
                    <div className='p-4 grid grid-cols-3 gap-3'>
                      {team.trophies.map((t: any) => (
                        <div key={t.id} className='flex flex-col items-center gap-1 p-2 rounded-xl' style={{ background: 'var(--bg-surface-raised)' }}>
                          <span className='text-2xl'>\uD83C\uDFC6</span>
                          <p className='text-[9px] font-black text-center leading-tight' style={{ color: 'var(--gold)' }}>{t.name || t.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* D) Hall of Fame */}
                {(team.hallOfFame?.length > 0) && (
                  <div className='bmt-surface overflow-hidden'>
                    <div className='flex items-center gap-2 px-4 py-3' style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <div className='w-7 h-7 rounded-lg flex items-center justify-center' style={{ background: 'rgba(212,175,55,0.1)' }}>
                        <Star size={13} style={{ color: 'var(--gold)' }} />
                      </div>
                      <p className='font-black text-sm'>Hall of Fame</p>
                    </div>
                    <div className='p-4 flex flex-col gap-2'>
                      {team.hallOfFame.map((p: any) => (
                        <div key={p.id} className='flex items-center gap-3 p-2.5 rounded-xl' style={{ background: 'var(--bg-surface-raised)' }}>
                          <div className='w-8 h-8 rounded-full overflow-hidden flex items-center justify-center' style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.3)' }}>
                            {p.avatarUrl ? <img src={p.avatarUrl} alt='' className='w-full h-full object-cover' /> : <Star size={14} style={{ color: 'var(--gold)' }} />}
                          </div>
                          <div>
                            <p className='text-xs font-black leading-tight'>{p.name || p.username}</p>
                            <p className='text-[10px]' style={{ color: 'var(--gold)' }}>{p.reason || 'Legend'}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Leave Team */}
                {myRole !== 'none' && myRole !== 'owner' && (
                  <div className='bmt-surface overflow-hidden'>
                    <div className='p-4 flex flex-col gap-3'>
                      <p className='text-xs font-bold' style={{ color: 'var(--text-muted)' }}>
                        Leaving removes you from the roster and lineup. Your personal MMR is unaffected.
                      </p>
                      <motion.button whileTap={btnTap} onClick={handleLeaveTeam} disabled={saving}
                        className='w-full py-3 rounded-xl font-black text-xs flex justify-center items-center gap-2 transition-colors'
                        style={{ border: '1px solid rgba(239,68,68,0.4)', color: '#f87171' }}
                      >
                        {saving ? <Loader2 size={16} className='animate-spin' /> : 'Leave Team'}
                      </motion.button>
                    </div>
                  </div>
                )}

              </motion.div>
            );
          })()}

        </AnimatePresence>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          MODALS
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}

      {/* Area Modal */}
      {showAreaModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4 pb-0 sm:pb-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAreaModal(false)} />
          <div className="relative w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col h-[70vh] sm:h-[600px]" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
            <div className="p-4 flex items-center justify-between shrink-0" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <h2 className="font-black text-lg">Select Home Area</h2>
              <button onClick={() => setShowAreaModal(false)} className="p-2 rounded-full hover:bg-white/5"><X size={20} /></button>
            </div>
            <div className="p-4 shrink-0">
              <input type="text" placeholder="Search cities..." className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none" style={{ background: 'var(--bg-surface-raised)', border: '1px solid var(--border-subtle)' }} value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="flex-1 overflow-y-auto p-4 pt-0 gap-2 flex flex-col">
              {cities.filter((c: any) => c.name.toLowerCase().includes(search.toLowerCase()) && !team.homeAreas?.find((ha: any) => ha.id === c.id))
                .map((city: any) => (
                  <button key={city.id} onClick={() => handleUpdateAreas([...(team.homeAreas?.map((a: any) => a.id) || []), city.id])}
                    className="w-full text-left p-3 rounded-xl flex items-center gap-3 transition-colors"
                    style={{ background: 'var(--bg-surface-raised)', border: '1px solid transparent' }}
                  >
                    <MapPin size={16} style={{ color: 'var(--text-muted)' }} />
                    <div>
                      <p className="font-bold text-sm leading-tight">{city.name}</p>
                      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{city.division?.name || 'Division'}</p>
                    </div>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Turf Modal */}
      {showTurfModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4 pb-0 sm:pb-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowTurfModal(false)} />
          <div className="relative w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col h-[70vh] sm:h-[600px]" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
            <div className="p-4 flex items-center justify-between shrink-0" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <h2 className="font-black text-lg">Connect Home Turf</h2>
              <button onClick={() => setShowTurfModal(false)} className="p-2 rounded-full hover:bg-white/5"><X size={20} /></button>
            </div>
            <div className="p-4 shrink-0">
              <input type="text" placeholder="Search turfs..." className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none" style={{ background: 'var(--bg-surface-raised)', border: '1px solid var(--border-subtle)' }} value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="flex-1 overflow-y-auto p-4 pt-0 gap-2 flex flex-col">
              {turfs.filter((t: any) => t.name.toLowerCase().includes(search.toLowerCase()) && !team.homeTurfs?.find((ht: any) => ht.id === t.id))
                .map((turf: any) => (
                  <button key={turf.id} onClick={() => handleUpdateTurfs([...(team.homeTurfs?.map((t: any) => t.id) || []), turf.id])}
                    className="w-full text-left p-3 rounded-xl flex items-center gap-3 transition-colors"
                    style={{ background: 'var(--bg-surface-raised)', border: '1px solid transparent' }}
                  >
                    <Tent size={16} style={{ color: 'var(--text-muted)' }} />
                    <div>
                      <p className="font-bold text-sm leading-tight">{turf.name}</p>
                      <p className="text-[10px] uppercase tracking-wider mt-0.5" style={{ color: 'var(--text-muted)' }}>{turf.city?.name || 'City'} • {turf.area || 'Area'}</p>
                    </div>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Challenge Market / Subscription Modal */}
      {showSubModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setShowSubModal(false)}>
          <div
            className="rounded-3xl p-6 w-full max-w-sm flex flex-col shadow-2xl relative overflow-hidden"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4" style={{ background: 'var(--accent-soft)', border: '1px solid rgba(0,255,65,0.2)' }}>
              <Swords size={20} style={{ color: 'var(--accent)' }} />
            </div>
            <h3 className="font-black text-xl mb-1">Challenge Market</h3>
            <p className="text-[11px] mb-6 font-bold" style={{ color: 'var(--text-muted)' }}>
              Status for <span style={{ color: 'var(--text-primary)' }}>{team.name}</span>
            </p>

            <div className="rounded-2xl p-4 mb-2 flex flex-col gap-3" style={{ background: 'var(--bg-base)', border: '1px solid var(--border-subtle)' }}>
              <div>
                <span className="text-[10px] uppercase font-black tracking-widest block mb-1" style={{ color: 'var(--text-muted)' }}>Status</span>
                {isSubActive ? (
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: 'var(--accent)' }} />
                    <span className="text-xs font-black" style={{ color: 'var(--accent)' }}>Challenge Market Active</span>
                  </div>
                ) : (
                  <span className="text-xs font-black" style={{ color: 'var(--text-muted)' }}>Inactive</span>
                )}
              </div>
              <div>
                <span className="text-[10px] uppercase font-black tracking-widest block mb-1" style={{ color: 'var(--text-muted)' }}>Pricing</span>
                <span className="text-xs font-black" style={{ color: 'var(--accent)' }}>Free during launch</span>
              </div>
              {team.challengeSubscription?.subscribedAt && (
                <div>
                  <span className="text-[10px] uppercase font-black tracking-widest block mb-1" style={{ color: 'var(--text-muted)' }}>Active Since</span>
                  <p className="text-sm font-bold">{new Date(team.challengeSubscription.subscribedAt).toLocaleDateString()}</p>
                </div>
              )}
              {team.challengeSubscription?.gracePeriodEnd && (
                <div>
                  <span className="text-[10px] uppercase font-black tracking-widest block mb-1" style={{ color: 'var(--text-muted)' }}>Grace Period Ends</span>
                  <p className="text-sm font-bold" style={{ color: '#f87171' }}>{new Date(team.challengeSubscription.gracePeriodEnd).toLocaleString()}</p>
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-col gap-2">
              <div className="flex gap-2 w-full">
                {isSubActive ? (
                  <motion.button
                    whileTap={btnTap}
                    onClick={() => setShowSubModal(false)}
                    className="w-full py-3 font-bold rounded-xl transition-colors text-sm"
                    style={{ background: 'var(--bg-surface-raised)', color: 'var(--text-secondary)' }}
                  >Close</motion.button>
                ) : (
                  <>
                    <motion.button
                      whileTap={btnTap}
                      onClick={() => setShowSubModal(false)}
                      className="w-[100px] py-3 font-bold rounded-xl transition-colors text-sm"
                      style={{ background: 'var(--bg-surface-raised)', color: 'var(--text-secondary)' }}
                    >Cancel</motion.button>
                    <motion.button
                      whileTap={btnTap}
                      onClick={handleJoinChallenge}
                      disabled={saving || !isOM}
                      className="flex-1 py-3 font-black rounded-xl transition-colors text-sm flex items-center justify-center gap-1.5 disabled:opacity-40"
                      style={{ background: 'var(--accent)', color: '#000' }}
                    >
                      {saving ? <Loader2 size={15} className="animate-spin" /> : (
                        <>
                          <Swords size={14} />
                          Join Market
                        </>
                      )}
                    </motion.button>
                  </>
                )}
              </div>
              {!isSubActive && !isOM && (
                <p className="text-[10px] text-red-400 font-bold text-center mt-1">
                  Only Team Owner or Manager can join Challenge Market.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Announcement Modal — Team Scroll (keeps medieval theme intact) */}
      {showAnnouncements && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-sm" onClick={() => setShowAnnouncements(false)}>
          <div
            className="w-full max-w-md flex flex-col shadow-2xl relative overflow-hidden rounded-t-3xl sm:rounded-3xl"
            style={{ background: 'linear-gradient(180deg,#1e1208 0%,#120c06 60%,#0d0805 100%)', maxHeight: '85dvh', border: '1px solid rgba(166,124,82,0.4)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="h-3 w-full shrink-0" style={{ background: 'linear-gradient(90deg,#3a1e08,#8c5e2a,#d4af37,#8c5e2a,#3a1e08)' }} />
            <div className="px-6 pt-4 pb-3 flex items-center justify-between shrink-0" style={{ borderBottom: '1px solid rgba(166,124,82,0.2)' }}>
              <div>
                <h3 className="font-serif text-xl font-black italic tracking-wide" style={{ color: 'var(--gold)' }}>⚔️ Royal Decrees</h3>
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#a67c52' }}>{team.name}</p>
              </div>
              <button onClick={() => setShowAnnouncements(false)} className="w-8 h-8 flex items-center justify-center rounded-full" style={{ border: '1px solid rgba(166,124,82,0.3)', color: '#a67c52' }}><X size={16} /></button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
              {isOMC && (
                <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(166,124,82,0.3)' }}>
                  <div className="px-4 py-2.5" style={{ borderBottom: '1px solid rgba(166,124,82,0.2)' }}>
                    <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'var(--gold)' }}>✍️ Scribe New Decree</p>
                  </div>
                  <div className="p-4 flex flex-col gap-2">
                    <input value={newAnnTitle} onChange={e => setNewAnnTitle(e.target.value)} placeholder="Decree Title..." className="w-full bg-black/50 rounded-xl px-4 py-2.5 text-sm focus:outline-none font-serif italic" style={{ border: '1px solid rgba(166,124,82,0.2)', color: '#e6d0a3' }} />
                    <textarea value={newAnnContent} onChange={e => setNewAnnContent(e.target.value)} placeholder="Write your decree here..." rows={3} className="w-full bg-black/50 rounded-xl px-4 py-2.5 text-sm focus:outline-none font-serif resize-none" style={{ border: '1px solid rgba(166,124,82,0.2)', color: '#e6d0a3' }} />
                    <button onClick={handleCreateAnnouncement} disabled={saving || !newAnnTitle.trim() || !newAnnContent.trim()} className="w-full py-2.5 rounded-xl font-black text-sm transition-all disabled:opacity-40" style={{ background: 'linear-gradient(90deg,#6b3c10,#a06420,#6b3c10)', color: '#fde8a0', border: '1px solid rgba(212,175,55,0.5)' }}>
                      📜 Publish Decree
                    </button>
                  </div>
                </div>
              )}
              {announcements.length === 0 ? (
                <div className="text-center py-12 font-serif italic text-sm" style={{ color: 'rgba(166,124,82,0.6)' }}>No decrees have been scribed yet.</div>
              ) : (
                <div className="flex flex-col gap-3">
                  {announcements.map(ann => (
                    <EditableDecree key={ann.id} ann={ann} isOMC={isOMC} isEditing={editingAnnId === ann.id} saving={saving}
                      onEdit={() => setEditingAnnId(ann.id)} onDelete={() => handleDeleteAnnouncement(ann.id)}
                      onSave={(title, content) => handleSaveEdit(ann.id, title, content)} onCancel={() => setEditingAnnId(null)}
                    />
                  ))}
                </div>
              )}
            </div>
            <div className="h-3 w-full shrink-0" style={{ background: 'linear-gradient(90deg,#3a1e08,#8c5e2a,#d4af37,#8c5e2a,#3a1e08)' }} />
          </div>
        </div>
      )}

      {/* Split Costs / Match Bookings Modal (renamed from CM History) */}
      {showCMHistory && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 pb-0 sm:pb-4 bg-black/80 backdrop-blur-sm" onClick={() => setShowCMHistory(false)}>
          <div
            className="rounded-t-3xl sm:rounded-3xl p-6 w-full max-w-md flex flex-col h-[75vh] shadow-2xl relative"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4 pb-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent-soft)', border: '1px solid rgba(0,255,65,0.2)' }}>
                  <Clock size={16} style={{ color: 'var(--accent)' }} />
                </div>
                <div>
                  <h3 className="font-black text-lg leading-none">Cost Split</h3>
                  <p className="text-[10px] font-bold uppercase tracking-widest mt-1" style={{ color: 'var(--text-muted)' }}>Match Bookings</p>
                </div>
              </div>
              <button onClick={() => setShowCMHistory(false)} className="p-2 rounded-full hover:bg-white/5"><X size={20} /></button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-3">
              {cmMatches.length === 0 ? (
                <div className="text-center py-10 text-sm font-bold" style={{ color: 'var(--text-muted)' }}>No match bookings found.</div>
              ) : cmMatches.map((m: any) => {
                const isTeamA   = m.teamA_Id === team.id;
                const opp       = isTeamA ? m.teamB : m.teamA;
                const bookingId = isTeamA ? m.bookingIdA : m.bookingIdB;
                const slot      = cmSlots.find(s => s.id === m.selectedSlotId);
                const venueName = slot ? turfs.find(t => t.id === slot.turfId)?.name || 'Venue' : (m.selectedSlotId ? 'Venue Booked' : 'Venue TBD');
                const splitCost = slot ? '৳' + (slot.price / 2).toLocaleString() : '—';
                return (
                  <div key={m.id}
                    className="p-4 rounded-2xl flex flex-col gap-2 relative overflow-hidden transition-colors"
                    style={{ background: 'var(--bg-surface-raised)', border: '1px solid var(--border-subtle)' }}
                  >
                    <p className="text-[10px] uppercase font-black tracking-widest leading-none" style={{ color: 'var(--accent)' }}>
                      Booking #{bookingId?.slice(-6).toUpperCase() || m.bookingCode}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <div className="font-black text-sm">vs {opp?.name || 'Unknown Team'}</div>
                      <div className="text-[10px] uppercase font-black px-2 py-0.5 rounded-md" style={{ background: 'var(--accent-soft)', color: 'var(--accent)', border: '1px solid rgba(0,255,65,0.2)' }}>
                        {m.bookingCode}
                      </div>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-[11px] font-bold" style={{ color: 'var(--text-secondary)' }}>{venueName}</span>
                      <span className="text-[11px] font-black" style={{ color: 'var(--accent)' }}>{splitCost}</span>
                    </div>
                    <div className="flex items-center justify-between mt-2 pt-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                      <span className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>
                        {m.matchDate ? new Date(m.matchDate).toLocaleDateString() : new Date(m.createdAt).toLocaleDateString()}
                      </span>
                      <span className="text-xs font-black" style={{ color: m.status === 'COMPLETED' ? 'var(--accent)' : 'var(--text-muted)' }}>
                        {m.status === 'COMPLETED' ? 'FINISHED' : 'PENDING'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}


      {/* ── Leave Challenge Market Modal ── */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setShowLeaveModal(false)}>
          <div className="bg-neutral-900 border border-[var(--border-subtle)] rounded-3xl p-6 w-full max-w-sm flex flex-col items-center text-center shadow-2xl relative overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4" style={{ background: 'var(--accent-soft)', border: '1px solid rgba(0,255,65,0.3)' }}>
              <Swords size={26} style={{ color: 'var(--accent)' }} />
            </div>
            <h3 className="font-black text-lg mb-1">Leave Challenge Market?</h3>
            <p className="text-xs mb-6 font-medium" style={{ color: 'var(--text-muted)' }}>
              Your team will be removed from the listing. You can rejoin at any time by subscribing again.
            </p>
            <div className="w-full flex gap-3">
              <button
                onClick={() => setShowLeaveModal(false)}
                disabled={leaving}
                className="flex-[1] py-3 rounded-xl font-bold text-sm transition-colors disabled:opacity-50"
                style={{ background: 'var(--bg-surface-raised)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleLeaveChallenge}
                disabled={leaving}
                className="flex-[2] py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}
              >
                {leaving ? <Loader2 size={15} className="animate-spin" /> : 'Leave Challenge Market'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
