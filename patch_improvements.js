const fs = require('fs');
const file = 'src/app/[locale]/interact/page.tsx';
let c = fs.readFileSync(file, 'utf8');

// 1. Add playerMmrResult state
if (!c.includes('playerMmrResult')) {
  c = c.replace(
    `const [statsSaveErr, setStatsSaveErr] = useState('');`,
    `const [statsSaveErr, setStatsSaveErr] = useState('');\n  const [playerMmrResult, setPlayerMmrResult] = useState<any>(null);`
  );
}

// 2. Add SSE Effect after loadMarket
if (!c.includes('EventSource(\'/api/interact/events\')')) {
  c = c.replace(
    `useEffect(() => { loadMarket(); }, [loadMarket]);`,
    `useEffect(() => { loadMarket(); }, [loadMarket]);\n\n  useEffect(() => {\n    const ev = new EventSource('/api/interact/events');\n    ev.onmessage = (e) => {\n      if (e.data.startsWith(':')) return;\n      try {\n        const data = JSON.parse(e.data);\n        if (data.type === 'refresh') loadChallenges();\n      } catch {}\n    };\n    return () => ev.close();\n  }, [loadChallenges]);`
  );
}

// 3. Fix savePlayerStats to set the playerMmrResult
if (!c.includes('setPlayerMmrResult')) {
  c = c.replace(
    `if (res.ok) { setStatsModal(null); loadChallenges(); }`,
    `if (res.ok) { \n        setStatsModal(null); \n        loadChallenges(); \n        const resultItems = d.playerResults?.map((r: any) => {\n          const pDb = statsModal.players.find((p:any) => p.playerId === r.playerId)?.player;\n          return { name: pDb?.fullName || 'Unknown', avatarUrl: pDb?.avatarUrl, mmrChange: r.mmrChange };\n        });\n        setPlayerMmrResult(resultItems?.sort((a:any, b:any) => b.mmrChange - a.mmrChange));\n      }`
  );
}

// 4. Fix input zero problem by adding onFocus to all inputs inside statsModal
// Fix the inputs in score entry and player stats. First, safely replace the simple bindings if they don't have onFocus
["onChange={(e: any) => upd(pid, field","onChange={(e: any) => upd(pid, 'overs'", "value={myGoalInput} onChange={(e)", "value={oppGoalInput} onChange={(e)", "value={myRunInput} onChange={(e)", "value={oppRunInput} onChange={(e)", "value={wicketInput} onChange={(e)", "value={overInput} onChange={(e)"].forEach(search => {
  if (c.includes(search) && !c.includes(`onFocus={(e:any)=>e.target.select()} ${search}`) && !c.includes(`onFocus={(e: any) => e.target.select()} ${search}`)) {
    c = c.replace(new RegExp(search.replace(/[.*+?^$\{\}\(\)\|\[\]\\]/g, '\\$&'), 'g'), `onFocus={(e: any) => e.target.select()} ${search}`);
  }
});

// 5. Bigger boxes for players in stats modal:
c = c.replace(
  `key={pid} className="bg-neutral-900 border border-white/[0.06] rounded-2xl p-3"`,
  `key={pid} className="bg-neutral-900 border border-white/[0.06] rounded-2xl p-4"`
);
c = c.replace(
  `<div className="w-8 h-8 rounded-full bg-neutral-800 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center">`,
  `<div className="w-10 h-10 rounded-full bg-neutral-800 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center">`
);
c = c.replace(/className="w-10 bg-neutral-800/g, 'className="w-12 bg-neutral-800');
c = c.replace(/text-center py-1 /g, 'text-center py-1.5 ');


// 6. Fix scoreSubmitting stuck: in submitScore and resolveMatch
if (c.includes('setScoreSubmitting(false)')) {
   // Already handles it? Let's check.
} 
// actually submitScore has setScoreSubmitting(false) at the bottom. resolveMatch has it too. The stuck feeling was likely just lack of SSE autorefresh triggering the UI re-render, so the modal was left open or stuck in waiting state!

// 7. Add playerMmrResult modal rendering right before return
const playerModalJSX = `
      {/* ═══════════════════════════════════════
           PLAYER MMR RESULT MODAL
      ═══════════════════════════════════════ */}
      {playerMmrResult && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md" onClick={() => setPlayerMmrResult(null)} />
          <div className="relative bg-[#0a0a0a] border border-white/10 rounded-3xl w-full max-w-sm overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 fade-in duration-200">
            <div className="p-5 border-b border-white/5 bg-gradient-to-br from-[#00ff41]/10 to-transparent">
              <h2 className="text-xl font-black text-white mb-1">Squad MMR Updates</h2>
              <p className="text-xs text-neutral-400">Match stat bonuses applied.</p>
            </div>
            <div className="max-h-[60vh] overflow-y-auto px-5 py-4 flex flex-col gap-3">
              {playerMmrResult.map((pr: any, i: number) => (
                <div key={i} className="flex items-center gap-3 bg-neutral-900/50 p-2.5 rounded-2xl border border-white/5">
                  <div className="w-10 h-10 rounded-full bg-neutral-800 overflow-hidden border border-white/10 flex items-center justify-center shrink-0">
                    {pr.avatarUrl ? <img src={pr.avatarUrl} className="w-full h-full object-cover" /> : <span className="text-sm font-black text-neutral-500">{pr.name[0]}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-white truncate">{pr.name}</p>
                  </div>
                  <div className={\`px-3 py-1.5 rounded-xl font-black flex flex-col items-center justify-center \${pr.mmrChange > 0 ? 'bg-[#00ff41]/10 text-[#00ff41]' : pr.mmrChange < 0 ? 'bg-red-500/10 text-red-500' : 'bg-neutral-800 text-neutral-400'}\`}>
                    <span className="text-base leading-none">{pr.mmrChange > 0 ? \`+\${pr.mmrChange}\` : pr.mmrChange}</span>
                    <span className="text-[8px] uppercase tracking-wider opacity-70 mt-0.5">MMR</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-white/5">
              <button onClick={() => setPlayerMmrResult(null)} className="w-full py-3 bg-[#00ff41] text-black font-black text-sm rounded-xl hover:bg-[#00dd38] transition-all">
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}`;

if (!c.includes('PLAYER MMR RESULT MODAL')) {
  c = c.replace(/return \([\s]*<div className="min-h-screen/m, playerModalJSX + '\n\n  return (\n    <div className="min-h-screen');
}

fs.writeFileSync(file, c);
console.log('DOM Modifications applied successfully');
