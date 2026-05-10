const fs = require('fs');

try {
  const pageFile = 'src/app/[locale]/interact/page.tsx';
  let pageContent = fs.readFileSync(pageFile, 'utf8');

  // Fix 1: Grey out PLAYED card and hide "Enter Stats" button when playerMatchStats length > 0
  
  if (!pageContent.includes('const hasStats = m.playerMatchStats')) {
    // Find the PLAYED subtab match card rendering
    const searchString = `const won       = m.winnerId === myTeamHere?.id;\n                              const draw      = m.winnerId === null && m.scoreA === m.scoreB;\n                              return (\n                                <div key={m.id} className={\`rounded-2xl border overflow-hidden \${\n                                  won ? 'bg-[#00ff41]/5 border-[#00ff41]/20' : draw ? 'bg-neutral-900 border-white/10' : 'bg-red-500/5 border-red-500/20'\n                                }\`}>`;
    
    const replacement = `const won       = m.winnerId === myTeamHere?.id;
                              const draw      = m.winnerId === null && m.scoreA === m.scoreB;
                              const hasStats  = m.playerMatchStats?.length > 0;
                              return (
                                <div key={m.id} className={\`rounded-2xl border overflow-hidden transition-all \${hasStats ? 'opacity-40 grayscale pointer-events-none' : ''} \${
                                  won ? 'bg-[#00ff41]/5 border-[#00ff41]/20' : draw ? 'bg-neutral-900 border-white/10' : 'bg-red-500/5 border-red-500/20'
                                }\`}>`;
    
    if (pageContent.includes(searchString)) {
      pageContent = pageContent.replace(searchString, replacement);
      console.log('Applied PLAYED card grey out logic part 1.');
    } else {
      console.error('Could not find searchString for PLAYED card.');
    }

    // Now hide the Enter Player Stats button if hasStats is true
    const searchBtn = `{/* Player Stats CTA */}\n                                  <div className="px-4 pb-4">\n                                    <button onClick={() => openPlayerStatsModal(m)}`;
    const replaceBtn = `{/* Player Stats CTA */}\n                                  {!hasStats && (\n                                    <div className="px-4 pb-4">\n                                      <button onClick={() => openPlayerStatsModal(m)}`;
    
    // We need to also close the condition </div>}
    const searchBtnEnd = `{statsLoading ? <Loader2 size={13} className="animate-spin" /> : '📊'} Enter Player Stats\n                                    </button>\n                                  </div>`;
    const replaceBtnEnd = `{statsLoading ? <Loader2 size={13} className="animate-spin" /> : '📊'} Enter Player Stats\n                                      </button>\n                                    </div>\n                                  )}`;

    if (pageContent.includes(searchBtn) && pageContent.includes(searchBtnEnd)) {
      pageContent = pageContent.replace(searchBtn, replaceBtn);
      pageContent = pageContent.replace(searchBtnEnd, replaceBtnEnd);
      console.log('Applied PLAYED card hide button logic.');
    }
  }

  // To fix immediate state update for the PLAYED card after stats are saved:
  // In savePlayerStats, we must update the challenges.upcoming array by modifying the match to have playerMatchStats = [ {id: ...} ].
  const statsSaveTarget = `if (res.ok) { setStatsModal(null); loadChallenges();`;
  const statsSaveReplace = `if (res.ok) { 
        setStatsModal(null); 
        // optimistically mark stats as done to immediately grey out the card
        setChallenges((prev: any) => ({
          ...prev, 
          upcoming: prev.upcoming.map((m: any) => m.id === statsModal.match.id ? { ...m, playerMatchStats: [{id: 'temp'}] } : m)
        }));
        loadChallenges();`;
        
  if (pageContent.includes(statsSaveTarget) && !pageContent.includes('setChallenges((prev')) {
    pageContent = pageContent.replace(statsSaveTarget, statsSaveReplace);
    console.log('Optimistic stats assignment added.');
  }

  fs.writeFileSync(pageFile, pageContent, 'utf8');
  console.log('Patch complete.');

} catch (e) {
  console.error("Patch script failed:", e.message);
}
