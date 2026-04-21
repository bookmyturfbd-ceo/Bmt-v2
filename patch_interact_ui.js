const fs = require('fs');

try {
  let c = fs.readFileSync('src/app/[locale]/interact/page.tsx', 'utf8');

  // 1. Fix the opponent card rank badge
  c = c.replace(
    '<div className="flex items-center gap-1 font-bold text-xs" style={{ color: rank.color }}>\n                              <Trophy size={12} /> {rank.label}\n                            </div>',
    `<div className={\`flex items-center gap-1 font-bold text-xs \${rank.text}\`}>\n                              <img src={rank.icon} className="w-3.5 h-3.5 object-contain" alt="Rank" /> {rank.label}\n                            </div>`
  );

  // 2. Remove Challenged pill and modify the CTA button
  // Remove the pill:
  c = c.replace(
    `                                {challengedTeamIds.has(t.id) && (
                                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-fuchsia-500/15 border border-fuchsia-500/30 text-fuchsia-400 text-[9px] font-black uppercase">
                                    <Swords size={9} /> Challenged
                                  </span>
                                )}`,
    ''
  );

  // Modify the CTA button:
  c = c.replace(
    `                            <button
                              onClick={(e) => handleChallengeAttempt(e, t)}
                              className="px-6 py-2 bg-[#00ff41] hover:bg-[#00dd38] text-black font-black uppercase text-xs rounded-xl flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(0,255,65,0.2)]"
                            >
                              <Swords size={14} /> Challenge
                            </button>`,
    `                            <button
                              onClick={(e) => !challengedTeamIds.has(t.id) && handleChallengeAttempt(e, t)}
                              disabled={challengedTeamIds.has(t.id)}
                              className={\`px-6 py-2 font-black uppercase text-xs rounded-xl flex items-center gap-2 transition-all \${challengedTeamIds.has(t.id) ? 'bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/40 opacity-70 cursor-not-allowed' : 'bg-[#00ff41] hover:bg-[#00dd38] text-black shadow-[0_0_15px_rgba(0,255,65,0.2)]'}\`}
                            >
                              <Swords size={14} /> {challengedTeamIds.has(t.id) ? 'Challenged' : 'Challenge'}
                            </button>`
  );

  // 3. Add home areas and turfs after sportName(t.sportType)
  c = c.replace(
    `                              <span className="text-xs text-[var(--muted)] font-medium flex items-center gap-1">
                                {sportEmoji(t.sportType)} {sportName(t.sportType)}
                              </span>`,
    `                              <span className="text-xs text-[var(--muted)] font-medium flex items-center gap-1">
                                {sportEmoji(t.sportType)} {sportName(t.sportType)}
                              </span>
                              {(t.homeAreas?.length > 0 || t.homeTurfs?.length > 0) && (
                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                  {t.homeAreas?.slice(0, 2).map((a: any) => (
                                    <span key={a.id} className="text-[9px] bg-neutral-800 border border-white/10 px-1.5 py-0.5 rounded text-white/70">{a?.name || 'Area'}</span>
                                  ))}
                                  {t.homeTurfs?.slice(0, 2).map((tu: any) => (
                                    <span key={tu.id} className="text-[9px] bg-neutral-800 border border-white/10 px-1.5 py-0.5 rounded text-white/70">📍 {tu?.name || 'Turf'}</span>
                                  ))}
                                </div>
                              )}`
  );

  // 4. Roster dropdown text alignment fix
  // Original is: 
  // <div className={`flex items-center gap-1 text-[10px] font-bold ${rank.text}`}>
  //   <img src={rank.icon} className="w-3 h-3 object-contain" alt="Rank" /> {rank.label}
  // </div>
  // Wait, I fixed it recently. Let's make sure it's flex items-center.
  c = c.replace(
    `<div className={\`flex items-center gap-1 text-[10px] font-bold \${rank.text}\`}>\n                            <img src={rank.icon} className="w-3 h-3 object-contain" alt="Rank" /> {rank.label}\n                          </div>`,
    `<div className={\`flex items-center justify-end gap-1 text-[10px] font-bold \${rank.text}\`}>\n                            <span className="mt-px">{rank.label}</span> <img src={rank.icon} className="w-3.5 h-3.5 object-contain" alt="Rank" />\n                          </div>`
  );

  // 5. Match History Modal 6-6 draw 'L' issue fix
  c = c.replace(
    `const h = teamDetailModal.history || [];`, // well...
    ``
  );

  c = c.replace(
    `                  {(teamDetailModal.history || []).map((h: any, i: number) => (
                    <div key={i} className={\`flex items-center gap-3 p-3 rounded-xl border \${h.won ? 'bg-[#00ff41]/5 border-[#00ff41]/20' : 'bg-red-500/5 border-red-500/20'}\`}>
                      <div className={\`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs shrink-0 \${h.won ? 'bg-[#00ff41]/20 text-[#00ff41]' : 'bg-red-500/20 text-red-400'}\`}>
                        {h.won ? 'W' : 'L'}
                      </div>`,
    `                  {(teamDetailModal.history || []).map((h: any, i: number) => {
                      const colorClass = h.outcome === 'W' ? 'bg-[#00ff41]/5 border-[#00ff41]/20' : h.outcome === 'D' ? 'bg-amber-500/5 border-amber-500/20' : 'bg-red-500/5 border-red-500/20';
                      const textClass = h.outcome === 'W' ? 'text-[#00ff41]' : h.outcome === 'D' ? 'text-amber-500' : 'text-red-400';
                      const bgClass = h.outcome === 'W' ? 'bg-[#00ff41]/20' : h.outcome === 'D' ? 'bg-amber-500/20' : 'bg-red-500/20';
                      return (
                      <div key={i} className={\`flex items-center gap-3 p-3 rounded-xl border \${colorClass}\`}>
                        <div className={\`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs shrink-0 \${bgClass} \${textClass}\`}>
                          {h.outcome || (h.won ? 'W' : 'L')}
                        </div>`
  );

  c = c.replace(
    `                      </div>
                      {h.won && <span className="text-[10px] text-[#00ff41] font-black">WIN</span>}
                    </div>
                  ))}
                </div>`,
    `                      </div>
                      {h.outcome === 'W' && <span className="text-[10px] text-[#00ff41] font-black">WIN</span>}
                      {h.outcome === 'D' && <span className="text-[10px] text-amber-500 font-black">DRAW</span>}
                    </div>
                  )})}
                </div>`
  );

  fs.writeFileSync('src/app/[locale]/interact/page.tsx', c, 'utf8');
  console.log('Interact Page patched!');
} catch (e) {
  console.error(e);
}
