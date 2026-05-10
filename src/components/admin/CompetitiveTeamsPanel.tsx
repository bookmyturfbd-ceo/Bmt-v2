'use client';
import { useState, useEffect } from 'react';
import { Loader2, Search, Trophy, ShieldHalf, LayoutGrid, Swords, Save } from 'lucide-react';

export default function CompetitiveTeamsPanel() {
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Config state
  const [fee, setFee] = useState<number | ''>('');
  const [savingFee, setSavingFee] = useState(false);

  useEffect(() => {
    fetch('/api/admin/teams')
      .then(res => res.json())
      .then(data => {
        setTeams(data.teams || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    fetch('/api/admin/challenge-market')
      .then(res => res.json())
      .then(data => {
        if (data.config) setFee(data.config.monthlyFee);
      });
  }, []);

  const handleSaveFee = async () => {
    if (fee === '' || isNaN(Number(fee))) return;
    setSavingFee(true);
    await fetch('/api/admin/challenge-market', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ monthlyFee: Number(fee) })
    });
    setSavingFee(false);
  };

  const filtered = teams.filter(t => t.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex flex-col gap-6 h-full overflow-y-auto pr-2 scrollbar-none">
      
      {/* ── Challenge Market Settings ── */}
      <div className="bg-gradient-to-r from-red-900/20 to-fuchsia-900/20 border border-[var(--panel-border)] rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="font-black text-lg flex items-center gap-2"><Swords size={20} className="text-fuchsia-500" /> Challenge Market Monthly Fee</h3>
          <p className="text-[10px] uppercase tracking-widest text-[var(--muted)] mt-1">This amount will be deducted directly from the team owner's wallet every month.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)] font-black text-sm">৳</span>
            <input 
              type="number"
              value={fee}
              onChange={e => setFee(e.target.value === '' ? '' : Number(e.target.value))}
              className="bg-neutral-900 border border-white/10 rounded-xl pl-8 pr-4 py-2 w-32 outline-none focus:border-fuchsia-500 font-bold"
            />
          </div>
          <button 
            onClick={handleSaveFee}
            disabled={savingFee || fee === ''}
            className="flex items-center gap-1.5 px-4 py-2 bg-accent text-black font-black uppercase text-[11px] tracking-wider rounded-xl hover:bg-accent/80 disabled:opacity-50"
          >
            {savingFee ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save
          </button>
        </div>
      </div>

      {/* ── Teams Table ── */}
      <div className="flex flex-col bg-[var(--panel-bg)] rounded-3xl border border-[var(--panel-border)] overflow-hidden">
        <div className="p-4 md:p-6 border-b border-[var(--panel-border)] glass-header shrink-0 flex flex-col md:flex-row md:items-center gap-4 justify-between">
          <h3 className="font-black text-lg md:text-xl flex items-center gap-2"><Trophy className="text-accent" size={20} /> All Platform Teams</h3>
          <div className="relative w-full md:w-64 shrink-0">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
            <input 
              type="text"
              placeholder="Search teams..."
              className="w-full bg-neutral-900 border border-[var(--panel-border)] rounded-full pl-9 pr-4 py-2.5 text-sm outline-none focus:border-accent transition-colors"
              value={search} onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto p-4 md:p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-20 opacity-50"><Loader2 size={32} className="animate-spin text-accent mb-4" /> Fetching Teams Database...</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-20 opacity-50"><ShieldHalf size={48} className="mb-4 text-[var(--muted)]" /> No teams found.</div>
          ) : (
            <table className="w-full text-left min-w-[800px] border-collapse">
              <thead>
                <tr className="border-b border-[var(--panel-border)] text-xs text-[var(--muted)] uppercase tracking-wider">
                  <th className="pb-3 px-4 font-black">Team</th>
                  <th className="pb-3 px-4 font-black">Sport</th>
                  <th className="pb-3 px-4 font-black text-center">Tinkering</th>
                  <th className="pb-3 px-4 font-black">Progression</th>
                  <th className="pb-3 px-4 font-black">Owner</th>
                  <th className="pb-3 px-4 font-black">Matches</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(team => (
                  <tr key={team.id} className="border-b border-[var(--panel-border)] hover:bg-white/5 transition-colors group">
                    <td className="py-4 px-4 flex items-center gap-3 w-56">
                      <div className="w-10 h-10 rounded-lg bg-neutral-900 border border-white/5 overflow-hidden flex items-center justify-center shrink-0">
                        {team.logoUrl ? <img src={team.logoUrl} className="w-full h-full object-cover" /> : <ShieldHalf size={16} />}
                      </div>
                      <span className="font-bold text-sm tracking-tight truncate">{team.name}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-1 rounded bg-[var(--panel-bg)] border border-[var(--panel-border)]">{team.sportType.replace('_', ' ')}</span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="text-xs font-black">{team._count?.members || 0}</span> <span className="text-[10px] text-[var(--muted)] uppercase">Roster</span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5"><Trophy size={10} className="text-amber-500" /><span className="text-xs font-black text-amber-500">{team.teamMmr} MMR</span></div>
                        <div className="flex items-center gap-1.5"><LayoutGrid size={10} className="text-[#00ff41]" /><span className="text-xs font-black text-[#00ff41]">LVL {team.level}</span></div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold truncate">{team.owner?.fullName || 'Unknown'}</span>
                        <span className="text-[10px] text-[var(--muted)]">{team.owner?.phone || 'No phone'}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-xs font-bold">{(team._count?.matchesAsTeamA || 0) + (team._count?.matchesAsTeamB || 0)}</span> <span className="text-[10px] text-[var(--muted)]">Total</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
