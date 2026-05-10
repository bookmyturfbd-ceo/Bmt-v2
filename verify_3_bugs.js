const fs = require('fs');

const market = fs.readFileSync('src/app/api/interact/market/route.ts', 'utf8');
const annApi = fs.readFileSync('src/app/api/teams/[id]/announcements/route.ts', 'utf8');
const bookHist = fs.readFileSync('src/components/book/PlayerBookingHistory.tsx', 'utf8');
const bookApi = fs.readFileSync('src/app/api/bmt/bookings/route.ts', 'utf8');

console.log('=== BUG FIX VERIFICATION ===');
console.log('1. Draw: status in select:', market.includes('status: true,\n      winnerId'));
console.log('2. Draw: outcome uses m.status:', market.includes('m.status === \'COMPLETED\''));
console.log('3. Publish: POST cookies() awaited:', annApi.includes('const cookieStore = await cookies();\n  const auth = cookieStore.get(\'bmt_auth\')'));
console.log('4. Booking history: passes playerId:', bookHist.includes('/api/bmt/bookings?playerId='));
console.log('5. Booking history: filters CM:', bookHist.includes("b.source !== 'challenge_market'"));
console.log('6. Bookings API: accepts playerId param:', bookApi.includes("const playerId = searchParams.get('playerId')"));
