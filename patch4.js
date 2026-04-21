const fs = require('fs');

try {
  const pageFile = 'src/app/[locale]/interact/page.tsx';
  let pageContent = fs.readFileSync(pageFile, 'utf8');

  // Fix 1: Add won and draw properties to setResultModal in the SSE useEffect
  if (pageContent.includes('setResultModal({')) {
    const searchTarget = `winnerId: m.winnerId,`;
    if (pageContent.includes(searchTarget) && !pageContent.includes('won: m.winnerId')) {
      const replaceWith = `winnerId: m.winnerId,
            won: m.winnerId === (amA ? m.teamA_Id : m.teamB_Id),
            draw: m.winnerId === null && m.scoreA === m.scoreB,
            myScore: amA ? m.scoreA : m.scoreB,
            oppScore: amA ? m.scoreB : m.scoreA,`;
      pageContent = pageContent.replace(searchTarget, replaceWith);
      console.log('Fixed setResultModal properties (won, draw, myScore, oppScore).');
    }
  }

  // Fix 2: Initialize shownResultIdsRef from localStorage and persist it
  // Wait, useRef cannot easily trigger re-renders, but since it's just checking,
  // we do the local storage parsing on component mount inside a useEffect.
  
  // Find where shownResultIdsRef is defined
  const refDefinition = `const shownResultIdsRef = useRef<Set<string>>(new Set());`;
  if (pageContent.includes(refDefinition)) {
    // We can change the initial state to a lazy function IF we could use useState, but we can just use an effect
    // to load it once:
    const initEffect = `
  useEffect(() => {
    try {
      const stored = localStorage.getItem('bmt_shown_results');
      if (stored) {
        const parsed = JSON.parse(stored);
        parsed.forEach((id: string) => shownResultIdsRef.current.add(id));
      }
    } catch {}
  }, []);
`;
    // We already have a useEffect on mount (like `useEffect(() => { loadMarket(); }, [])`)
    // Let's just insert it safely below refDefinition
    if (!pageContent.includes('bmt_shown_results')) {
      pageContent = pageContent.replace(refDefinition, refDefinition + '\n' + initEffect);
      console.log('Added localStorage init for shownResultIdsRef.');
    }
  }

  // ALSO, we must save to localStorage whenever we add to shownResultIdsRef
  const addTarget = `shownResultIdsRef.current.add(m.id);`;
  if (pageContent.includes(addTarget) && !pageContent.includes('localStorage.setItem')) {
    const addReplace = `shownResultIdsRef.current.add(m.id);
          try { localStorage.setItem('bmt_shown_results', JSON.stringify(Array.from(shownResultIdsRef.current))); } catch {}`;
    pageContent = pageContent.replace(addTarget, addReplace);
    console.log('Added localStorage sync when showing result modal.');
  }
  
  // Double check the score properties were rendered correctly in the resultModal
  
  fs.writeFileSync(pageFile, pageContent, 'utf8');
  console.log('Patch complete.');

} catch (e) {
  console.error("Patch script failed:", e.message);
}
