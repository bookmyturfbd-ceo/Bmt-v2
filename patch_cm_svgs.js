const fs = require('fs');

try {
  let c = fs.readFileSync('src/app/[locale]/interact/page.tsx', 'utf8');

  // Change Opponent Team badge
  c = c.replace(
    /style={{ color: rank\.color }}\s*>\s*<Trophy size={12} \/> \{rank\.label\}\s*<\/div>/g,
    `className={\`flex items-center gap-1 font-bold text-xs \${rank.text}\`}>\n                              <img src={rank.icon} className="w-3.5 h-3.5 object-contain" alt="Rank" /> {rank.label}\n                            </div>`
  );

  // Change Roster Player badge
  c = c.replace(
    /style={{ color: rank\.color }}\s*>\s*<Trophy size={9} \/> \{rank\.label\}\s*<\/div>/g,
    `className={\`flex items-center gap-1 text-[10px] font-bold \${rank.text}\`}>\n                            <img src={rank.icon} className="w-3 h-3 object-contain" alt="Rank" /> {rank.label}\n                          </div>`
  );

  // Also fix My Teams listed in CM (which I noticed earlier was using style={{ color: rank.color }})
  c = c.replace(
    /<div style={{ color: rank\.color }} className="flex items-center gap-1">/g,
    '<div className={`flex items-center gap-1 ${rank.text}`}>'
  );

  fs.writeFileSync('src/app/[locale]/interact/page.tsx', c, 'utf8');
  console.log('Successfully injected SVG SVGs into CM page');
} catch (e) {
  console.error(e);
}
