const fs = require('fs');

try {
  // 1. Update API to include playerMatchStats for our team
  const apiFile = 'src/app/api/interact/challenge/route.ts';
  let apiContent = fs.readFileSync(apiFile, 'utf8');
  if (!apiContent.includes('playerMatchStats')) {
    apiContent = apiContent.replace(
      'teamB: { select: { id: true, name: true, logoUrl: true, sportType: true, teamMmr: true } },',
      'teamB: { select: { id: true, name: true, logoUrl: true, sportType: true, teamMmr: true } },\n      playerMatchStats: { where: { teamId: { in: myTeamIds } }, select: { id: true } },'
    );
    fs.writeFileSync(apiFile, apiContent, 'utf8');
    console.log('API patched successfully.');
  }

  // 2. Patch page.tsx
  const pageFile = 'src/app/[locale]/interact/page.tsx';
  let pageContent = fs.readFileSync(pageFile, 'utf8');

  // Move PLAYER MMR RESULT MODAL into the return statement
  const modalStartMatch = '{/* ═══════════════════════════════════════\n           PLAYER MMR RESULT MODAL';
  const modalStartIndex = pageContent.indexOf(modalStartMatch);
  
  if (modalStartIndex !== -1) {
    // Find the end of the modal block
    // It's followed by `return (\n    <div className="min-h-screen`
    const returnIndex = pageContent.indexOf('return (', modalStartIndex);
    if (returnIndex !== -1) {
      const modalBlock = pageContent.substring(modalStartIndex, returnIndex);
      
      // Remove it from its current position
      pageContent = pageContent.substring(0, modalStartIndex) + pageContent.substring(returnIndex);
      
      // Insert it right after the outermost <div className="min-h-screen...">
      const targetDivMatcher = '<div className="min-h-screen bg-background text-white pb-24 font-sans px-4 pt-6 w-full max-w-md mx-auto">';
      const targetDivIndex = pageContent.indexOf(targetDivMatcher);
      if (targetDivIndex !== -1) {
        pageContent = pageContent.substring(0, targetDivIndex + targetDivMatcher.length) + '\n\n' + modalBlock + '\n\n' + pageContent.substring(targetDivIndex + targetDivMatcher.length);
        console.log('Moved PLAYER MMR RESULT MODAL successfully.');
      }
    }
  }

  // Add the missing auto-open useEffect for ResultModal
  if (!pageContent.includes('shownResultIdsRef.current.has(m.id)')) {
    const sseHookTarget = 'return () => ev.close();\n  }, [loadChallenges]);';
    const sseHookIndex = pageContent.indexOf(sseHookTarget);
    if (sseHookIndex !== -1) {
      const newEffect = `
  // Auto-open result modal via backend SSE updates
  useEffect(() => {
    challenges.upcoming.forEach((m: any) => {
      if (m.status === 'COMPLETED' && !shownResultIdsRef.current.has(m.id)) {
        if (myTeams.some((t: any) => t.id === m.teamA_Id || t.id === m.teamB_Id)) {
          const amA = myTeams.some((t: any) => t.id === m.teamA_Id);
          shownResultIdsRef.current.add(m.id);
          setScoreModalId(null);
          setResultModal({
            match: m,
            amA,
            mmrDelta: amA ? m.mmrChangeA : m.mmrChangeB,
            scoreA: m.scoreA, scoreB: m.scoreB,
            winnerId: m.winnerId,
            mmrGainA: m.mmrChangeA, mmrGainB: m.mmrChangeB,
            myTeam: amA ? m.teamA : m.teamB, oppTeam: amA ? m.teamB : m.teamA,
          });
        }
      }
    });
  }, [challenges.upcoming, myTeams]);
`;
      pageContent = pageContent.substring(0, sseHookIndex + sseHookTarget.length) + '\n\n' + newEffect + pageContent.substring(sseHookIndex + sseHookTarget.length);
      console.log('Added missing ResultModal useEffect.');
    }
  }

  // Grey out COMPLETED matches where playerStats are done
  // AND make badges slightly larger (text-xs instead of text-[8px])
  // Wait, the match card is rendered inside filteredTeams map or upcoming map.
  // The match card looks like:
  /*
    const amA = myTeams.some((x: any) => x.id === m.teamA_Id);
    return (
      <div key={m.id} onClick={() => openScoreModal(m)} className="bg-neutral-900 border border-white/5 rounded-2xl p-4 cursor-pointer">
  */
  // Find where they set amA and return a div for a match card in upcoming:
  // Let's replace the `bg-neutral-900` class with a dynamic class based on `m.status === 'COMPLETED'` and `hasStats`.
  
  if (!pageContent.includes('const hasStats =')) {
    pageContent = pageContent.replace(
      'const myScoreSubmitted = amA ? m.scoreSubmittedByA : m.scoreSubmittedByB;',
      `const myScoreSubmitted = amA ? m.scoreSubmittedByA : m.scoreSubmittedByB;
                    const hasStats = m.status === 'COMPLETED' && (m.playerMatchStats?.length > 0 || playerMmrResult?.length > 0);`
    );

    // Replace the first onClick and className wrap
    pageContent = pageContent.replace(
      'onClick={() => {',
      'onClick={() => { if (hasStats) return;'
    );
    
    // Instead of raw string replacement, use regex to find the div class of the match card
    // The match card div starts with: <div key={m.id} className="bg-neutral-900 border border-white/5 rounded-2xl p-4" onClick=
    // Actually, looking at the UI, the div has `onClick={() => {...}}`.
    // We'll replace it.
    pageContent = pageContent.replace(
      /<div key=\{m\.id\} className="bg-neutral-900 border border-white\/5 rounded-2xl p-4[^>]*>/,
      `<div key={m.id} className={\`bg-neutral-900 border border-white/5 rounded-2xl p-4 transition-all \${hasStats ? 'opacity-50 grayscale cursor-default' : 'cursor-pointer hover:bg-neutral-800'}\`} onClick={() => { if (!hasStats) { if (m.status === 'SCORE_ENTRY') openScoreModal(m); else if (m.status === 'COMPLETED') openPlayerStatsModal(m); } } }>`
    );
    console.log('Added grey-out logic.');
  }

  // Make badges bigger in player stats modal:
  // "player score entering badges looks sooo small and clustered"
  pageContent = pageContent.replace(/text-\[8px\] font-black px-1\.5 py-px/g, 'text-[10px] font-black px-2.5 py-0.5 mt-1');

  fs.writeFileSync(pageFile, pageContent, 'utf8');
  console.log('page.tsx patched successfully.');
} catch (e) {
  console.error("Patch script failed:", e.message);
}
