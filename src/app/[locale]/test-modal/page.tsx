'use client';
import { useMatchResult } from '@/context/MatchResultContext';

export default function TestModalPage() {
  const { showMatchResult } = useMatchResult();

  const fire = (outcome: 'win' | 'loss' | 'draw', sportType: string) => {
    const isCricket = sportType.includes('CRICKET');
    const mmrDelta  = outcome === 'win' ? 80 : outcome === 'loss' ? -40 : 40;
    const currentMmr = 1000 + mmrDelta;

    showMatchResult({
      outcome,
      sportType,
      victoryString: outcome === 'draw'
        ? 'Match Tied — MMR Split Equally'
        : outcome === 'win'
          ? isCricket ? 'Ura Dhura won by 3 Wickets' : 'Ura Dhura won 3–1'
          : isCricket ? 'Danger Cricket won by 12 Runs' : 'Danger FC won 2–0',
      myTeamName  : 'Ura Dhura',
      oppTeamName : 'Danger Cricket',
      myScore     : isCricket ? 45 : 3,
      oppScore    : isCricket ? (outcome === 'win' ? 33 : outcome === 'draw' ? 45 : 52) : (outcome === 'win' ? 1 : 2),
      myWickets   : isCricket ? 3 : null,
      oppWickets  : isCricket ? 10 : null,
      myOvers     : isCricket ? 6.0 : null,
      oppOvers    : isCricket ? 5.2 : null,
      mmrDelta,
      currentMmr,
      matchId     : 'test-match',
    });
  };

  const sports = [
    { label: '🏏 Cricket 7s', value: 'CRICKET_7' },
    { label: '⚽ Futsal 5s', value: 'FUTSAL_5' },
    { label: '⚽ Football 11v11', value: 'FOOTBALL_FULL' },
  ];

  return (
    <div className="min-h-screen bg-[#080808] p-8 text-white flex flex-col items-center justify-center gap-6">
      <div className="text-center mb-4">
        <h1 className="text-2xl font-black mb-1">Modal Testing Grounds</h1>
        <p className="text-neutral-500 text-sm">Tap any button to preview the unified Match Result Modal</p>
      </div>

      {sports.map(sport => (
        <div key={sport.value} className="w-full max-w-sm">
          <p className="text-xs font-black uppercase tracking-widest text-neutral-500 mb-3 text-center">{sport.label}</p>
          <div className="flex gap-2">
            <button onClick={() => fire('win', sport.value)}
              className="flex-1 py-3 bg-[#00ff41]/15 border border-[#00ff41]/30 text-[#00ff41] font-black rounded-xl text-sm hover:bg-[#00ff41]/25 transition-all active:scale-95">
              Victory
            </button>
            <button onClick={() => fire('loss', sport.value)}
              className="flex-1 py-3 bg-red-500/15 border border-red-500/30 text-red-400 font-black rounded-xl text-sm hover:bg-red-500/25 transition-all active:scale-95">
              Defeat
            </button>
            <button onClick={() => fire('draw', sport.value)}
              className="flex-1 py-3 bg-[#3b82f6]/15 border border-[#3b82f6]/30 text-[#3b82f6] font-black rounded-xl text-sm hover:bg-[#3b82f6]/25 transition-all active:scale-95">
              Draw
            </button>
          </div>
        </div>
      ))}

      <a href="/en/interact" className="mt-6 text-neutral-600 text-xs underline font-bold">← Back to Arena</a>
    </div>
  );
}
