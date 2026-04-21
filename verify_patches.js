const fs = require('fs');

const teamPage = fs.readFileSync('src/app/[locale]/teams/[id]/page.tsx', 'utf8');
const interact = fs.readFileSync('src/app/[locale]/interact/page.tsx', 'utf8');
const market = fs.readFileSync('src/app/api/interact/market/route.ts', 'utf8');
const squad = fs.readFileSync('src/components/teams/SquadManager.tsx', 'utf8');
const annApi = fs.readFileSync('src/app/api/teams/[id]/announcements/route.ts', 'utf8');

console.log('=== VERIFICATION ===');
console.log('1. Market API homeAreas:', market.includes('homeAreas'));
console.log('2. Market API homeTurfs:', market.includes('homeTurfs'));
console.log('3. ChallengedTeamIds only sent:', interact.includes('d.sent || []).forEach'));
console.log('4. Roster badge img w-5:', interact.includes('w-5 h-5 object-contain drop-shadow-sm'));
console.log('5. Banner icon w-14 h-14:', teamPage.includes('w-14 h-14'));
console.log('6. Content-Type on POST:', teamPage.includes("'Content-Type': 'application/json'"));
console.log('7. EditableDecree:', teamPage.includes('EditableDecree'));
console.log('8. editingAnnId:', teamPage.includes('editingAnnId'));
console.log('9. handleSaveEdit:', teamPage.includes('handleSaveEdit'));
console.log('10. PATCH in annApi:', annApi.includes('PATCH'));
console.log('11. SquadManager h-6 badge:', squad.includes('h-6 w-auto object-contain'));
console.log('12. SquadManager card refactored:', squad.includes('10px font-black bg-neutral-800'));
console.log('13. selectedSlot refs remaining:', (teamPage.match(/selectedSlot\?/g) || []).length);
