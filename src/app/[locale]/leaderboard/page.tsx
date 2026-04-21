'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  ChevronLeft, BarChart2, Users, Shield, ChevronDown,
  Loader2, Trophy, Medal, Star, TrendingUp
} from 'lucide-react';
import { getRankData, TIER_KEYS, type TierKey } from '@/lib/rankUtils';

// ─── Types ───────────────────────────────────────────────────────────────────

type MainTab = 'teams' | 'players';

const SPORTS = [
  { key: 'ALL',          label: 'All Sports',       emoji: '🏆' },
  { key: 'FUTSAL_5',     label: '5-a-side Futsal',  emoji: '⚽' },
  { key: 'FUTSAL_6',     label: '6-a-side Futsal',  emoji: '⚽' },
  { key: 'FUTSAL_7',     label: '7-a-side Futsal',  emoji: '⚽' },
  { key: 'FOOTBALL_FULL',label: '11v11 Football',   emoji: '⚽' },
  { key: 'CRICKET_7',    label: '7-a-side Cricket', emoji: '🏏' },
  { key: 'CRICKET_FULL', label: '11v11 Cricket',    emoji: '🏏' },
];

const TIER_CONFIG: Record<string, { color: string; glow: string; icon: string }> = {
  ALL     : { color: '#ffffff', glow: '255,255,255', icon: '🏆' },
  Bronze  : { color: '#cd7f32', glow: '165,80,0',    icon: '' },
  Silver  : { color: '#c0c0c0', glow: '180,180,180', icon: '' },
  Gold    : { color: '#ffd700', glow: '200,160,0',   icon: '' },
  Platinum: { color: '#00e5ff', glow: '0,200,220',   icon: '' },
  Legend  : { color: '#ff00ff', glow: '200,0,200',   icon: '' },
};

// ─── Helper ──────────────────────────────────────────────────────────────────

function sportLabel(s: string) {
  return SPORTS.find(x => x.key === s)?.label ?? s;
}

function sportEmoji(s: string) {
  return SPORTS.find(x => x.key === s)?.emoji ?? '🏆';
}

function rankIcon(tier: string) {
  const icons: Record<string, string> = {
    Bronze: '/ranks/Bronze.svg', Silver: '/ranks/Silver.svg',
    Gold: '/ranks/Gold.svg', Platinum: '/ranks/Platinum.svg', Legend: '/ranks/Legend.svg',
  };
  return icons[tier] ?? '';
}

const PODIUM_GLOW = ['rgba(255,215,0,0.3)', 'rgba(192,192,192,0.25)', 'rgba(205,127,50,0.2)'];
const PODIUM_LABEL = ['🥇', '🥈', '🥉'];

// ─── Slide-up Sheet ──────────────────────────────────────────────────────────

function Sheet({
  open, onClose, children
}: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col justify-end"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative bg-[#0e0e0e] border-t border-white/10 rounded-t-3xl p-5 pb-10 max-h-[80dvh] overflow-y-auto"
        style={{ animation: 'slideUp 0.25s cubic-bezier(0.32,0.72,0,1)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-10 h-1 bg-white/20 rounded-full" />
        {children}
      </div>
      <style>{`@keyframes slideUp { from{transform:translateY(100%)} to{transform:translateY(0)} }`}</style>
    </div>
  );
}

// ─── Sport Pill ──────────────────────────────────────────────────────────────

function FilterPill({
  label, value, active, color, onClick
}: { label: string; value: string; active: boolean; color?: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[11px] font-black border transition-all ${
        active
          ? 'bg-white/10 border-white/30 text-white scale-105'
          : 'bg-white/[0.03] border-white/10 text-neutral-400 hover:border-white/20'
      }`}
      style={active && color ? { borderColor: color, color } : {}}
    >
      {label}
    </button>
  );
}

// ─── Team Card ────────────────────────────────────────────────────────────────

function TeamCard({ team, rank }: { team: any; rank: number }) {
  const rd = getRankData(team.mmr);
  const top3 = rank <= 3;
  return (
    <div
      className="flex items-center gap-3 p-3 rounded-2xl border border-white/5 bg-white/[0.03] hover:bg-white/[0.06] transition-all"
      style={top3 ? { boxShadow: `0 0 20px ${PODIUM_GLOW[rank - 1]}`, borderColor: `rgba(255,255,255,0.1)` } : {}}
    >
      {/* Rank */}
      <div className="w-8 shrink-0 text-center">
        {top3
          ? <span className="text-xl">{PODIUM_LABEL[rank - 1]}</span>
          : <span className="text-sm font-black text-neutral-500">#{rank}</span>}
      </div>

      {/* Logo */}
      <div className="w-11 h-11 rounded-xl overflow-hidden bg-neutral-800 border border-white/10 shrink-0 flex items-center justify-center">
        {team.logoUrl
          ? <img src={team.logoUrl} className="w-full h-full object-cover" alt={team.name} />
          : <Shield size={18} className="text-neutral-500" />}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-black text-sm truncate text-white">{team.name}</p>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <span className="text-[9px] text-neutral-500 font-bold">{sportEmoji(team.sportType)} {sportLabel(team.sportType)}</span>
          <span className="text-[9px] text-neutral-600">·</span>
          <span className="text-[9px] text-neutral-500">{team.members} members</span>
          <span className="text-[9px] text-neutral-600">·</span>
          <span className="text-[9px] text-neutral-500">{team.winRate}% WR</span>
        </div>
      </div>

      {/* MMR + Rank */}
      <div className="shrink-0 flex flex-col items-end gap-1">
        <div className="flex items-center gap-1.5">
          {rankIcon(rd.tier) && (
            <img src={rankIcon(rd.tier)} className="w-5 h-5 object-contain" alt={rd.tier} />
          )}
          <span className="text-xs font-black" style={{ color: rd.color }}>{rd.label}</span>
        </div>
        <span className="text-[10px] font-bold text-neutral-400">{team.mmr} MMR</span>
      </div>
    </div>
  );
}

// ─── Player Card ─────────────────────────────────────────────────────────────

function PlayerCard({ player, rank }: { player: any; rank: number }) {
  const rd = getRankData(player.mmr);
  const top3 = rank <= 3;
  const name     = player.fullName ?? player.name ?? '?';
  const initials = name.split(' ').map((w: string) => w[0] ?? '').join('').toUpperCase().slice(0, 2) || '?';
  return (
    <div
      className="flex items-center gap-3 p-3 rounded-2xl border border-white/5 bg-white/[0.03] hover:bg-white/[0.06] transition-all"
      style={top3 ? { boxShadow: `0 0 20px ${PODIUM_GLOW[rank - 1]}`, borderColor: `rgba(255,255,255,0.1)` } : {}}
    >
      {/* Rank */}
      <div className="w-8 shrink-0 text-center">
        {top3
          ? <span className="text-xl">{PODIUM_LABEL[rank - 1]}</span>
          : <span className="text-sm font-black text-neutral-500">#{rank}</span>}
      </div>

      {/* Avatar */}
      <div className="w-11 h-11 rounded-full overflow-hidden bg-neutral-800 border border-white/10 shrink-0 flex items-center justify-center">
        {player.avatarUrl
          ? <img src={player.avatarUrl} className="w-full h-full object-cover" alt={name} />
          : <span className="text-sm font-black text-accent">{initials}</span>}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-black text-sm truncate text-white">{name}</p>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          {player.team ? (
            <div className="flex items-center gap-1">
              {player.team.logoUrl
                ? <img src={player.team.logoUrl} className="w-3 h-3 rounded-sm object-cover" />
                : <Shield size={8} className="text-neutral-500" />}
              <span className="text-[9px] text-neutral-400 font-bold truncate max-w-[80px]">{player.team.name}</span>
            </div>
          ) : (
            <span className="text-[9px] text-neutral-600 italic">No team</span>
          )}
          {player.badges > 0 && (
            <>
              <span className="text-[9px] text-neutral-600">·</span>
              <span className="text-[9px] text-fuchsia-400 font-bold">💎 {player.badges} badges</span>
            </>
          )}
        </div>
      </div>

      {/* MMR + Rank icon */}
      <div className="shrink-0 flex flex-col items-end gap-1">
        <div className="flex items-center gap-1.5">
          {rankIcon(rd.tier) && (
            <img src={rankIcon(rd.tier)} className="w-5 h-5 object-contain" alt={rd.tier} />
          )}
          <span className="text-xs font-black" style={{ color: rd.color }}>{rd.label}</span>
        </div>
        <span className="text-[10px] font-bold text-neutral-400">{player.mmr} MMR</span>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function LeaderboardPage() {
  const router   = useRouter();
  const pathname = usePathname();
  const locale   = pathname.split('/')[1] || 'en';

  // Tabs
  const [mainTab,  setMainTab]  = useState<MainTab>('teams');

  // Filters
  const [sport, setSport] = useState('ALL');
  const [tier,  setTier]  = useState<string>('ALL');

  // Sheet modals
  const [sportSheet, setSportSheet] = useState(false);
  const [tierSheet,  setTierSheet]  = useState(false);

  // Data
  const [data,    setData]    = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/leaderboard?type=${mainTab}&sport=${sport}&tier=${tier}`
      );
      const json = await res.json();
      setData(json.leaderboard ?? []);
    } catch {
      setData([]);
    }
    setLoading(false);
  }, [mainTab, sport, tier]);

  useEffect(() => { load(); }, [load]);

  const activeSport = SPORTS.find(s => s.key === sport) ?? SPORTS[0];
  const activeTier  = tier;
  const tierConf    = TIER_CONFIG[tier] ?? TIER_CONFIG.ALL;

  return (
    <div className="min-h-screen bg-[#080808] text-white pb-28 flex flex-col">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-[#080808]/90 backdrop-blur-md border-b border-white/5 px-4 pt-4 pb-3">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => router.push(`/${locale}/arena`)}
            className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="flex items-center gap-2">
            <BarChart2 size={18} className="text-orange-400" />
            <h1 className="font-black text-xl tracking-tight">Leaderboard</h1>
          </div>
        </div>

        {/* Main Tabs */}
        <div className="flex gap-2 bg-white/5 p-1 rounded-2xl">
          {(['teams', 'players'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setMainTab(tab)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[12px] font-black uppercase tracking-wider transition-all ${
                mainTab === tab
                  ? 'bg-orange-500 text-black shadow-[0_0_16px_rgba(249,115,22,0.4)]'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              {tab === 'teams' ? <Shield size={13} /> : <Users size={13} />}
              {tab}
            </button>
          ))}
        </div>
      </header>

      {/* ── Filter Bar ─────────────────────────────────────────────────────── */}
      <div className="px-4 pt-3 pb-2 flex gap-2 overflow-x-auto scrollbar-none shrink-0">
        {/* Sport selector */}
        <button
          onClick={() => setSportSheet(true)}
          className="shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[11px] font-black border border-white/20 bg-white/5 hover:bg-white/10 transition-all"
        >
          <span>{activeSport.emoji}</span>
          <span className="text-white">{activeSport.label}</span>
          <ChevronDown size={11} className="text-neutral-400" />
        </button>

        {/* Tier selector */}
        <button
          onClick={() => setTierSheet(true)}
          className="shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[11px] font-black border bg-white/5 hover:bg-white/10 transition-all"
          style={{ borderColor: activeTier === 'ALL' ? 'rgba(255,255,255,0.2)' : tierConf.color, color: activeTier === 'ALL' ? '#fff' : tierConf.color }}
        >
          {activeTier !== 'ALL' && rankIcon(activeTier) && (
            <img src={rankIcon(activeTier)} className="w-4 h-4 object-contain" />
          )}
          {activeTier === 'ALL' ? '🏆 All Ranks' : activeTier}
          <ChevronDown size={11} className="opacity-60" />
        </button>
      </div>

      {/* ── Stats bar ──────────────────────────────────────────────────────── */}
      <div className="px-4 pb-3">
        <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">
          {loading ? 'Loading…' : `${data.length} ${mainTab} · ${activeSport.label} · ${activeTier === 'ALL' ? 'All Ranks' : activeTier}`}
        </p>
      </div>

      {/* ── List ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 px-4 flex flex-col gap-2">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 size={32} className="animate-spin text-orange-400" />
            <p className="text-neutral-500 text-sm">Loading rankings…</p>
          </div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Trophy size={40} className="text-neutral-700" />
            <p className="text-neutral-500 font-black">No data yet</p>
            <p className="text-neutral-700 text-xs text-center">Play matches to appear on the leaderboard.</p>
          </div>
        ) : (
          <>
            {/* Top-3 podium visual */}
            {data.length >= 3 && (
              <div className="flex items-end justify-center gap-3 py-4 mb-2">
                {/* 2nd */}
                <div className="flex flex-col items-center gap-2 flex-1">
                  <div className="w-14 h-14 rounded-full overflow-hidden border-4 border-[#c0c0c0]/50 bg-neutral-800 flex items-center justify-center shadow-[0_0_20px_rgba(192,192,192,0.2)]">
                    {mainTab === 'teams'
                      ? (data[1].logoUrl ? <img src={data[1].logoUrl} className="w-full h-full object-cover" /> : <Shield size={20} className="text-neutral-500" />)
                      : (data[1].avatarUrl ? <img src={data[1].avatarUrl} className="w-full h-full object-cover" /> : <span className="font-black text-lg text-neutral-400">{(data[1].fullName ?? data[1].name ?? '?')[0]}</span>)}
                  </div>
                  <span className="text-[10px] font-black text-neutral-400 truncate max-w-[70px] text-center">{data[1].name ?? data[1].fullName ?? '?'}</span>
                  <div className="bg-[#c0c0c0]/20 border border-[#c0c0c0]/30 rounded-t-xl px-3 py-3 text-center w-full">
                    <p className="text-xl font-black">🥈</p>
                    <p className="text-[9px] text-[#c0c0c0] font-black mt-0.5">{data[1].mmr} MMR</p>
                  </div>
                </div>
                {/* 1st */}
                <div className="flex flex-col items-center gap-2 flex-1">
                  <div className="w-[4.5rem] h-[4.5rem] rounded-full overflow-hidden border-4 border-[#ffd700]/60 bg-neutral-800 flex items-center justify-center shadow-[0_0_30px_rgba(255,215,0,0.3)]">
                    {mainTab === 'teams'
                      ? (data[0].logoUrl ? <img src={data[0].logoUrl} className="w-full h-full object-cover" /> : <Shield size={24} className="text-neutral-500" />)
                      : (data[0].avatarUrl ? <img src={data[0].avatarUrl} className="w-full h-full object-cover" /> : <span className="font-black text-xl text-neutral-400">{(data[0].fullName ?? data[0].name ?? '?')[0]}</span>)}
                  </div>
                  <span className="text-[11px] font-black text-white truncate max-w-[80px] text-center">{data[0].name ?? data[0].fullName ?? '?'}</span>
                  <div className="bg-[#ffd700]/15 border border-[#ffd700]/30 rounded-t-xl px-3 py-4 text-center w-full">
                    <p className="text-2xl font-black">🥇</p>
                    <p className="text-[9px] text-[#ffd700] font-black mt-0.5">{data[0].mmr} MMR</p>
                  </div>
                </div>
                {/* 3rd */}
                <div className="flex flex-col items-center gap-2 flex-1">
                  <div className="w-12 h-12 rounded-full overflow-hidden border-4 border-[#cd7f32]/40 bg-neutral-800 flex items-center justify-center shadow-[0_0_16px_rgba(205,127,50,0.2)]">
                    {mainTab === 'teams'
                      ? (data[2].logoUrl ? <img src={data[2].logoUrl} className="w-full h-full object-cover" /> : <Shield size={16} className="text-neutral-500" />)
                      : (data[2].avatarUrl ? <img src={data[2].avatarUrl} className="w-full h-full object-cover" /> : <span className="font-black text-base text-neutral-400">{(data[2].fullName ?? data[2].name ?? '?')[0]}</span>)}
                  </div>
                  <span className="text-[10px] font-black text-neutral-400 truncate max-w-[65px] text-center">{data[2].name ?? data[2].fullName ?? '?'}</span>
                  <div className="bg-[#cd7f32]/15 border border-[#cd7f32]/30 rounded-t-xl px-3 py-2.5 text-center w-full">
                    <p className="text-lg font-black">🥉</p>
                    <p className="text-[9px] text-[#cd7f32] font-black mt-0.5">{data[2].mmr} MMR</p>
                  </div>
                </div>
              </div>
            )}

            {/* Full list (skip top-3 if podium shown) */}
            <div className="flex flex-col gap-2">
              {(data.length >= 3 ? data.slice(3) : data).map((item: any, i: number) => {
                const rank = data.length >= 3 ? i + 4 : i + 1;
                return mainTab === 'teams'
                  ? <TeamCard key={item.id} team={item} rank={rank} />
                  : <PlayerCard key={item.id} player={item} rank={rank} />;
              })}
            </div>
          </>
        )}
      </div>

      {/* ── Sport Sheet ────────────────────────────────────────────────────── */}
      <Sheet open={sportSheet} onClose={() => setSportSheet(false)}>
        <h3 className="font-black text-base mb-4 text-center">Select Sport</h3>
        <div className="flex flex-col gap-2">
          {SPORTS.map(s => (
            <button
              key={s.key}
              onClick={() => { setSport(s.key); setSportSheet(false); }}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border text-left transition-all ${
                sport === s.key
                  ? 'bg-white/10 border-white/30 text-white'
                  : 'bg-white/[0.03] border-white/10 text-neutral-400 hover:border-white/20'
              }`}
            >
              <span className="text-2xl">{s.emoji}</span>
              <span className="font-black text-sm">{s.label}</span>
              {sport === s.key && <span className="ml-auto text-accent text-sm">✓</span>}
            </button>
          ))}
        </div>
      </Sheet>

      {/* ── Tier Sheet ─────────────────────────────────────────────────────── */}
      <Sheet open={tierSheet} onClose={() => setTierSheet(false)}>
        <h3 className="font-black text-base mb-4 text-center">Select Rank</h3>
        <div className="flex flex-col gap-2">
          {/* All option */}
          <button
            onClick={() => { setTier('ALL'); setTierSheet(false); }}
            className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border text-left transition-all ${
              tier === 'ALL'
                ? 'bg-white/10 border-white/30 text-white'
                : 'bg-white/[0.03] border-white/10 text-neutral-400 hover:border-white/20'
            }`}
          >
            <span className="text-2xl">🏆</span>
            <span className="font-black text-sm">All Ranks</span>
            {tier === 'ALL' && <span className="ml-auto text-accent text-sm">✓</span>}
          </button>

          {TIER_KEYS.map(t => {
            const conf = TIER_CONFIG[t];
            const icon = rankIcon(t);
            return (
              <button
                key={t}
                onClick={() => { setTier(t); setTierSheet(false); }}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border text-left transition-all ${
                  tier === t
                    ? 'bg-white/10 text-white'
                    : 'bg-white/[0.03] border-white/10 text-neutral-400 hover:border-white/20'
                }`}
                style={tier === t ? { borderColor: conf.color } : {}}
              >
                {icon
                  ? <img src={icon} className="w-8 h-8 object-contain" alt={t} />
                  : <span className="text-2xl">{conf.icon}</span>}
                <div className="flex flex-col">
                  <span className="font-black text-sm" style={{ color: conf.color }}>{t}</span>
                  <span className="text-[9px] text-neutral-500 font-bold">
                    {({ Bronze:'0–674', Silver:'675–1349', Gold:'1350–2024', Platinum:'2025–2699', Legend:'2700+' } as Record<string,string>)[t]} MMR
                  </span>
                </div>
                {tier === t && <span className="ml-auto text-accent text-sm">✓</span>}
              </button>
            );
          })}
        </div>
      </Sheet>

    </div>
  );
}
