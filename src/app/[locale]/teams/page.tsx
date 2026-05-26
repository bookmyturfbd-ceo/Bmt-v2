'use client';
import { useState, useEffect, useRef } from 'react';
import { Users, Plus, Camera, X, Loader2, ChevronRight, Shield, Trophy, Swords } from 'lucide-react';
import { uploadFileToCDN } from '@/lib/supabase';
import { Link } from '@/i18n/routing';

type TeamType = 'REGULAR' | 'TOURNAMENT';

interface Team {
  id: string;
  name: string;
  sport: string;
  teamType: TeamType;
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

const COMPETITIVE_MODES = [
  { id: 'FUTSAL_5',      name: 'Futsal (5-a-side)' },
  { id: 'FUTSAL_6',      name: 'Futsal (6-a-side)' },
  { id: 'FUTSAL_7',      name: 'Futsal (7-a-side)' },
  { id: 'CRICKET_7',     name: 'Cricket (7-a-side)' },
  { id: 'FOOTBALL_FULL', name: 'Football (Full 11v11)' },
  { id: 'CRICKET_FULL',  name: 'Cricket (Full 11v11)' },
];

// ── Create Team Modal ──────────────────────────────────────────────────────────
function CreateTeamModal({
  onClose,
  onCreated,
  defaultType,
}: {
  onClose: () => void;
  onCreated: () => void;
  defaultType: TeamType;
}) {
  const [name,      setName]      = useState('');
  const [sport,     setSport]     = useState('');
  const [teamType,  setTeamType]  = useState<TeamType>(defaultType);
  const [logoUrl,   setLogoUrl]   = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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
      body: JSON.stringify({ name: name.trim(), sport, logoUrl, teamType }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || 'Failed to create team'); setSaving(false); return; }
    setSaving(false);
    onCreated();
    onClose();
  };

  const isTournament = teamType === 'TOURNAMENT';

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-md glass-panel rounded-3xl border border-[var(--panel-border)] shadow-2xl z-10 overflow-hidden">
        {/* Top accent bar — green for regular, amber for tournament */}
        <div className={`h-1 w-full bg-gradient-to-r ${isTournament ? 'from-amber-500/0 via-amber-400 to-amber-500/0' : 'from-accent/0 via-accent to-accent/0'}`} />
        <div className="p-6 flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black">Create New Team</h2>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-[var(--panel-bg)] border border-[var(--panel-border)] flex items-center justify-center">
              <X size={14} />
            </button>
          </div>

          {/* Team type selector */}
          <div className="flex gap-2">
            {(['REGULAR', 'TOURNAMENT'] as TeamType[]).map(type => (
              <button
                key={type}
                onClick={() => setTeamType(type)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl border-2 text-xs font-black transition-all ${
                  teamType === type
                    ? type === 'TOURNAMENT'
                      ? 'bg-amber-500/15 border-amber-400/60 text-amber-300'
                      : 'bg-accent/10 border-accent text-accent'
                    : 'bg-[var(--panel-bg)] border-[var(--panel-border)] text-[var(--muted)] hover:border-accent/30'
                }`}
              >
                {type === 'TOURNAMENT' ? <Trophy size={13} /> : <Swords size={13} />}
                {type === 'REGULAR' ? 'Regular' : 'Tournament'}
              </button>
            ))}
          </div>

          {/* Info strip */}
          <div className={`px-3 py-2 rounded-xl text-[11px] font-medium leading-relaxed ${
            isTournament ? 'bg-amber-500/8 border border-amber-500/20 text-amber-300' : 'bg-accent/5 border border-accent/15 text-accent/80'
          }`}>
            {isTournament
              ? '🏆 Tournament teams participate in organised competitions only. They do not appear in the Challenge Market.'
              : '⚔️ Rank teams compete in the Challenge Market and can challenge other teams to matches.'}
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
            className={`flex items-center justify-center gap-2 py-3.5 font-black text-sm rounded-2xl transition-all disabled:opacity-40 ${
              isTournament
                ? 'bg-amber-400 text-black hover:brightness-110 shadow-[0_4px_20px_rgba(251,191,36,0.3)]'
                : 'bg-accent text-black hover:brightness-110 shadow-[0_4px_20px_rgba(0,255,65,0.3)]'
            }`}
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} strokeWidth={3} />}
            {saving ? 'Creating…' : `Create ${isTournament ? 'Tournament' : 'Regular'} Team`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Team Card ─────────────────────────────────────────────────────────────────
function TeamCard({ team }: { team: Team }) {
  const isTournament = team.teamType === 'TOURNAMENT';
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
          <span className="text-2xl">{getSportEmoji(team.sport)}</span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-black text-base truncate">{team.name}</p>
          {isTournament && (
            <Trophy size={11} className="text-amber-400 shrink-0" />
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-sm">{getSportEmoji(team.sport)}</span>
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

// ── Empty State ───────────────────────────────────────────────────────────────
function EmptyState({ type, onCreate }: { type: TeamType; onCreate: () => void }) {
  const isTournament = type === 'TOURNAMENT';
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
      <div className="w-20 h-20 rounded-3xl bg-[var(--panel-bg)] border border-[var(--panel-border)] flex items-center justify-center">
        {isTournament
          ? <Trophy size={32} className="text-amber-400 opacity-40" />
          : <Users size={32} className="text-[var(--muted)] opacity-40" />
        }
      </div>
      <div>
        <p className="font-bold text-base">No {isTournament ? 'tournament' : 'regular'} teams yet</p>
        <p className="text-sm text-[var(--muted)] mt-0.5">
          {isTournament
            ? 'Create a tournament team to compete in organised competitions'
            : 'Create a rank team to enter the Challenge Market'}
        </p>
      </div>
      <button
        onClick={onCreate}
        className={`px-6 py-2.5 text-sm font-black rounded-full transition-all ${
          isTournament
            ? 'bg-amber-400 text-black hover:brightness-110'
            : 'bg-accent text-black hover:brightness-110'
        }`}
      >
        Create {isTournament ? 'Tournament' : 'Regular'} Team
      </button>
    </div>
  );
}

// ── Main Teams Page ───────────────────────────────────────────────────────────
export default function TeamsPage() {
  const [activeTab,  setActiveTab]  = useState<TeamType>('REGULAR');
  const [allTeams,   setAllTeams]   = useState<Team[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [inviteActionId, setInviteActionId] = useState<string | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [loggedIn,   setLoggedIn]   = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [resTeams, resInvites] = await Promise.all([
        fetch('/api/teams'),
        fetch('/api/teams/invitations')
      ]);
      if (resTeams.status === 401) { setLoggedIn(false); setLoading(false); return; }
      
      const dataTeams = await resTeams.json();
      setAllTeams(dataTeams.teams ?? []);

      if (resInvites.ok) {
        const dataInvites = await resInvites.json();
        setInvitations(dataInvites.invitations ?? []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInviteResponse = async (inviteId: string, action: 'accept' | 'decline') => {
    setInviteActionId(inviteId);
    try {
      const res = await fetch(`/api/teams/invitations/${inviteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      const data = await res.json();
      if (res.ok) {
        await load();
      } else {
        alert(data.error || `Failed to ${action} invitation.`);
      }
    } catch (err: any) {
      alert(err.message || 'An error occurred.');
    } finally {
      setInviteActionId(null);
    }
  };

  useEffect(() => { load(); }, []);

  const teams = allTeams.filter(t => t.teamType === activeTab);
  const activeInvitations = invitations.filter(inv => inv.team?.teamType === activeTab);

  const TABS: { key: TeamType; label: string; icon: typeof Swords }[] = [
    { key: 'REGULAR',    label: 'Rank Teams',    icon: Swords  },
    { key: 'TOURNAMENT', label: 'Tournament Teams', icon: Trophy  },
  ];

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

        {/* Tabs */}
        <div className="flex gap-2 px-4 pt-3 pb-1">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl border text-xs font-black transition-all ${
                activeTab === tab.key
                  ? tab.key === 'TOURNAMENT'
                    ? 'bg-amber-400/15 border-amber-400/50 text-amber-300'
                    : 'bg-accent/15 border-accent/40 text-accent'
                  : 'bg-[var(--panel-bg)] border-[var(--panel-border)] text-[var(--muted)] hover:text-foreground'
              }`}
            >
              <tab.icon size={13} />
              {tab.label}
              {!loading && (
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black ${
                  activeTab === tab.key
                    ? tab.key === 'TOURNAMENT'
                      ? 'bg-amber-400/20 text-amber-300'
                      : 'bg-accent/20 text-accent'
                    : 'bg-neutral-800 text-neutral-500'
                }`}>
                  {allTeams.filter(t => t.teamType === tab.key).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Context description */}
        <div className="px-4 py-2">
          <p className="text-[11px] text-[var(--muted)] font-medium">
            {activeTab === 'REGULAR'
              ? '⚔️ Rank teams are used in the Challenge Market to challenge other teams.'
              : '🏆 Tournament teams participate in organised competitions and leagues only.'}
          </p>
        </div>

        {/* Content */}
        <div className="flex flex-col gap-3 px-4 pt-1">
          {/* Pending Invitations Banner */}
          {activeInvitations.length > 0 && (
            <div className="flex flex-col gap-2 shrink-0 mb-2">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)] flex items-center gap-1.5">
                <span>✉️ Pending Invitations ({activeInvitations.length})</span>
              </h3>
              
              <div className="flex flex-col gap-2.5">
                {activeInvitations.map((invite) => {
                  const isTourney = invite.team?.teamType === 'TOURNAMENT';
                  const accentColorClass = isTourney ? 'border-amber-500/30 bg-amber-500/5' : 'border-accent/30 bg-accent/5';
                  const textColorClass = isTourney ? 'text-amber-400' : 'text-accent';
                  const glowShadow = isTourney ? 'shadow-[0_0_15px_rgba(251,191,36,0.08)]' : 'shadow-[0_0_15px_rgba(0,255,65,0.08)]';

                  return (
                    <div
                      key={invite.id}
                      className={`flex flex-col p-4 rounded-2xl border ${accentColorClass} ${glowShadow} backdrop-blur-md transition-all gap-3`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Team Logo */}
                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-black/40 border border-white/10 shrink-0 flex items-center justify-center">
                          {invite.team?.logoUrl ? (
                            <img src={invite.team.logoUrl} alt={invite.team.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xl">{getSportEmoji(invite.team?.sport || '')}</span>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-grow min-w-0">
                          <p className="font-black text-sm text-white truncate leading-tight">{invite.team?.name}</p>
                          <p className="text-[10px] text-[var(--muted)] mt-1 font-bold">
                            {invite.team?.sport}
                          </p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleInviteResponse(invite.id, 'accept')}
                          disabled={inviteActionId !== null}
                          className={`flex-grow py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all text-black hover:brightness-110 active:scale-95 disabled:opacity-40
                            ${isTourney ? 'bg-amber-400 shadow-[0_4px_12px_rgba(251,191,36,0.2)]' : 'bg-accent shadow-[0_4px_12px_rgba(0,255,65,0.2)]'}`}
                        >
                          {inviteActionId === invite.id ? (
                            <Loader2 size={12} className="animate-spin text-black" />
                          ) : '✓ Accept'}
                        </button>
                        <button
                          onClick={() => handleInviteResponse(invite.id, 'decline')}
                          disabled={inviteActionId !== null}
                          className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-neutral-800 hover:bg-neutral-700 text-red-400 border border-red-500/20 transition-all hover:border-red-500/40 active:scale-95 disabled:opacity-40"
                        >
                          {inviteActionId === invite.id ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : 'Decline'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Create button */}
          <button
            onClick={() => loggedIn ? setShowCreate(true) : null}
            className={`flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl border-2 border-dashed font-black text-sm hover:brightness-110 transition-all ${
              activeTab === 'TOURNAMENT'
                ? 'border-amber-400/40 text-amber-400 hover:bg-amber-400/5 hover:border-amber-400/70'
                : 'border-accent/40 text-accent hover:bg-accent/5 hover:border-accent/70'
            }`}
          >
            <Plus size={16} strokeWidth={3} />
            Create {activeTab === 'TOURNAMENT' ? 'Tournament' : 'Regular'} Team
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
            <EmptyState type={activeTab} onCreate={() => setShowCreate(true)} />
          ) : (
            teams.map(team => <TeamCard key={team.id} team={team} />)
          )}
        </div>
      </div>

      {showCreate && (
        <CreateTeamModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { load(); }}
          defaultType={activeTab}
        />
      )}
    </div>
  );
}
