const fs = require('fs');

try {
  // 1. Patch teams/[id]/page.tsx
  let t = fs.readFileSync('src/app/[locale]/teams/[id]/page.tsx', 'utf8');

  // Move Team Scroll logic
  if (t.includes('📜 Team Scroll')) {
    // Remove it from its current spot
    t = t.replace(
      /            {\/\* Team Announcements Trigger \*\/}\n            <div className="mt-3 w-full flex justify-center z-30">\n              <button onClick=\{\(\) => setShowAnnouncements\(true\)\} className="flex items-center gap-1.5 px-5 py-1.5 bg-neutral-800\/80 hover:bg-neutral-800 rounded-full text-\[10px\] font-black uppercase text-amber-500 border border-amber-500\/30 transition-colors shadow-\[0_0_10px_rgba\(245,158,11,0.1\)\]">\n                📜 Team Scroll\n              <\/button>\n            <\/div>\n/,
      ''
    );
    // Add it after the CM Subscription Status Pill
    t = t.replace(
      '            {/* CM Subscription Status Pill */}\n            <div className="mt-2 w-full flex justify-center z-30">\n              <button onClick={() => setShowSubModal(true)} className="relative group focus:outline-none">',
      `            {/* CM Subscription Status Pill */}
            <div className="mt-2 w-full flex flex-col items-center gap-2 z-30">
              <button onClick={() => setShowSubModal(true)} className="relative group focus:outline-none">`
    );
    // Close the div and then add Team Scroll button
    t = t.replace(
      '                    </div>\n                  </div>\n                )}\n              </button>\n            </div>',
      `                    </div>
                  </div>
                )}
              </button>
              
              {/* Team Announcements Trigger */}
              <button onClick={() => setShowAnnouncements(true)} className="flex items-center gap-1.5 px-5 py-1 bg-neutral-800/80 hover:bg-neutral-800 rounded-full text-[10px] font-black uppercase text-amber-500 border border-amber-500/30 transition-colors shadow-[0_0_10px_rgba(245,158,11,0.1)]">
                📜 Team Scroll
              </button>
            </div>`
    );
  }

  // Move CM Booking Box
  if (t.includes('CM Booking History Box')) {
    const cmBox = `        {/* CM Booking History Box */}
        <div className="mt-4 glass-panel border border-[var(--panel-border)] rounded-2xl overflow-hidden mb-6 relative">
          <div className="px-4 py-3.5 flex items-center justify-between relative z-10">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center"><Clock size={13} className="text-blue-400" /></div>
              <p className="font-black text-sm">CM Joint Bookings</p>
            </div>
          </div>
          <div className="border-t border-white/5 p-4 flex flex-col gap-3 relative z-10">
            <button onClick={() => setShowCMHistory(true)} className="w-full py-3 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 font-bold text-xs rounded-xl transition-colors border border-blue-500/30">
              View Shared Ledgers
            </button>
          </div>
        </div>`;

    t = t.replace(cmBox, '');
    
    // Add above SquadManager
    t = t.replace(
      '<SquadManager team={team} setTeam={setTeam} myRole={myRole} />',
      `${cmBox}\n        <SquadManager team={team} setTeam={setTeam} myRole={myRole} />`
    );
  }

  // Inside CM Booking Box modal mapping logic
  t = t.replace(
    `<div className="flex items-center justify-between mt-1">
                       <div className="font-black text-sm">vs {oppName}</div>
                       <div className="bg-blue-500/20 border border-blue-500/40 text-blue-300 text-[10px] uppercase font-black px-2 py-0.5 rounded-md">
                         CODE: {m.bookingCode}
                       </div>
                     </div>`,
    `<div className="flex items-center justify-between mt-1">
                       <div className="font-black text-sm">vs {oppName}</div>
                       <div className="bg-blue-500/20 border border-blue-500/40 text-blue-300 text-[10px] uppercase font-black px-2 py-0.5 rounded-md">
                         CODE: {m.bookingCode}
                       </div>
                     </div>
                     <div className="flex justify-between items-center mt-1">
                       <span className="text-[11px] font-bold text-blue-100">{m.selectedSlot?.turf?.name || 'Turf Unknown'}</span>
                       <span className="text-[11px] font-black text-blue-400">৳{((m.selectedSlot?.price || 0) / 2).toLocaleString()}</span>
                     </div>`
  );

  fs.writeFileSync('src/app/[locale]/teams/[id]/page.tsx', t, 'utf8');

  // 2. Patch PlayerBookingHistory.tsx
  let b = fs.readFileSync('src/components/book/PlayerBookingHistory.tsx', 'utf8');
  
  // Filter out CM bookings
  if (b.includes('setBookings(all.filter(b => b.playerId === pid || b.playerName === pname).sort')) {
    b = b.replace(
      'setBookings(all.filter(b => b.playerId === pid || b.playerName === pname).sort',
      `setBookings(all
        .filter(b => (b.playerId === pid || b.playerName === pname) && b.source !== 'challenge_market')
        .sort`
    );
  }
  
  fs.writeFileSync('src/components/book/PlayerBookingHistory.tsx', b, 'utf8');

  // 3. Patch TurfBookingClient.tsx
  let tb = fs.readFileSync('src/components/turf/TurfBookingClient.tsx', 'utf8');

  // Fix the 404 redirect bug
  tb = tb.replace(
    `    // Navigate to /book page with history tab active
    router.push('/en/book?tab=history');`,
    `    // Navigate to /book page with history tab active
    router.push('/book?tab=history');`
  );

  fs.writeFileSync('src/components/turf/TurfBookingClient.tsx', tb, 'utf8');

  console.log('Successfully patched Phase 2 elements');

} catch(err) {
  console.error(err);
}
