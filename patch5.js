const fs = require('fs');

try {
  const pageFile = 'src/app/[locale]/interact/page.tsx';
  let pageContent = fs.readFileSync(pageFile, 'utf8');

  // 1. Update getRankData
  const oldRankData = `function getRankData(mmr: number) {
  if (mmr <= 699)  return { label: 'Bronze III',   color: '#cd7f32', glow: '165,80,0' };
  if (mmr <= 799)  return { label: 'Bronze II',    color: '#cd7f32', glow: '165,80,0' };
  if (mmr <= 899)  return { label: 'Bronze I',     color: '#cd7f32', glow: '165,80,0' };
  if (mmr <= 999)  return { label: 'Silver III',   color: '#c0c0c0', glow: '180,180,180' };
  if (mmr <= 1099) return { label: 'Silver II',    color: '#c0c0c0', glow: '180,180,180' };
  if (mmr <= 1199) return { label: 'Silver I',     color: '#c0c0c0', glow: '180,180,180' };
  if (mmr <= 1299) return { label: 'Gold III',     color: '#ffd700', glow: '200,160,0' };
  if (mmr <= 1399) return { label: 'Gold II',      color: '#ffd700', glow: '200,160,0' };
  if (mmr <= 1499) return { label: 'Gold I',       color: '#ffd700', glow: '200,160,0' };
  if (mmr <= 1599) return { label: 'Platinum III', color: '#00e5ff', glow: '0,200,220' };
  if (mmr <= 1699) return { label: 'Platinum II',  color: '#00e5ff', glow: '0,200,220' };
  if (mmr <= 1799) return { label: 'Platinum I',   color: '#00e5ff', glow: '0,200,220' };
  return { label: 'BMT Legend', color: '#ff00ff', glow: '200,0,200' };
}`;

  const newRankData = `function getRankData(mmr: number) {
  if (mmr <= 699)  return { label: 'Bronze III',   color: '#cd7f32', glow: '165,80,0', min: 0, next: 700, icon: '🥉' };
  if (mmr <= 799)  return { label: 'Bronze II',    color: '#cd7f32', glow: '165,80,0', min: 700, next: 800, icon: '🥉' };
  if (mmr <= 899)  return { label: 'Bronze I',     color: '#cd7f32', glow: '165,80,0', min: 800, next: 900, icon: '🥉' };
  if (mmr <= 999)  return { label: 'Silver III',   color: '#c0c0c0', glow: '180,180,180', min: 900, next: 1000, icon: '🥈' };
  if (mmr <= 1099) return { label: 'Silver II',    color: '#c0c0c0', glow: '180,180,180', min: 1000, next: 1100, icon: '🥈' };
  if (mmr <= 1199) return { label: 'Silver I',     color: '#c0c0c0', glow: '180,180,180', min: 1100, next: 1200, icon: '🥈' };
  if (mmr <= 1299) return { label: 'Gold III',     color: '#ffd700', glow: '200,160,0', min: 1200, next: 1300, icon: '🥇' };
  if (mmr <= 1399) return { label: 'Gold II',      color: '#ffd700', glow: '200,160,0', min: 1300, next: 1400, icon: '🥇' };
  if (mmr <= 1499) return { label: 'Gold I',       color: '#ffd700', glow: '200,160,0', min: 1400, next: 1500, icon: '🥇' };
  if (mmr <= 1599) return { label: 'Platinum III', color: '#00e5ff', glow: '0,200,220', min: 1500, next: 1600, icon: '💎' };
  if (mmr <= 1699) return { label: 'Platinum II',  color: '#00e5ff', glow: '0,200,220', min: 1600, next: 1700, icon: '💎' };
  if (mmr <= 1799) return { label: 'Platinum I',   color: '#00e5ff', glow: '0,200,220', min: 1700, next: 1800, icon: '💎' };
  return { label: 'BMT Legend', color: '#ff00ff', glow: '200,0,200', min: 1800, next: 2000, icon: '👑' };
}`;

  if (pageContent.includes(oldRankData)) {
    pageContent = pageContent.replace(oldRankData, newRankData);
    console.log('Updated getRankData.');
  } else {
    console.log('Warning: could not find getRankData strict match, attempting loose replace.');
  }

  // 2. Update the useEffect logic
  const oldEffect = `  // Animate MMR bar when result modal opens
  useEffect(() => {
    if (!resultModal) { setAnimMMR(0); setAnimWidth(0); return; }
    const target = Math.abs(resultModal.mmrDelta ?? 0);
    let cur = 0;
    const step = Math.max(1, Math.ceil(target / 40));
    const t = setInterval(() => {
      cur = Math.min(cur + step, target);
      setAnimMMR(resultModal.mmrDelta >= 0 ? cur : -cur);
      setAnimWidth(target > 0 ? (cur / target) * 100 : 100);
      if (cur >= target) clearInterval(t);
    }, 25);
    return () => clearInterval(t);
  }, [resultModal]);`;

  const newEffect = `  // Animate MMR bar when result modal opens
  useEffect(() => {
    if (!resultModal) { setAnimMMR(0); setAnimWidth(0); return; }
    
    const newMmr = resultModal.myTeam.teamMmr ?? 1000;
    const oldMmr = newMmr - (resultModal.mmrDelta ?? 0);
    const target = Math.abs(resultModal.mmrDelta ?? 0);
    const sign = resultModal.mmrDelta >= 0 ? 1 : -1;
    
    setAnimMMR(oldMmr);
    const initialRank = getRankData(oldMmr);
    let progress = Math.min(100, Math.max(0, ((oldMmr - initialRank.min) / (initialRank.next - initialRank.min)) * 100));
    setAnimWidth(progress);
    
    if (target === 0) return;

    let cur = 0;
    const step = Math.max(1, Math.ceil(target / 40));
    const t = setInterval(() => {
      cur = Math.min(cur + step, target);
      const currentDynamicMmr = oldMmr + (sign * cur);
      setAnimMMR(currentDynamicMmr);
      
      const dynRank = getRankData(currentDynamicMmr);
      let dynProgress = Math.min(100, Math.max(0, ((currentDynamicMmr - dynRank.min) / (dynRank.next - dynRank.min)) * 100));
      setAnimWidth(dynProgress);
      
      if (cur >= target) clearInterval(t);
    }, 40);
    return () => clearInterval(t);
  }, [resultModal]);`;

  if (pageContent.includes(oldEffect)) {
    pageContent = pageContent.replace(oldEffect, newEffect);
    console.log('Updated useEffect animation logic.');
  }

  // 3. Update JSX of Result Modal
  /*
              {/* Animated MMR bar *\/}
              <div className="mb-5">
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-xs font-black text-neutral-500 uppercase tracking-wide">MMR Change</span>
                  <span className={\`text-2xl font-black transition-all \${
                    resultModal.mmrDelta > 0 ? 'text-[#00ff41]' :
                    resultModal.mmrDelta < 0 ? 'text-red-400' : 'text-neutral-500'
                  }\`}>
                    {animMMR > 0 ? \`+\${animMMR}\` : animMMR === 0 ? '±0' : animMMR}
                  </span>
                </div>
                {/* Progress bar *\/}
                <div className="h-3 bg-neutral-800 rounded-full overflow-hidden">
                  <div
                    className={\`h-full rounded-full transition-none \${
                      resultModal.mmrDelta > 0 ? 'bg-[#00ff41] shadow-[0_0_12px_rgba(0,255,65,0.5)]' :
                      resultModal.mmrDelta < 0 ? 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.4)]' :
                      'bg-neutral-500'
                    }\`}
                    style={{ width: \`\${animWidth}%\`, transition: 'width 25ms linear' }}
                  />
                </div>
                <p className="text-[10px] text-neutral-500 mt-1 text-right">
                  {resultModal.mmrDelta > 0 ? 'MMR Gained' : resultModal.mmrDelta < 0 ? 'MMR Lost' : 'No MMR change'}
                </p>
              </div>
  */
  
  const oldJSXStart = `{/* Animated MMR bar */}`;
  const oldJSXEnd = `<button onClick={() => {`;
  
  if (pageContent.includes(oldJSXStart) && pageContent.includes(oldJSXEnd)) {
    const startIdx = pageContent.indexOf(oldJSXStart);
    const endIdx = pageContent.indexOf(oldJSXEnd, startIdx);
    const replacementJSX = `
              {/* Animated MMR bar */}
              <div className="mb-5 bg-neutral-900/50 border border-white/5 rounded-2xl p-4">
                {(() => {
                   const dynRank = getRankData(animMMR);
                   return (
                     <>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl drop-shadow-md">{dynRank.icon}</span>
                            <div>
                                <p className="text-[10px] font-black text-neutral-500 uppercase">{dynRank.label}</p>
                                <p className="text-xl font-black text-white leading-none">{Math.floor(animMMR)} <span className="text-[10px] text-neutral-500 font-bold">MMR</span></p>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <p className="text-[10px] font-black text-neutral-500 uppercase tracking-wide">Change</p>
                            <p className={\`text-xl font-black \${resultModal.mmrDelta > 0 ? 'text-[#00ff41]' : resultModal.mmrDelta < 0 ? 'text-red-400' : 'text-neutral-500'}\`}>
                                {resultModal.mmrDelta > 0 ? \`+\${resultModal.mmrDelta}\` : resultModal.mmrDelta}
                            </p>
                          </div>
                        </div>

                        {/* Progress bar */}
                        <div className="h-3 bg-neutral-800 rounded-full overflow-hidden relative border border-white/5">
                          <div
                            className={\`h-full rounded-full transition-none \${
                              resultModal.mmrDelta > 0 ? 'bg-[#00ff41] shadow-[0_0_12px_rgba(0,255,65,0.5)]' :
                              resultModal.mmrDelta < 0 ? 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.4)]' :
                              'bg-neutral-500'
                            }\`}
                            style={{ width: \`\${animWidth}%\`, transition: 'width 40ms linear' }}
                          />
                        </div>
                        <div className="flex justify-between items-center mt-1.5 opacity-60">
                          <span className="text-[9px] font-black text-neutral-400">{dynRank.min}</span>
                          <span className="text-[9px] font-black text-neutral-400">Next div: {dynRank.next}</span>
                        </div>
                     </>
                   );
                })()}
              </div>

              `;
              
    pageContent = pageContent.substring(0, startIdx) + replacementJSX + pageContent.substring(endIdx);
    console.log('Updated Result Modal JSX.');
  }
  
  fs.writeFileSync(pageFile, pageContent, 'utf8');
} catch (error) {
  console.log('Script error:', error);
}
