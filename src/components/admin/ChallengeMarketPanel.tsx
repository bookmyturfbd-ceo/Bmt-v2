'use client';
import { useState, useEffect } from 'react';
import { Loader2, Swords, ShieldAlert, FileText, Download, TrendingUp, Calendar, Hash, Plus, Flame, Clock } from 'lucide-react';

// Live season countdown
function useCountdown(endDate: string | null) {
  const [remaining, setRemaining] = useState('');
  useEffect(() => {
    if (!endDate) { setRemaining(''); return; }
    const tick = () => {
      const diff = new Date(endDate).getTime() - Date.now();
      if (diff <= 0) { setRemaining('Season Ended'); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemaining(d > 0 ? `${d}d ${h}h ${m}m ${s}s` : `${h}h ${m}m ${s}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endDate]);
  return remaining;
}

export default function ChallengeMarketPanel() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [fee, setFee] = useState<number | ''>('');
  const [savingFee, setSavingFee] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'subscriptions' | 'disputes' | 'seasons'>('overview');

  // Season form state
  const [seasonName, setSeasonName] = useState('');
  const [seasonStart, setSeasonStart] = useState('');
  const [seasonEnd, setSeasonEnd] = useState('');
  const [savingSeason, setSavingSeason] = useState(false);
  const [seasonError, setSeasonError] = useState('');

  const activeSeason = data?.seasons?.find((s: any) => s.isActive);
  const countdown = useCountdown(activeSeason?.endDate ?? null);

  const reload = () => {
    setLoading(true);
    fetch('/api/admin/challenge-market')
      .then(res => res.json())
      .then(d => {
        setData(d);
        if (d.config) setFee(d.config.monthlyFee);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => { reload(); }, []);

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

  const handleCreateSeason = async () => {
    setSeasonError('');
    if (!seasonName.trim()) return setSeasonError('Season name is required.');
    if (!seasonStart || !seasonEnd) return setSeasonError('Start and end dates are required.');
    if (new Date(seasonEnd) <= new Date(seasonStart)) return setSeasonError('End date must be after start date.');
    setSavingSeason(true);
    const res = await fetch('/api/admin/challenge-market', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: seasonName.trim(), startDate: seasonStart, endDate: seasonEnd })
    });
    setSavingSeason(false);
    if (res.ok) {
      setSeasonName(''); setSeasonStart(''); setSeasonEnd('');
      reload();
    } else {
      const err = await res.json().catch(() => ({}));
      setSeasonError(err.error || 'Failed to create season.');
    }
  };

  const handleDownloadPDF = () => window.print();

  if (loading || !data) {
    return (
      <div className="flex flex-col items-center justify-center p-20 opacity-50">
        <Loader2 size={32} className="animate-spin text-accent mb-4" />
        Loading Challenge Market Analytics...
      </div>
    );
  }

  const TABS = [
    { id: 'overview',      label: 'Dashboard',        icon: TrendingUp },
    { id: 'seasons',       label: 'Seasons',          icon: Flame },
    { id: 'subscriptions', label: 'Subscribed Teams', icon: Swords },
    { id: 'disputes',      label: `Disputes (${data.disputes?.length || 0})`, icon: ShieldAlert },
  ];

  return (
    <div className="flex flex-col h-full overflow-y-auto pr-2 scrollbar-none gap-6 print:bg-white print:text-black">
      
      {/* HEADER & FEE SETTINGS */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between print:hidden">
        <div>
          <h2 className="text-xl md:text-3xl font-black flex items-center gap-2">
            <Swords className="text-fuchsia-500" /> Challenge Market Central
          </h2>
          <p className="text-sm text-[var(--muted)]">Manage subscriptions, seasons, disputes, and billing.</p>
        </div>
        
        <div className="flex items-center gap-2 bg-neutral-900 border border-white/10 p-2 rounded-2xl">
          <span className="text-[10px] font-black uppercase text-[var(--muted)] px-2">Monthly Fee:</span>
          <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--muted)] font-black text-xs">৳</span>
            <input 
              type="number" value={fee}
              onChange={e => setFee(e.target.value === '' ? '' : Number(e.target.value))}
              className="bg-black border border-white/5 rounded-xl pl-6 pr-3 py-1.5 w-24 outline-none focus:border-fuchsia-500 font-bold text-sm"
            />
          </div>
          <button 
            onClick={handleSaveFee} disabled={savingFee || fee === ''}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-fuchsia-600 text-white font-black uppercase text-[10px] rounded-xl hover:bg-fuchsia-500 disabled:opacity-50"
          >
            {savingFee ? <Loader2 size={12} className="animate-spin" /> : 'Save'}
          </button>
        </div>
      </div>

      {/* ACTIVE SEASON BANNER */}
      {activeSeason && (
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-fuchsia-900/40 to-purple-900/40 border border-fuchsia-500/30">
          <div className="w-10 h-10 rounded-full bg-fuchsia-500/20 flex items-center justify-center shrink-0">
            <Flame size={20} className="text-fuchsia-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-fuchsia-300">
              {activeSeason.name}
              <span className="text-[10px] font-bold bg-fuchsia-500/20 text-fuchsia-400 px-2 py-0.5 rounded-full uppercase ml-2">Active</span>
            </p>
            <p className="text-[11px] text-[var(--muted)] mt-0.5">
              {new Date(activeSeason.startDate).toLocaleDateString()} → {new Date(activeSeason.endDate).toLocaleDateString()}
            </p>
          </div>
          <div className="text-right shrink-0">
            <div className="flex items-center gap-1 text-fuchsia-400 justify-end">
              <Clock size={12} />
              <span className="text-[10px] font-black uppercase tracking-wider">Ends In</span>
            </div>
            <p className="font-black text-sm font-mono text-white">{countdown}</p>
          </div>
        </div>
      )}

      {/* METRICS STRIP */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-neutral-900 border border-[var(--panel-border)] p-4 rounded-2xl flex flex-col justify-center">
          <span className="text-[10px] uppercase font-black tracking-widest text-[#00ff41] flex items-center gap-1 mb-1">
            <TrendingUp size={12}/> Daily Earnings
          </span>
          <span className="text-2xl font-black">৳ {data.stats?.daily || 0}</span>
        </div>
        <div className="bg-neutral-900 border border-[var(--panel-border)] p-4 rounded-2xl flex flex-col justify-center">
          <span className="text-[10px] uppercase font-black tracking-widest text-fuchsia-400 flex items-center gap-1 mb-1">
            <Calendar size={12}/> Monthly Earnings
          </span>
          <span className="text-2xl font-black">৳ {data.stats?.monthly || 0}</span>
        </div>
        <div className="bg-neutral-900 border border-[var(--panel-border)] p-4 rounded-2xl flex flex-col justify-center">
          <span className="text-[10px] uppercase font-black tracking-widest text-amber-500 flex items-center gap-1 mb-1">
            <Swords size={12}/> Lifetime Earnings
          </span>
          <span className="text-2xl font-black">৳ {data.stats?.lifetime || 0}</span>
        </div>
        <div className="bg-neutral-900 border border-[var(--panel-border)] p-4 rounded-2xl flex flex-col justify-center">
          <span className="text-[10px] uppercase font-black tracking-widest text-blue-400 flex items-center gap-1 mb-1">
            <Hash size={12}/> Active Subscriptions
          </span>
          <span className="text-2xl font-black">{data.stats?.activeSubs || 0} Teams</span>
        </div>
      </div>

      {/* TABS */}
      <div className="flex items-center gap-2 border-b border-[var(--panel-border)] pb-2 print:hidden flex-wrap">
        {TABS.map(t => (
          <div 
            key={t.id} onClick={() => setActiveTab(t.id as any)}
            className={`px-4 py-2 flex items-center gap-2 rounded-xl text-sm font-bold transition-all cursor-pointer select-none ${
              activeTab === t.id ? 'bg-fuchsia-600 text-white' : 'hover:bg-white/5 text-[var(--muted)]'
            }`}
          >
            <t.icon size={16} /> {t.label}
          </div>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="flex flex-col md:flex-row gap-4">
          <div className="bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-3xl p-6 flex-1">
            <h3 className="font-black text-lg mb-6">Financial Statements</h3>
            <div className="flex flex-col gap-3">
              <button onClick={handleDownloadPDF} className="flex items-center justify-between p-4 bg-neutral-900 rounded-2xl border border-white/5 hover:border-fuchsia-500 hover:bg-neutral-800 transition-all group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-fuchsia-500/10 text-fuchsia-500 flex items-center justify-center">
                    <FileText size={20} />
                  </div>
                  <div className="text-left">
                    <span className="block font-bold">Monthly Statement</span>
                    <span className="text-xs text-[var(--muted)]">PDF ledger of all subscriptions this month</span>
                  </div>
                </div>
                <Download size={18} className="text-[var(--muted)] group-hover:text-white" />
              </button>
              <button onClick={handleDownloadPDF} className="flex items-center justify-between p-4 bg-neutral-900 rounded-2xl border border-white/5 hover:border-accent hover:bg-neutral-800 transition-all group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-accent/10 text-accent flex items-center justify-center">
                    <FileText size={20} />
                  </div>
                  <div className="text-left">
                    <span className="block font-bold">Daily Breakdown</span>
                    <span className="text-xs text-[var(--muted)]">PDF ledger of today&apos;s subscription revenue</span>
                  </div>
                </div>
                <Download size={18} className="text-[var(--muted)] group-hover:text-white" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SEASONS TAB */}
      {activeTab === 'seasons' && (
        <div className="flex flex-col lg:flex-row gap-6">

          {/* Create Season Form */}
          <div className="bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-3xl p-6 lg:w-80 shrink-0">
            <h3 className="font-black text-lg mb-1 flex items-center gap-2">
              <Plus size={18} className="text-fuchsia-400" /> New Season
            </h3>
            <p className="text-xs text-[var(--muted)] mb-5">
              Starting a new season instantly activates it. Any previous active season will end automatically.
            </p>

            <div className="flex flex-col gap-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)] block mb-1.5">Season Name</label>
                <input
                  type="text"
                  placeholder="e.g. Season 1 — Spring 2026"
                  value={seasonName}
                  onChange={e => setSeasonName(e.target.value)}
                  className="w-full bg-neutral-900 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-fuchsia-500 font-bold placeholder:text-white/20"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)] block mb-1.5">Start Date</label>
                <input
                  type="date"
                  value={seasonStart}
                  onChange={e => setSeasonStart(e.target.value)}
                  className="w-full bg-neutral-900 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-fuchsia-500 font-bold [color-scheme:dark]"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)] block mb-1.5">End Date</label>
                <input
                  type="date"
                  value={seasonEnd}
                  onChange={e => setSeasonEnd(e.target.value)}
                  className="w-full bg-neutral-900 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-fuchsia-500 font-bold [color-scheme:dark]"
                />
              </div>

              {seasonError && (
                <p className="text-xs text-red-400 font-bold bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-xl">
                  {seasonError}
                </p>
              )}

              <button
                onClick={handleCreateSeason}
                disabled={savingSeason}
                className="w-full py-3 bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white font-black rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-fuchsia-900/30"
              >
                {savingSeason ? <Loader2 size={16} className="animate-spin" /> : <><Flame size={16} /> Start Season</>}
              </button>
            </div>
          </div>

          {/* Season History */}
          <div className="flex-1 bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-3xl p-6">
            <h3 className="font-black text-lg mb-5">Season History</h3>
            {!data.seasons?.length ? (
              <p className="text-center text-white/30 py-10 italic">No seasons created yet. Start your first season!</p>
            ) : (
              <div className="flex flex-col gap-3">
                {data.seasons.map((s: any) => (
                  <div
                    key={s.id}
                    className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                      s.isActive ? 'bg-fuchsia-900/20 border-fuchsia-500/30' : 'bg-neutral-900 border-white/5'
                    }`}
                  >
                    <div className={`w-3 h-3 rounded-full shrink-0 ${
                      s.isActive ? 'bg-fuchsia-400 shadow-[0_0_8px_rgba(232,121,249,0.8)] animate-pulse' : 'bg-neutral-600'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-black text-sm">{s.name}</p>
                        {s.isActive && (
                          <span className="text-[8px] font-black uppercase bg-fuchsia-500/20 text-fuchsia-400 px-2 py-0.5 rounded-full border border-fuchsia-500/30">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-[var(--muted)] mt-0.5">
                        {new Date(s.startDate).toLocaleDateString()} → {new Date(s.endDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      {s.isActive ? (
                        <p className="text-xs font-black font-mono text-fuchsia-300">{countdown}</p>
                      ) : (
                        <p className="text-[10px] text-white/30 font-bold">Ended</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* SUBSCRIPTIONS TAB */}
      {activeTab === 'subscriptions' && (
        <div className="bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-3xl p-6 overflow-x-auto">
          <table className="w-full text-left min-w-[600px] border-collapse">
            <thead>
              <tr className="border-b border-[var(--panel-border)] text-[10px] text-[var(--muted)] uppercase tracking-wider">
                <th className="pb-3 px-2 font-black">Team Name</th>
                <th className="pb-3 px-2 font-black">Owner</th>
                <th className="pb-3 px-2 font-black">Status</th>
                <th className="pb-3 px-2 font-black text-right">Subscribed At</th>
              </tr>
            </thead>
            <tbody>
              {!data.subscriptions?.length && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-white/30 italic">No subscriptions found</td>
                </tr>
              )}
              {data.subscriptions?.map((sub: any) => (
                <tr key={sub.id} className="border-b border-white/5">
                  <td className="py-4 px-2 font-bold">{sub.team.name}</td>
                  <td className="py-4 px-2 text-sm text-[var(--muted)]">{sub.team.owner.fullName}</td>
                  <td className="py-4 px-2">
                    {sub.active
                      ? <span className="bg-[#00ff41]/20 text-[#00ff41] px-2 py-0.5 rounded text-xs font-bold">Active</span>
                      : <span className="bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded text-xs font-bold">Grace Period</span>}
                  </td>
                  <td className="py-4 px-2 text-right text-xs text-[var(--muted)]">
                    {new Date(sub.subscribedAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* DISPUTES TAB */}
      {activeTab === 'disputes' && (
        <div className="bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-3xl p-6">
          {!data.disputes?.length ? (
            <p className="text-center text-white/30 py-10 italic">No open match disputes!</p>
          ) : (
            <div className="flex flex-col gap-3">
              {data.disputes?.map((d: any) => (
                <div key={d.id} className="bg-neutral-900 border border-white/5 rounded-2xl p-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <span className="text-[10px] bg-red-500/20 text-red-500 px-2 py-0.5 rounded uppercase font-black">{d.status}</span>
                    <p className="mt-2 font-bold text-sm truncate">{d.reason}</p>
                    <p className="text-[10px] text-[var(--muted)] mt-1">
                      Raised by <span className="text-white">{d.team.name}</span> · Match #{d.matchId.substring(0, 8)}
                    </p>
                  </div>
                  <button className="shrink-0 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold transition-all">
                    Review
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
