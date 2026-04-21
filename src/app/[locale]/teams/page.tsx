'use client';
import { useState, useEffect, useRef } from 'react';
import { Users, Trophy, Plus, Camera, X, Loader2, ChevronRight, Shield, Swords } from 'lucide-react';
import { uploadFileToCDN } from '@/lib/supabase';
import { Link } from '@/i18n/routing';

interface Team {
  id: string;
  name: string;
  sport: string;
  logoUrl?: string | null;
  myRole: 'owner' | 'member';
  memberCount: number;
  ownerId: string;
  owner: { id: string; fullName: string };
}

const SPORT_EMOJI_MAP: Record<string, string> = {
  futsal: '⚽', football: '⚽', cricket: '🏏',
  badminton: '🏸', basketball: '🏀', tennis: '🎾',
  swimming: '🏊', billiard: '🎱', snooker: '🎱',
  volleyball: '🏐', rugby: '🏉',
};

function getSportEmoji(name: string) {
  const l = name.toLowerCase();
  for (const [k, v] of Object.entries(SPORT_EMOJI_MAP)) if (l.includes(k)) return v;
  return '🏟';
}

function sportEmoji(sport: string) { return getSportEmoji(sport); }

interface PlatformSport { id: string; name: string; }

// ── Create Team Modal ──────────────────────────────────────────────────────────
function CreateTeamModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name,        setName]        = useState('');
  const [sport,       setSport]       = useState('');
  const [logoUrl,     setLogoUrl]     = useState<string | null>(null);
  const [uploading,   setUploading]   = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const COMPETITIVE_MODES = [
    { id: 'FUTSAL_5', name: 'Futsal (5-a-side)' },
    { id: 'FUTSAL_6', name: 'Futsal (6-a-side)' },
    { id: 'FUTSAL_7', name: 'Futsal (7-a-side)' },
    { id: 'CRICKET_7', name: 'Cricket (7-a-side)' },
    { id: 'FOOTBALL_FULL', name: 'Football (Full 11v11)' },
    { id: 'CRICKET_FULL', name: 'Cricket (Full 11v11)' }
  ];

  const handleLogo = async (files: FileList | null) => {
    if (!files?.[0]) return;
    setUploading(true);
    try {
      const url = await uploadFileToCDN(files[0], 'team-logos');
      setLogoUrl(url);
    } catch { setError('Logo upload failed'); }
    setUploading(false);
  };

  const submit = async () => {
    if (!name.trim()) return setError('Team name is required');
    if (!sport)       return setError('Please select a sport');
    setSaving(true); setError(null);
    const res = await fetch('/api/teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), sport, logoUrl }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || 'Failed to create team'); setSaving(false); return; }
    setSaving(false);
    onCreated();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-md glass-panel rounded-3xl border border-[var(--panel-border)] shadow-2xl z-10 overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-accent/0 via-accent to-accent/0" />
        <div className="p-6 flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black">Create New Team</h2>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-[var(--panel-bg)] border border-[var(--panel-border)] flex items-center justify-center">
              <X size={14} />
            </button>
          </div>

          {/* Logo upload */}
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="relative w-24 h-24 rounded-3xl bg-[var(--panel-bg)] border-2 border-dashed border-[var(--panel-border)] hover:border-accent/50 transition-all overflow-hidden flex items-center justify-center group"
            >
              {uploading ? (
                <Loader2 size={22} className="text-accent animate-spin" />
              ) : logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-1.5 text-[var(--muted)] group-hover:text-accent transition-colors">
                  <Camera size={22} />
                  <span className="text-[10px] font-bold">Upload Logo</span>
                </div>
              )}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => handleLogo(e.target.files)} />
            <p className="text-[10px] text-[var(--muted)]">Optional — team logo image</p>
          </div>

          {/* Team name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--muted)]">Team Name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Thunder FC"
              maxLength={40}
              className="bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:border-accent/50 placeholder:text-[var(--muted)] placeholder:font-normal transition-colors"
            />
          </div>

          {/* Sport selection */}
          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--muted)]">Sport</label>
            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
              {COMPETITIVE_MODES.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSport(s.id)}
                  className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 text-sm font-bold transition-all text-left ${
                    sport === s.id
                      ? 'bg-accent/10 border-accent text-accent'
                      : 'bg-[var(--panel-bg)] border-[var(--panel-border)] text-foreground hover:border-accent/30'
                  }`}
                >
                  <span className="text-xl">{getSportEmoji(s.name)}</span>
                  {s.name}
                  {sport === s.id && <Shield size={14} className="ml-auto text-accent" />}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-400 font-semibold">
              {error}
            </div>
          )}

          <button
            onClick={submit}
            disabled={saving || uploading || !name.trim() || !sport}
            className="flex items-center justify-center gap-2 py-3.5 bg-accent text-black font-black text-sm rounded-2xl hover:brightness-110 transition-all disabled:opacity-40 shadow-[0_4px_20px_rgba(0,255,65,0.3)]"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} strokeWidth={3} />}
            Create Team
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Team Card ─────────────────────────────────────────────────────────────────
function TeamCard({ team }: { team: Team }) {
  return (
    <Link 
      href={`/teams/${team.id}`}
      className="flex items-center gap-4 p-4 glass-panel rounded-2xl border border-[var(--panel-border)] hover:border-accent/30 transition-all active:scale-[0.98] cursor-pointer group block"
    >
      {/* Logo */}
      <div className="w-14 h-14 rounded-2xl overflow-hidden bg-[var(--panel-bg)] border border-[var(--panel-border)] shrink-0 flex items-center justify-center">
        {team.logoUrl ? (
          <img src={team.logoUrl} alt={team.name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-2xl">{sportEmoji(team.sport)}</span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-black text-base truncate">{team.name}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-sm">{sportEmoji(team.sport)}</span>
          <span className="text-[11px] text-[var(--muted)] font-semibold">{team.sport}</span>
        </div>
        <div className="flex items-center gap-3 mt-1">
          <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${
            team.myRole === 'owner'
              ? 'bg-accent/10 border-accent/30 text-accent'
              : 'bg-[var(--panel-bg)] border-[var(--panel-border)] text-[var(--muted)]'
          }`}>
            {team.myRole === 'owner' ? '👑 Owner' : 'Member'}
          </span>
          <span className="text-[10px] text-[var(--muted)]">
            {team.memberCount} member{team.memberCount !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      <ChevronRight size={16} className="text-[var(--muted)] group-hover:text-accent transition-colors shrink-0" />
    </Link>
  );
}

// ── Leaderboard placeholder ───────────────────────────────────────────────────
function LeaderboardTab() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 px-4 text-center">
      <div className="w-20 h-20 rounded-3xl bg-accent/10 border border-accent/20 flex items-center justify-center">
        <Trophy size={36} className="text-accent opacity-60" />
      </div>
      <div>
        <h3 className="font-black text-lg">Leaderboard</h3>
        <p className="text-sm text-[var(--muted)] mt-1">Rankings coming soon — create your team to get on the board!</p>
      </div>
    </div>
  );
}

// ── Play placeholder ──────────────────────────────────────────────────────────
function PlayTab() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 px-4 text-center">
      <div className="w-20 h-20 rounded-3xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
        <Swords size={36} className="text-blue-400 opacity-60" />
      </div>
      <div>
        <h3 className="font-black text-lg">Play with Friends</h3>
        <p className="text-sm text-[var(--muted)] mt-1">Challenge other teams and schedule matches — coming soon!</p>
      </div>
    </div>
  );
}

// ── Main Teams Page ───────────────────────────────────────────────────────────
type Tab = 'teams' | 'play' | 'board';

export default function TeamsPage() {
  const [tab,        setTab]        = useState<Tab>('teams');
  const [teams,      setTeams]      = useState<Team[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [loggedIn,   setLoggedIn]   = useState(true);

  const load = async () => {
    setLoading(true);
    const res = await fetch('/api/teams');
    if (res.status === 401) { setLoggedIn(false); setLoading(false); return; }
    const data = await res.json();
    setTeams(data.teams ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="flex flex-col min-h-screen bg-background pb-24 pt-2">
      <div className="w-full max-w-md mx-auto flex flex-col">

        {/* Header */}
        <div className="px-4 pt-4 pb-2 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight">My Teams</h1>
            <p className="text-xs text-[var(--muted)] mt-0.5">Build your squad, challenge others</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center">
            <Users size={18} className="text-accent" />
          </div>
        </div>

        {/* Sub-tabs */}
        <div className="px-4 py-3">
          <div className="flex gap-2 p-1 bg-[var(--panel-bg)] rounded-2xl border border-[var(--panel-border)]">
            {([
              { id: 'teams', label: 'Teams',     icon: Users },
              { id: 'play',  label: 'Play',       icon: Swords },
              { id: 'board', label: 'Board',      icon: Trophy },
            ] as const).map(t => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-black transition-all ${
                    tab === t.id
                      ? 'bg-accent text-black shadow-[0_2px_12px_rgba(0,255,65,0.25)]'
                      : 'text-[var(--muted)] hover:text-foreground'
                  }`}
                >
                  <Icon size={13} />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        {tab === 'play'  && <PlayTab />}
        {tab === 'board' && <LeaderboardTab />}
        {tab === 'teams' && (
          <div className="flex flex-col gap-3 px-4">

            {/* Create button */}
            <button
              onClick={() => loggedIn ? setShowCreate(true) : null}
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl border-2 border-dashed border-accent/40 text-accent font-black text-sm hover:bg-accent/5 hover:border-accent/70 transition-all"
            >
              <Plus size={16} strokeWidth={3} />
              Create New Team
            </button>

            {!loggedIn ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                <Shield size={36} className="text-[var(--muted)] opacity-30" />
                <p className="text-sm font-bold text-[var(--muted)]">Login to create and manage teams</p>
                <a href="/en/login" className="px-6 py-2.5 bg-accent text-black text-sm font-black rounded-full">Sign In</a>
              </div>
            ) : loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 size={28} className="text-accent animate-spin" />
              </div>
            ) : teams.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
                <div className="w-20 h-20 rounded-3xl bg-[var(--panel-bg)] border border-[var(--panel-border)] flex items-center justify-center">
                  <Users size={32} className="text-[var(--muted)] opacity-40" />
                </div>
                <div>
                  <p className="font-bold text-base">No teams yet</p>
                  <p className="text-sm text-[var(--muted)] mt-0.5">Create your first team to get started</p>
                </div>
              </div>
            ) : (
              teams.map(team => <TeamCard key={team.id} team={team} />)
            )}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateTeamModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { load(); }}
        />
      )}
    </div>
  );
}
