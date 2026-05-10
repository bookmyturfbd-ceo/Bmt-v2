const fs = require('fs');

// ─────────────────────────────────────────────────────────────
// FIX 1: Market API draw detection — add `status` to select clause
// ─────────────────────────────────────────────────────────────
{
  let c = fs.readFileSync('src/app/api/interact/market/route.ts', 'utf8');
  
  c = c.replace(
    `    select: {
      id: true,
      winnerId: true,
      teamA_Id: true,
      teamB_Id: true,
      scoreA: true,
      scoreB: true,
      teamA: { select: { id: true, name: true, logoUrl: true } },
      teamB: { select: { id: true, name: true, logoUrl: true } },
    },`,
    `    select: {
      id: true,
      status: true,
      winnerId: true,
      teamA_Id: true,
      teamB_Id: true,
      scoreA: true,
      scoreB: true,
      teamA: { select: { id: true, name: true, logoUrl: true } },
      teamB: { select: { id: true, name: true, logoUrl: true } },
    },`
  );

  fs.writeFileSync('src/app/api/interact/market/route.ts', c, 'utf8');
  console.log('[1] Fixed: status field added to draw detection query');
}

// ─────────────────────────────────────────────────────────────
// FIX 2: Announcements API — await cookies() (Next.js 15)
// ─────────────────────────────────────────────────────────────
{
  let c = fs.readFileSync('src/app/api/teams/[id]/announcements/route.ts', 'utf8');

  // POST: await cookies()
  c = c.replace(
    `export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {\n  const { id } = await params;\n  const cookieStore = cookies();\n  const auth = cookieStore.get('bmt_auth')?.value;\n  const myPlayerId = cookieStore.get('bmt_player_id')?.value;`,
    `export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {\n  const { id } = await params;\n  const cookieStore = await cookies();\n  const auth = cookieStore.get('bmt_auth')?.value;\n  const myPlayerId = cookieStore.get('bmt_player_id')?.value;`
  );

  // DELETE: await cookies()
  c = c.replace(
    `export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {\n  const { id } = await params;\n  const cookieStore = cookies();\n  const auth = cookieStore.get('bmt_auth')?.value;`,
    `export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {\n  const { id } = await params;\n  const cookieStore = await cookies();\n  const auth = cookieStore.get('bmt_auth')?.value;`
  );

  // PATCH: await cookies()
  c = c.replace(
    `export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {\n  const { id } = await params;\n  const cookieStore = cookies();\n  const auth = cookieStore.get('bmt_auth')?.value;`,
    `export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {\n  const { id } = await params;\n  const cookieStore = await cookies();\n  const auth = cookieStore.get('bmt_auth')?.value;`
  );

  fs.writeFileSync('src/app/api/teams/[id]/announcements/route.ts', c, 'utf8');
  console.log('[2] Fixed: await cookies() in announcements API');
}

// ─────────────────────────────────────────────────────────────
// FIX 3: PlayerBookingHistory — fix the API route to filter by player cookie
//         instead of doing it client-side (more reliable)
//         Also fix the /api/bmt/bookings route to accept optional playerId filter  
// ─────────────────────────────────────────────────────────────
{
  // Update PlayerBookingHistory to use a proper player-specific API call
  let c = fs.readFileSync('src/components/book/PlayerBookingHistory.tsx', 'utf8');

  // Make the fetch use cookies properly — pass cookie value as query param
  c = c.replace(
    `    Promise.all([
      fetch('/api/bmt/bookings').then(r => r.json()),
      fetch('/api/bmt/slots').then(r => r.json()),
      fetch('/api/bmt/turfs').then(r => r.json())
    ]).then(([bs, ss, ts]) => {
      setSlots(Array.isArray(ss) ? ss : []);
      setTurfs(Array.isArray(ts) ? ts : []);
      
      const all: Booking[] = Array.isArray(bs) ? bs : [];
      setBookings(all
        .filter(b => (b.playerId === pid || b.playerName === pname) && b.source !== 'challenge_market')
        .sort((a,b) => {
        const timeA = a.createdAt || a.date;
        const timeB = b.createdAt || b.date;
        return timeB.localeCompare(timeA);
      }));
      setLoading(false);
    });`,
    `    Promise.all([
      fetch(\`/api/bmt/bookings?playerId=\${encodeURIComponent(pid || '')}\`).then(r => r.json()),
      fetch('/api/bmt/slots').then(r => r.json()),
      fetch('/api/bmt/turfs').then(r => r.json())
    ]).then(([bs, ss, ts]) => {
      setSlots(Array.isArray(ss) ? ss : []);
      setTurfs(Array.isArray(ts) ? ts : []);
      
      const all: Booking[] = Array.isArray(bs) ? bs : [];
      // Only show standard bookings — CM bookings are separate (they show in team page)
      setBookings(all
        .filter(b => b.source !== 'challenge_market')
        .sort((a, b) => {
          const timeA = a.createdAt || a.date;
          const timeB = b.createdAt || b.date;
          return timeB.localeCompare(timeA);
        }));
      setLoading(false);
    });`
  );

  fs.writeFileSync('src/components/book/PlayerBookingHistory.tsx', c, 'utf8');
  console.log('[3] Fixed: PlayerBookingHistory now passes playerId as query param and filters CM bookings');
}

// ─────────────────────────────────────────────────────────────
// FIX 4: /api/bmt/bookings — accept optional playerId query param
// ─────────────────────────────────────────────────────────────
{
  let c = fs.readFileSync('src/app/api/bmt/bookings/route.ts', 'utf8');

  c = c.replace(
    `export async function GET() {
  const bookings = await prisma.booking.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      player: true,
      slot: {
        include: { ground: true }
      }
    }
  });
  return NextResponse.json(bookings);
}`,
    `export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const playerId = searchParams.get('playerId');

  const where = playerId ? { playerId } : {};

  const bookings = await prisma.booking.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      player: true,
      slot: {
        include: { ground: true }
      }
    }
  });
  return NextResponse.json(bookings);
}`
  );

  fs.writeFileSync('src/app/api/bmt/bookings/route.ts', c, 'utf8');
  console.log('[4] Fixed: bookings API now filters by playerId query param');
}

console.log('\nAll 3 issues fixed!');
