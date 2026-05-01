// fix_backticks.js — replaces escaped backticks (\`) with real backticks (`) in all affected files
const fs = require('fs');
const path = require('path');

const files = [
  'src/app/api/t-matches/[id]/events/route.ts',
  'src/app/api/tournaments/[id]/groups/draw/route.ts',
  'src/app/api/tournaments/[id]/register/route.ts',
  'src/app/[locale]/score/[token]/page.tsx',
  'src/app/[locale]/score/[token]/components/CricketScorer.tsx',
  'src/app/[locale]/score/[token]/components/FootballScorer.tsx',
  'src/app/[locale]/organizer/dashboard/page.tsx',
  'src/app/[locale]/organizer/tournaments/[id]/page.tsx',
  'src/components/admin/TournamentsAdminPanel.tsx',
  'src/components/admin/tournaments/TournamentListTab.tsx',
  'src/components/admin/tournaments/TournamentDetailsModal.tsx',
  'src/components/admin/tournaments/OrganizerListTab.tsx',
  'src/components/admin/tournaments/CreateTournamentWizard.tsx',
];

let totalFixed = 0;

for (const f of files) {
  const fullPath = path.join(__dirname, f);
  if (!fs.existsSync(fullPath)) {
    console.log(`SKIP (not found): ${f}`);
    continue;
  }

  const original = fs.readFileSync(fullPath, 'utf8');
  // Replace escaped backticks with real backticks
  const fixed = original.replace(/\\`/g, '`');

  if (fixed !== original) {
    fs.writeFileSync(fullPath, fixed, 'utf8');
    const count = (original.match(/\\`/g) || []).length;
    totalFixed += count;
    console.log(`✓ Fixed ${count} backtick(s): ${f}`);
  } else {
    console.log(`• No changes: ${f}`);
  }
}

console.log(`\nTotal replacements: ${totalFixed}`);
