const fs = require('fs');
let c = fs.readFileSync('src/app/[locale]/teams/[id]/page.tsx', 'utf8');

// Replace selectedSlot references safely
c = c.replace(
  "{m.selectedSlot?.turf?.name || 'Turf Unknown'}",
  "{(() => { const sl = cmSlots.find((s) => s.id === m.selectedSlotId); return sl ? turfs.find((t) => t.id === sl.turfId)?.name || 'Venue' : (m.selectedSlotId ? 'Venue Booked' : 'Venue TBD'); })()}"
);

// Use unicode for the taka sign to avoid issues
c = c.replace(
  '\u09f3{((m.selectedSlot?.price || 0) / 2).toLocaleString()}',
  "{(() => { const sl = cmSlots.find((s) => s.id === m.selectedSlotId); return sl ? '\u09f3' + (sl.price / 2).toLocaleString() : '\u2014'; })()}"
);

fs.writeFileSync('src/app/[locale]/teams/[id]/page.tsx', c, 'utf8');

const remaining = (c.match(/selectedSlot/g) || []).length;
console.log('Done. Remaining selectedSlot refs:', remaining);
