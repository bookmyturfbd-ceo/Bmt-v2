import { readFileSync, writeFileSync } from 'fs';

const file = 'src/app/[locale]/interact/match/[id]/page.tsx';
let c = readFileSync(file, 'utf8');

// Replace outer container comment + div
c = c.replace(
  '{/* Turf image / gradient */}\n                                     <div className="w-full h-[78px] relative overflow-hidden">',
  '{/* Turf image — real photo, plain dark fallback */}\n                                     <div className="w-full h-[78px] relative overflow-hidden bg-neutral-900">'
);

// Replace the gradient fallback div (the else branch)
const gradientStart = c.indexOf('style={{ background: `linear-gradient');
if (gradientStart === -1) { console.log('gradient already removed'); process.exit(0); }

// Find start of the div containing the gradient
const divStart = c.lastIndexOf('<div className="w-full h-full flex items-center justify-center"', gradientStart);
// Find end of that block: </div>
const divEnd = c.indexOf('</div>', gradientStart) + '</div>'.length;

const replacement = `<div className="w-full h-full flex items-center justify-center bg-neutral-900">
                                           <span className="text-4xl font-black text-white/10">{turf.name[0]}</span>
                                         </div>`;

c = c.slice(0, divStart) + replacement + c.slice(divEnd);
writeFileSync(file, c);
console.log('DONE');
