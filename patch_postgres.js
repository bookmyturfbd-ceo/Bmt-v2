const fs = require('fs');

try {
  // 1. Update Match API route to support mark_result_seen
  const apiFile = 'src/app/api/interact/match/[id]/route.ts';
  let apiContent = fs.readFileSync(apiFile, 'utf8');
  
  if (!apiContent.includes('mark_result_seen')) {
    const targetBlock = `    // ── save_player_stats ─────────────────────────────────────────────────────`;
    const newAction = `
    // ── mark_result_seen ──────────────────────────────────────────────────────
    if (action === 'mark_result_seen') {
      if (!isOMC) return NextResponse.json({ error: 'Only OMC can mark result as seen' }, { status: 403 });
      const field = isTeamA ? 'resultSeenByA' : 'resultSeenByB';
      await prisma.match.update({ where: { id: matchId }, data: { [field]: true } });
      return NextResponse.json({ ok: true });
    }

`;
    apiContent = apiContent.replace(targetBlock, newAction + targetBlock);
    fs.writeFileSync(apiFile, apiContent, 'utf8');
    console.log('Added mark_result_seen action to API.');
  }

  // 2. Update page.tsx to use DB state instead of pure localStorage, and fire API on Dismiss
  const pageFile = 'src/app/[locale]/interact/page.tsx';
  let pageContent = fs.readFileSync(pageFile, 'utf8');

  // Find the useEffect that handles auto-popups based on SSE:
  // if (m.status === 'COMPLETED' && !shownResultIdsRef.current.has(m.id)) {
  const popupCheck = `if (m.status === 'COMPLETED' && !shownResultIdsRef.current.has(m.id)) {`;
  const newPopupCheck = `const amA_check = myTeams.some((t: any) => t.id === m.teamA_Id);
      const isSeen = amA_check ? m.resultSeenByA : m.resultSeenByB;
      if (m.status === 'COMPLETED' && !isSeen && !shownResultIdsRef.current.has(m.id)) {`;
  
  if (pageContent.includes(popupCheck)) {
    pageContent = pageContent.replace(popupCheck, newPopupCheck);
    console.log('Updated popup condition to respect resultSeen flags from DB.');
  }

  // Find the Dismiss button inside the Result Modal:
  // <button onClick={() => { setResultModal(null); setMatchesSubTab('played'); setChallengeSubTab('matches'); }}
  const dismissBtnStart = `<button onClick={() => { setResultModal(null); setMatchesSubTab('played'); setChallengeSubTab('matches'); }}`;
  const dismissBtnReplace = `<button onClick={() => {
                  fetch(\`/api/interact/match/\${resultModal.match.id}\`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'mark_result_seen' })
                  });
                  setResultModal(null); setMatchesSubTab('played'); setChallengeSubTab('matches'); 
                }}`;
  
  if (pageContent.includes(dismissBtnStart)) {
    pageContent = pageContent.replace(dismissBtnStart, dismissBtnReplace);
    console.log('Added API call to Dismiss button.');
  }

  fs.writeFileSync(pageFile, pageContent, 'utf8');
  console.log('Patch complete.');

} catch (e) {
  console.error("Patch script failed:", e.message);
}
