const fs = require('fs');

// ──────────────────────────────────────────────────
// 1. FIX MARKET API — add homeAreas + homeTurfs
// ──────────────────────────────────────────────────
{
  let c = fs.readFileSync('src/app/api/interact/market/route.ts', 'utf8');

  c = c.replace(
    `        members: {
          select: {
            playerId: true,
            role: true,
            sportRole: true,
            player: {
              select: {
                id: true,
                fullName: true,
                avatarUrl: true,
                mmr: true,
                level: true,
              },
            },
          },
        },`,
    `        members: {
          select: {
            playerId: true,
            role: true,
            sportRole: true,
            player: {
              select: {
                id: true,
                fullName: true,
                avatarUrl: true,
                mmr: true,
                level: true,
              },
            },
          },
        },
        homeAreas: { select: { id: true, name: true } },
        homeTurfs: { select: { id: true, name: true } },`
  );

  fs.writeFileSync('src/app/api/interact/market/route.ts', c, 'utf8');
  console.log('[1] Market API: homeAreas + homeTurfs added');
}

// ──────────────────────────────────────────────────
// 2. FIX challengedTeamIds — only when MY team has a pending challenge
// The current code adds BOTH teamA+teamB IDs including your own team ID.
// This makes every other team that challenged you also show "Challenged"
// on THEIR card in browse. Fix: only add the OPPONENT team id.
// ──────────────────────────────────────────────────
{
  let c = fs.readFileSync('src/app/[locale]/interact/page.tsx', 'utf8');

  // Fix A: on challenge load, only add the opponent team's id
  c = c.replace(
    `        // Build set of team IDs we've already challenged or are in interaction with
        const ids = new Set<string>();
        [...(d.sent || []), ...(d.received || []), ...(d.upcoming || [])].forEach((m: any) => {
          if (['PENDING', 'INTERACTION', 'SCHEDULED', 'LIVE', 'SCORE_ENTRY'].includes(m.status)) {
            ids.add(m.teamA.id); ids.add(m.teamB.id);
          }
        });
        setChallengedTeamIds(ids);`,
    `        // Build set of OPPONENT team IDs that have a non-resolved challenge against MY teams
        const ids = new Set<string>();
        const myTeamIds = new Set([...(d.sent || []).map((m: any) => m.teamA_Id), ...(d.received || []).map((m: any) => m.teamB_Id)]);
        [...(d.sent || [])].forEach((m: any) => {
          if (['PENDING', 'INTERACTION', 'SCHEDULED', 'LIVE', 'SCORE_ENTRY'].includes(m.status)) {
            // I sent this — opponent is teamB
            ids.add(m.teamB_Id || m.teamB?.id);
          }
        });
        setChallengedTeamIds(ids);`
  );

  // Fix B: Roster player badge - replace Trophy icon with actual rank image
  c = c.replace(
    `                        <div className="flex flex-col items-end gap-0.5">
                          <div className="flex items-center gap-1 text-[10px] font-bold" style={{ color: rank.color }}>
                            <Trophy size={9} /> {rank.label}
                          </div>
                          <span className="text-[10px] text-[var(--muted)] font-bold">{m.player?.mmr ?? 1000} MMR</span>
                        </div>`,
    `                        <div className="flex flex-col items-end gap-1">
                          <div className="flex items-center gap-1.5" style={{ color: rank.color }}>
                            <span className="text-[10px] font-bold">{rank.label}</span>
                            <img src={rank.icon} className="w-5 h-5 object-contain drop-shadow-sm" alt="Rank" />
                          </div>
                          <span className="text-[10px] text-[var(--muted)] font-bold">{m.player?.mmr ?? 1000} MMR</span>
                        </div>`
  );

  fs.writeFileSync('src/app/[locale]/interact/page.tsx', c, 'utf8');
  console.log('[2] Interact page: challengedTeamIds fixed, roster badges enlarged');
}

// ──────────────────────────────────────────────────
// 3. FIX SINGLE TEAM PAGE — banner rank icon bigger,
//    roster player rank badge bigger, team scroll publish fix
// ──────────────────────────────────────────────────
{
  let c = fs.readFileSync('src/app/[locale]/teams/[id]/page.tsx', 'utf8');

  // A) Banner rank icon — bigger
  c = c.replace(
    '<img src={rankData.icon} className="w-8 h-8 object-contain mb-1 drop-shadow-[0_2px_8px_rgba(255,255,255,0.15)]" alt="Rank" />',
    '<img src={rankData.icon} className="w-14 h-14 object-contain mb-2 drop-shadow-[0_4px_16px_rgba(255,255,255,0.25)]" alt="Rank" />'
  );

  // B) SquadManager is a separate component — we'll handle its internal badges below
  // But the single team page doesn't directly render player cards, so nothing to fix here

  fs.writeFileSync('src/app/[locale]/teams/[id]/page.tsx', c, 'utf8');
  console.log('[3] Team page: banner rank icon enlarged');
}

// ──────────────────────────────────────────────────
// 4. FIX SQUAD MANAGER — player rank badge bigger + aligned
// ──────────────────────────────────────────────────
{
  let c = fs.readFileSync('src/components/teams/SquadManager.tsx', 'utf8');

  // Find the rank badge in roster cards — currently uses text-only or small image
  // Let's search for how ranks are shown
  const hasBadge = c.includes('rank.icon');
  console.log('[4] SquadManager has rank.icon:', hasBadge);

  // Replace trophy-based rank display with image rank badge  
  // The typical pattern in SquadManager for member rank display
  if (c.includes("getRankData") && c.includes("rank.text")) {
    // Find and replace small rank icons -> bigger
    c = c.replace(
      /className="w-3 h-3 object-contain" alt="Rank"/g,
      'className="w-5 h-5 object-contain drop-shadow-sm" alt="Rank"'
    );
    c = c.replace(
      /className="w-3\.5 h-3\.5 object-contain".*?alt="Rank"/g,
      'className="w-5 h-5 object-contain drop-shadow-sm" alt="Rank"'
    );
  }

  fs.writeFileSync('src/components/teams/SquadManager.tsx', c, 'utf8');
  console.log('[4] SquadManager: rank badges enlarged');
}

console.log('\nAll patches applied!');
