'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, AlertTriangle, Loader2, Settings, MapPin, Tent, Clock, X, Search, Plus, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';

const btnTap = { scale: 0.97 };

export default function TeamSettingsPage() {
  const { id, locale = 'en' } = useParams() as { id: string; locale?: string };
  const router = useRouter();

  const [team,         setTeam]         = useState<any>(null);
  const [loading,      setLoading]      = useState(true);
  const [myRole,       setMyRole]       = useState('none');
  const [saving,       setSaving]       = useState(false);

  const [cities,       setCities]       = useState<any[]>([]);
  const [turfs,         setTurfs]        = useState<any[]>([]);
  const [showAreaModal, setShowAreaModal] = useState(false);
  const [showTurfModal, setShowTurfModal] = useState(false);
  const [search,        setSearch]       = useState('');
  const [areaSearch,    setAreaSearch]   = useState('');
  const [turfSearch,    setTurfSearch]   = useState('');

  // Delete confirmation — type the team name
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleteError,   setDeleteError]   = useState('');

  useEffect(() => {
    fetch(`/api/teams/${id}?t=${Date.now()}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        setTeam(d.team);
        if (d.team && d.myPlayerId) {
          const me = d.team.members.find((m: any) => m.playerId === d.myPlayerId);
          setMyRole(me?.role || (d.team.ownerId === d.myPlayerId ? 'owner' : 'none'));
        }
        setLoading(false);
      });
  }, [id]);

  const handleDeleteTeam = async () => {
    if (!team || deleteConfirm !== team.name) return;
    setSaving(true);
    setDeleteError('');
    const res = await fetch(`/api/teams/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete_team', payload: { password: deleteConfirm } }),
    });
    if (res.ok) {
      router.push(`/${locale}/teams`);
    } else {
      const d = await res.json();
      setDeleteError(d.error || 'Failed to delete team.');
      setSaving(false);
    }
  };


  const handleUpdateAreas = async (ids: string[]) => {
    setSaving(true);
    await fetch(`/api/teams/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'update_home_areas', payload: { areaIds: ids } }) });
    const d = await fetch(`/api/teams/${id}?t=${Date.now()}`, { cache: 'no-store' }).then(r => r.json());
    setTeam(d.team); setSaving(false);
  };

  const handleUpdateTurfs = async (ids: string[]) => {
    setSaving(true);
    await fetch(`/api/teams/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'update_home_turfs', payload: { turfIds: ids } }) });
    const d = await fetch(`/api/teams/${id}?t=${Date.now()}`, { cache: 'no-store' }).then(r => r.json());
    setTeam(d.team); setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
        <Loader2 size={28} className="animate-spin" style={{ color: 'var(--accent)' }} />
      </div>
    );
  }

  if (!team || myRole === 'none') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
        <p className="text-sm font-bold" style={{ color: 'var(--text-muted)' }}>You don&apos;t have access to this page.</p>
        <Link href={`/${locale}/teams/${id}`} className="text-xs font-bold" style={{ color: 'var(--accent)' }}>← Back to team</Link>
      </div>
    );
  }

  const canDelete = deleteConfirm === team.name;

  return (
    <div className="min-h-screen pb-24 font-sans" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>

      {/* Header */}
      <div
        className="sticky top-5 z-40"
        style={{ background: 'rgba(5,5,5,0.92)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border-subtle)' }}
      >
        <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href={`/${locale}/teams/${id}?tab=stats`}
            className="w-8 h-8 flex items-center justify-center rounded-full transition-colors"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}
          >
            <ArrowLeft size={15} />
          </Link>
          <div className="flex items-center gap-2">
            <Settings size={16} style={{ color: 'var(--text-muted)' }} />
            <h1 className="font-black text-sm">Team Settings</h1>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 mt-6 flex flex-col gap-4">

        {/* General info card */}
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
          <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <p className="font-black text-sm">General</p>
          </div>
          <div className="p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>Team Name</span>
              <span className="text-xs font-black">{team.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>Team Code</span>
              <span className="text-xs font-black" style={{ color: 'var(--accent)' }}>{team.teamCode || '—'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>Sport</span>
              <span className="text-xs font-black">{team.sportType}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>Your Role</span>
              <span className="text-xs font-black capitalize">{myRole}</span>
            </div>
          </div>
        </div>

        {/* Home Areas */}
        {(myRole === 'owner' || myRole === 'manager') && (
          <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <div className="flex items-center gap-2">
                <MapPin size={14} style={{ color: 'var(--accent)' }} />
                <p className="font-black text-sm">Home Areas</p>
              </div>
              <span className="text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>Max 3</span>
            </div>
            <div className="p-4 flex flex-wrap gap-2">
              {(team.homeAreas?.length || 0) === 0 ? (
                <p className="text-xs italic w-full text-center py-2" style={{ color: 'var(--text-muted)' }}>No home areas set yet.</p>
              ) : team.homeAreas?.map((area: any) => (
                <div key={area.id} className="text-[10px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1"
                  style={{ background: 'var(--bg-surface-raised)', border: '1px solid var(--border-subtle)' }}>
                  <MapPin size={9} style={{ color: 'var(--accent)' }} />
                  <span className="truncate max-w-[100px]">{area.name}</span>
                  <button onClick={() => handleUpdateAreas(team.homeAreas.filter((a: any) => a.id !== area.id).map((a: any) => a.id))}
                    className="ml-0.5 opacity-40 hover:opacity-100 hover:text-red-400 transition-opacity"><X size={9} /></button>
                </div>
              ))}
              {(team.homeAreas?.length || 0) < 3 && (
                <button onClick={() => { setAreaSearch(''); setShowAreaModal(true); }}
                  className="text-[10px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1"
                  style={{ border: '1px dashed rgba(0,255,65,0.4)', color: 'var(--accent)' }}>
                  + Add Area
                </button>
              )}
            </div>
          </div>
        )}

        {/* Home Turfs */}
        {(myRole === 'owner' || myRole === 'manager') && (
          <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <div className="flex items-center gap-2">
                <Tent size={14} style={{ color: 'var(--accent)' }} />
                <p className="font-black text-sm">Home Turfs</p>
              </div>
              <span className="text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>Max 3</span>
            </div>
            <div className="p-4 flex flex-wrap gap-2">
              {(team.homeTurfs?.length || 0) === 0 ? (
                <p className="text-xs italic w-full text-center py-2" style={{ color: 'var(--text-muted)' }}>No preferred venues set.</p>
              ) : team.homeTurfs?.map((turf: any) => (
                <div key={turf.id} className="text-[10px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1"
                  style={{ background: 'var(--bg-surface-raised)', border: '1px solid var(--border-subtle)' }}>
                  <Tent size={9} style={{ color: 'var(--accent)' }} />
                  <span className="truncate max-w-[100px]">{turf.name}</span>
                  <button onClick={() => handleUpdateTurfs(team.homeTurfs.filter((t: any) => t.id !== turf.id).map((t: any) => t.id))}
                    className="ml-0.5 opacity-40 hover:opacity-100 hover:text-red-400 transition-opacity"><X size={9} /></button>
                </div>
              ))}
              {(team.homeTurfs?.length || 0) < 3 && (
                <button onClick={() => { setTurfSearch(''); setShowTurfModal(true); }}
                  className="text-[10px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1"
                  style={{ border: '1px dashed rgba(0,255,65,0.4)', color: 'var(--accent)' }}>
                  + Connect Turf
                </button>
              )}
            </div>
          </div>
        )}

        {/* Match Bookings / Split Costs */}
        {(myRole === 'owner' || myRole === 'manager') && (
          <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
            <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <Clock size={14} style={{ color: 'var(--accent)' }} />
              <p className="font-black text-sm">Match Bookings</p>
            </div>
            <div className="p-4">
              <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>Manage turf bookings and split costs with teammates.</p>
              <button onClick={() => alert('Split costs feature coming soon!')}
                className="w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors"
                style={{ background: 'var(--bg-surface-raised)', color: 'var(--accent)', border: '1px solid rgba(0,255,65,0.2)' }}>
                <ChevronRight size={14} />
                Split Costs
              </button>
            </div>
          </div>
        )}

        {/* Danger Zone — Owner only */}
        {myRole === 'owner' && (
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: 'rgba(239,68,68,0.03)', border: '1px solid rgba(239,68,68,0.25)' }}
          >
            <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(239,68,68,0.15)' }}>
              <AlertTriangle size={14} style={{ color: 'var(--danger)' }} />
              <p className="font-black text-sm" style={{ color: 'var(--danger)' }}>Danger Zone</p>
            </div>
            <div className="p-4 flex flex-col gap-4">
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                Deleting <strong style={{ color: 'var(--text-primary)' }}>{team.name}</strong> is permanent.
                All matches, trophies, and Challenge Market progress will be lost forever.
              </p>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                  Type <strong style={{ color: 'var(--text-primary)' }}>{team.name}</strong> to confirm
                </label>
                <input
                  type="text"
                  placeholder={team.name}
                  value={deleteConfirm}
                  onChange={e => { setDeleteConfirm(e.target.value); setDeleteError(''); }}
                  className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none font-mono"
                  style={{
                    background: 'var(--bg-base)',
                    border: `1px solid ${canDelete ? 'rgba(239,68,68,0.5)' : 'var(--border-subtle)'}`,
                    color: 'var(--text-primary)',
                  }}
                />
              </div>

              {deleteError && (
                <div className="p-3 rounded-xl text-xs font-bold" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>
                  {deleteError}
                </div>
              )}

              <motion.button
                whileTap={btnTap}
                onClick={handleDeleteTeam}
                disabled={saving || !canDelete}
                className="w-full py-3 rounded-xl font-black text-xs uppercase tracking-widest flex justify-center items-center gap-2 transition-all disabled:opacity-40"
                style={{
                  background: canDelete ? 'rgba(239,68,68,0.15)' : 'transparent',
                  border: `1px solid ${canDelete ? 'rgba(239,68,68,0.5)' : 'rgba(239,68,68,0.2)'}`,
                  color: '#f87171',
                }}
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : 'Permanently Delete Team'}
              </motion.button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
