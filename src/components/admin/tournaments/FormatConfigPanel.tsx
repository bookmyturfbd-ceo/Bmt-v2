'use client';
import { useEffect } from 'react';

// ── helpers ──────────────────────────────────────────────────────────────────
const nextPow2 = (n: number) => Math.pow(2, Math.ceil(Math.log2(Math.max(n, 2))));

const sel = 'w-full bg-neutral-900 border border-white/10 rounded-xl p-3 font-bold text-white focus:border-accent focus:outline-none transition-colors text-sm';
const lbl = 'block text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1.5';
const num = 'w-full bg-neutral-900 border border-white/10 rounded-xl p-3 font-bold text-white focus:border-accent focus:outline-none transition-colors text-sm';

const TIEBREAK_OPTIONS = [
  { key: 'points',          label: 'Points' },
  { key: 'head_to_head',    label: 'Head-to-Head' },
  { key: 'goal_difference', label: 'Goal Difference' },
  { key: 'goals_scored',    label: 'Goals Scored' },
  { key: 'coin_flip',       label: 'Coin Flip' },
];

function Toggle({ checked, onChange, label, sub }: { checked: boolean; onChange: (v: boolean) => void; label: string; sub?: string }) {
  return (
    <label className="flex items-center justify-between p-3 bg-neutral-900 border border-white/10 rounded-xl cursor-pointer hover:border-white/20 transition-colors">
      <div>
        <p className="text-sm font-black text-white">{label}</p>
        {sub && <p className="text-xs text-neutral-500 mt-0.5">{sub}</p>}
      </div>
      <div
        onClick={() => onChange(!checked)}
        className={`w-10 h-6 rounded-full transition-colors relative shrink-0 ml-4 ${checked ? 'bg-accent' : 'bg-neutral-700'}`}
      >
        <div className={`absolute top-1 w-4 h-4 rounded-full bg-black transition-all ${checked ? 'left-5' : 'left-1'}`} />
      </div>
    </label>
  );
}

function TiebreakSorter({ order, onChange }: { order: string[]; onChange: (o: string[]) => void }) {
  const move = (i: number, dir: -1 | 1) => {
    const next = [...order];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <div className="space-y-1.5">
      {order.map((key, i) => {
        const opt = TIEBREAK_OPTIONS.find(o => o.key === key);
        return (
          <div key={key} className="flex items-center gap-2 bg-neutral-900 border border-white/10 rounded-xl px-3 py-2">
            <span className="text-[10px] font-black text-neutral-500 w-4 shrink-0">{i + 1}</span>
            <span className="flex-1 text-sm font-bold text-white">{opt?.label ?? key}</span>
            <div className="flex flex-col gap-0.5">
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="text-neutral-500 hover:text-white disabled:opacity-20 transition-colors text-xs leading-none">▲</button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === order.length - 1} className="text-neutral-500 hover:text-white disabled:opacity-20 transition-colors text-xs leading-none">▼</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── default configs ───────────────────────────────────────────────────────────
export function defaultConfig(formatType: string, teams: number): Record<string, any> {
  const bracket = nextPow2(teams);
  const rounds  = Math.ceil(Math.log2(Math.max(teams, 2)));
  const tiebreak = ['points', 'head_to_head', 'goal_difference', 'goals_scored', 'coin_flip'];

  switch (formatType) {
    case 'KNOCKOUT': return {
      bracketSize: bracket, byes: bracket - teams,
      seedingMethod: 'random', thirdPlacePlayoff: false,
      extraTimeRule: 'none', penaltyShootout: true,
    };
    case 'DOUBLE_ELIMINATION': return {
      bracketSize: bracket, byes: bracket - teams,
      seedingMethod: 'random', grandFinalFormat: 'bracket_advantage',
    };
    case 'LEAGUE': return {
      legs: 'single', pointsWin: 3, pointsDraw: 1, pointsLoss: 0,
      drawsAllowed: true, tiebreakOrder: tiebreak,
    };
    case 'GROUP_KNOCKOUT': return {
      numberOfGroups: Math.max(2, Math.floor(teams / 4)),
      teamsPerGroup: 4, teamsAdvancePerGroup: 2,
      tiebreakOrder: tiebreak, thirdPlacePlayoff: false,
      extraTimeRule: 'none', penaltyShootout: true,
    };
    case 'SWISS': return {
      numberOfRounds: rounds, pairingSystem: 'buchholz',
      rematches: false, teamsAdvanceToPlayoff: Math.floor(teams / 4),
    };
    default: return {};
  }
}

// ── main panel ────────────────────────────────────────────────────────────────
interface Props {
  formatType: string;
  teams: number;
  config: Record<string, any>;
  onChange: (c: Record<string, any>) => void;
}

export default function FormatConfigPanel({ formatType, teams, config, onChange }: Props) {
  const set = (k: string, v: any) => onChange({ ...config, [k]: v });

  // Auto-update bracketSize when teams changes
  useEffect(() => {
    if (['KNOCKOUT', 'DOUBLE_ELIMINATION'].includes(formatType)) {
      const bracket = nextPow2(teams);
      if (config.bracketSize !== bracket) onChange({ ...config, bracketSize: bracket, byes: bracket - teams });
    }
    if (formatType === 'SWISS') {
      const rounds = Math.ceil(Math.log2(Math.max(teams, 2)));
      if (config.numberOfRounds !== rounds) onChange({ ...config, numberOfRounds: rounds });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teams, formatType]);

  if (!formatType || formatType === 'SWISS_DISABLED') return null;

  return (
    <div className="mt-5 p-5 bg-black/30 border border-accent/20 rounded-2xl space-y-4">
      <p className="text-[10px] font-black uppercase tracking-widest text-accent mb-3">Format Configuration</p>

      {/* ── KNOCKOUT ─────────────────────────────────────────────────────── */}
      {formatType === 'KNOCKOUT' && <>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Bracket Size <span className="normal-case text-neutral-600">(auto)</span></label>
            <div className="p-3 bg-neutral-950 border border-white/5 rounded-xl text-sm font-black text-accent">
              {config.bracketSize ?? nextPow2(teams)} teams &nbsp;·&nbsp; {config.byes ?? (nextPow2(teams) - teams)} byes
            </div>
          </div>
          <div>
            <label className={lbl}>Seeding Method</label>
            <select value={config.seedingMethod ?? 'random'} onChange={e => set('seedingMethod', e.target.value)} className={sel}>
              <option value="random">Random</option>
              <option value="ranking">By MMR Ranking</option>
              <option value="manual">Manual</option>
            </select>
          </div>
        </div>
        <div>
          <label className={lbl}>Extra Time Rule</label>
          <select value={config.extraTimeRule ?? 'none'} onChange={e => set('extraTimeRule', e.target.value)} className={sel}>
            <option value="none">None</option>
            <option value="full_extra_time">Full Extra Time (2×15 min)</option>
            <option value="golden_goal">Golden Goal</option>
          </select>
        </div>
        <Toggle checked={config.penaltyShootout ?? true} onChange={v => set('penaltyShootout', v)} label="Penalty Shootout" sub="After draw / extra time" />
        <Toggle checked={config.thirdPlacePlayoff ?? false} onChange={v => set('thirdPlacePlayoff', v)} label="3rd Place Playoff" sub="Semi-final losers play for bronze" />
      </>}

      {/* ── DOUBLE_ELIMINATION ───────────────────────────────────────────── */}
      {formatType === 'DOUBLE_ELIMINATION' && <>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Bracket Size <span className="normal-case text-neutral-600">(auto)</span></label>
            <div className="p-3 bg-neutral-950 border border-white/5 rounded-xl text-sm font-black text-accent">
              {config.bracketSize ?? nextPow2(teams)} teams &nbsp;·&nbsp; {config.byes ?? (nextPow2(teams) - teams)} byes
            </div>
          </div>
          <div>
            <label className={lbl}>Seeding Method</label>
            <select value={config.seedingMethod ?? 'random'} onChange={e => set('seedingMethod', e.target.value)} className={sel}>
              <option value="random">Random</option>
              <option value="ranking">By MMR Ranking</option>
              <option value="manual">Manual</option>
            </select>
          </div>
        </div>
        <div>
          <label className={lbl}>Grand Final Format</label>
          <select value={config.grandFinalFormat ?? 'bracket_advantage'} onChange={e => set('grandFinalFormat', e.target.value)} className={sel}>
            <option value="bracket_advantage">Bracket Advantage (winner's bracket team needs 1 win; loser's needs 2)</option>
            <option value="single_match">Single Match</option>
          </select>
        </div>
      </>}

      {/* ── LEAGUE (Round Robin) ─────────────────────────────────────────── */}
      {formatType === 'LEAGUE' && <>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Legs</label>
            <select value={config.legs ?? 'single'} onChange={e => set('legs', e.target.value)} className={sel}>
              <option value="single">Single (home only)</option>
              <option value="double">Double (home + away)</option>
            </select>
          </div>
          <div>
            <label className={lbl}>Draws Allowed</label>
            <select value={config.drawsAllowed ? 'yes' : 'no'} onChange={e => set('drawsAllowed', e.target.value === 'yes')} className={sel}>
              <option value="yes">Yes</option>
              <option value="no">No (extra time / shootout)</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[['pointsWin', 'Win'], ['pointsDraw', 'Draw'], ['pointsLoss', 'Loss']].map(([k, l]) => (
            <div key={k}>
              <label className={lbl}>Pts — {l}</label>
              <input type="number" min={0} max={99} value={config[k] ?? (k === 'pointsWin' ? 3 : k === 'pointsDraw' ? 1 : 0)}
                onChange={e => set(k, parseInt(e.target.value) || 0)} className={num} />
            </div>
          ))}
        </div>
        <div>
          <label className={lbl}>Tiebreak Priority Order <span className="normal-case text-neutral-600">(drag ▲▼ to reorder)</span></label>
          <TiebreakSorter
            order={config.tiebreakOrder ?? ['points', 'head_to_head', 'goal_difference', 'goals_scored', 'coin_flip']}
            onChange={o => set('tiebreakOrder', o)}
          />
        </div>
      </>}

      {/* ── GROUP_KNOCKOUT ───────────────────────────────────────────────── */}
      {formatType === 'GROUP_KNOCKOUT' && <>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={lbl}>Number of Groups</label>
            <input type="number" min={2} max={32} value={config.numberOfGroups ?? Math.max(2, Math.floor(teams / 4))}
              onChange={e => set('numberOfGroups', parseInt(e.target.value) || 2)} className={num} />
          </div>
          <div>
            <label className={lbl}>Teams/Group <span className="normal-case text-neutral-600">(auto)</span></label>
            <div className="p-3 bg-neutral-950 border border-white/5 rounded-xl text-sm font-black text-accent">
              ~{Math.ceil(teams / Math.max(config.numberOfGroups ?? 2, 1))}
            </div>
          </div>
          <div>
            <label className={lbl}>Advance/Group</label>
            <input type="number" min={1} value={config.teamsAdvancePerGroup ?? 2}
              onChange={e => set('teamsAdvancePerGroup', parseInt(e.target.value) || 1)} className={num} />
          </div>
        </div>
        <div>
          <label className={lbl}>Group Tiebreak Priority Order</label>
          <TiebreakSorter
            order={config.tiebreakOrder ?? ['points', 'head_to_head', 'goal_difference', 'goals_scored', 'coin_flip']}
            onChange={o => set('tiebreakOrder', o)}
          />
        </div>
        <div>
          <label className={lbl}>Knockout Extra Time Rule</label>
          <select value={config.extraTimeRule ?? 'none'} onChange={e => set('extraTimeRule', e.target.value)} className={sel}>
            <option value="none">None</option>
            <option value="full_extra_time">Full Extra Time (2×15 min)</option>
            <option value="golden_goal">Golden Goal</option>
          </select>
        </div>
        <Toggle checked={config.penaltyShootout ?? true} onChange={v => set('penaltyShootout', v)} label="Penalty Shootout" sub="For knockout stage draws" />
        <Toggle checked={config.thirdPlacePlayoff ?? false} onChange={v => set('thirdPlacePlayoff', v)} label="3rd Place Playoff" />
      </>}

      {/* ── SWISS ────────────────────────────────────────────────────────── */}
      {formatType === 'SWISS' && <>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Number of Rounds</label>
            <input type="number" min={1} value={config.numberOfRounds ?? Math.ceil(Math.log2(Math.max(teams, 2)))}
              onChange={e => set('numberOfRounds', parseInt(e.target.value) || 1)} className={num} />
            <p className="text-[10px] text-neutral-500 mt-1">Recommended: {Math.ceil(Math.log2(Math.max(teams, 2)))} (⌈log₂ {teams}⌉)</p>
          </div>
          <div>
            <label className={lbl}>Pairing System</label>
            <select value={config.pairingSystem ?? 'buchholz'} onChange={e => set('pairingSystem', e.target.value)} className={sel}>
              <option value="buchholz">Buchholz (strength of schedule)</option>
              <option value="monrad">Monrad (score-based adjacency)</option>
            </select>
          </div>
        </div>
        <div>
          <label className={lbl}>Teams Advancing to Playoff</label>
          <input type="number" min={0} value={config.teamsAdvanceToPlayoff ?? Math.floor(teams / 4)}
            onChange={e => set('teamsAdvanceToPlayoff', parseInt(e.target.value) || 0)} className={num} />
          <p className="text-[10px] text-neutral-500 mt-1">Set 0 to use Swiss standings as final result (no playoff)</p>
        </div>
        <Toggle checked={config.rematches ?? false} onChange={v => set('rematches', v)} label="Allow Rematches" sub="Allow same pair to play again if necessary" />
      </>}
    </div>
  );
}
