const fs = require('fs');

try {
  let c = fs.readFileSync('src/app/[locale]/profile/page.tsx', 'utf8');

  // Change type declaration
  c = c.replace(
    "type HistTab = 'recharge' | 'spending';",
    "type HistTab = 'recharge' | 'spending' | 'cm_books';"
  );

  // Divide arrays
  c = c.replace(
    '  const spendingHistory = allBookings\n    .filter(b => b.playerId === playerId || b.playerName === playerName)\n    .sort((a, b) => b.date.localeCompare(a.date));',
    `  const allSpending = allBookings
    .filter((b: any) => b.playerId === playerId || b.playerName === playerName)
    .sort((a, b) => b.date.localeCompare(a.date));
    
  const spendingHistory = allSpending.filter((b: any) => b.source !== 'challenge_market');
  const cmHistory = allSpending.filter((b: any) => b.source === 'challenge_market');`
  );

  // Calculate CM total separately or leave totalSpent calculation alone (it maps across spendingHistory only, so we should map cmSpent too)
  c = c.replace(
    '  const totalSpent = spendingHistory.reduce((s, b) => {',
    `  const cmTotalSpent = cmHistory.reduce((s, b) => {
    const slot = allSlots.find(sl => sl.id === b.slotId);
    return s + (b.price ?? slot?.price ?? 0);
  }, 0);

  const totalSpent = spendingHistory.reduce((s, b) => {`
  );

  // Update history sub-tabs
  c = c.replace(
    "{[{ k: 'recharge', l: '↑ Recharge' }, { k: 'spending', l: '↓ Spending' }].map(t => (",
    "{[{ k: 'recharge', l: '↑ Recharges' }, { k: 'spending', l: '↓ Turf' }, { k: 'cm_books', l: '⚔️ Joint' }].map(t => ("
  );

  // Add cm_books render block right after spending block
  c = c.replace(
    /               }\)\}\n                <\/div>\n              \)\}/,
    `               })}\n                </div>\n              )}

              {/* CM Booking history */}
              {histTab === 'cm_books' && (
                <div className="p-4 flex flex-col gap-3 animate-in fade-in">
                  <div className="flex items-center justify-between text-[10px] font-black text-[var(--muted)] uppercase tracking-widest">
                    <span>{cmHistory.length} joined</span>
                    <span>Total: ৳{cmTotalSpent.toLocaleString()}</span>
                  </div>
                  {cmHistory.length === 0 ? (
                    <div className="py-12 text-center text-[var(--muted)]"><Swords size={28} className="mx-auto mb-2 opacity-40" /><p className="font-bold">No joint bookings</p></div>
                  ) : cmHistory.slice(0, 20).map(b => {
                    const slot = allSlots.find(s => s.id === b.slotId);
                    const turf = slot ? allTurfs.find(t => t.id === slot.turfId) : null;
                    const price = b.price ?? slot?.price ?? 0;
                    return (
                      <div key={b.id} className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-fuchsia-900/10 border border-fuchsia-500/10 relative overflow-hidden">
                        <div className="min-w-0">
                          <p className="text-xs font-black truncate text-fuchsia-100">{turf?.name || 'Challenge Match'}</p>
                          <p className="text-[10px] text-[var(--muted)]">{b.date} · {slot?.startTime}–{slot?.endTime}</p>
                        </div>
                        <p className="text-sm font-black text-fuchsia-400 shrink-0">−৳{price.toLocaleString()}</p>
                      </div>
                    );
                  })}
                </div>
              )}`
  );

  // Ensure 'Swords' isn't missing
  if (!c.includes('import {') || !c.includes('Swords')) {
      c = c.replace(
          'LogOut, User, Calendar, Wallet, Shield,',
          'LogOut, User, Calendar, Wallet, Shield, Swords,'
      );
  }

  // Same thing goes for the main Profile dashboard total metrics
  // totalSpent = myBookings.reduce... myBookings includes all. 
  // The UI metric under "Stats Pills" might be OK counting everything, but we should make sure the numbers align if they want it fully isolated.
  // We'll leave the total global spent as is since it's an overarching profile stat.

  fs.writeFileSync('src/app/[locale]/profile/page.tsx', c, 'utf8');
  console.log('Successfully patched profile page wallet tabs');
} catch (e) {
  console.error(e);
}
