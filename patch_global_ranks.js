const fs = require('fs');

const universalRankData = `function getRankData(mmr: number) {
  if (mmr <= 699)  return { label: 'Bronze III', rank: 'Bronze', tier: 'III', color: 'from-[#6e462d] to-[#4a2e1b]', text: 'text-[#cd7f32]', border: 'border-[#cd7f32]/30', min: 0, next: 700, icon: '/ranks/Bronze.svg' };
  if (mmr <= 799)  return { label: 'Bronze II',  rank: 'Bronze', tier: 'II', color: 'from-[#6e462d] to-[#4a2e1b]', text: 'text-[#cd7f32]', border: 'border-[#cd7f32]/40', min: 700, next: 800, icon: '/ranks/Bronze.svg' };
  if (mmr <= 899)  return { label: 'Bronze I',   rank: 'Bronze', tier: 'I', color: 'from-[#6e462d] to-[#4a2e1b]', text: 'text-[#cd7f32]', border: 'border-[#cd7f32]/50', min: 800, next: 900, icon: '/ranks/Bronze.svg' };
  if (mmr <= 999)  return { label: 'Silver III', rank: 'Silver', tier: 'III', color: 'from-[#606060] to-[#3a3a3a]', text: 'text-[#c0c0c0]', border: 'border-[#c0c0c0]/30', min: 900, next: 1000, icon: '/ranks/Silver.svg' };
  if (mmr <= 1099) return { label: 'Silver II',  rank: 'Silver', tier: 'II',  color: 'from-[#606060] to-[#3a3a3a]', text: 'text-[#c0c0c0]', border: 'border-[#c0c0c0]/40', min: 1000, next: 1100, icon: '/ranks/Silver.svg' };
  if (mmr <= 1199) return { label: 'Silver I',   rank: 'Silver', tier: 'I',   color: 'from-[#606060] to-[#3a3a3a]', text: 'text-[#c0c0c0]', border: 'border-[#c0c0c0]/50', min: 1100, next: 1200, icon: '/ranks/Silver.svg' };
  if (mmr <= 1299) return { label: 'Gold III',   rank: 'Gold', tier: 'III',   color: 'from-[#8a6800] to-[#4d3a00]', text: 'text-[#ffd700]', border: 'border-[#ffd700]/30', min: 1200, next: 1300, icon: '/ranks/Gold.svg' };
  if (mmr <= 1399) return { label: 'Gold II',    rank: 'Gold', tier: 'II',    color: 'from-[#8a6800] to-[#4d3a00]', text: 'text-[#ffd700]', border: 'border-[#ffd700]/40', min: 1300, next: 1400, icon: '/ranks/Gold.svg' };
  if (mmr <= 1499) return { label: 'Gold I',     rank: 'Gold', tier: 'I',     color: 'from-[#8a6800] to-[#4d3a00]', text: 'text-[#ffd700]', border: 'border-[#ffd700]/50', min: 1400, next: 1500, icon: '/ranks/Gold.svg' };
  if (mmr <= 1599) return { label: 'Platinum III', rank: 'Platinum', tier: 'III', color: 'from-[#005e66] to-[#003338]', text: 'text-[#00e5ff]', border: 'border-[#00e5ff]/30', min: 1500, next: 1600, icon: '/ranks/Platinum.svg' };
  if (mmr <= 1699) return { label: 'Platinum II',  rank: 'Platinum', tier: 'II',  color: 'from-[#005e66] to-[#003338]', text: 'text-[#00e5ff]', border: 'border-[#00e5ff]/40', min: 1600, next: 1700, icon: '/ranks/Platinum.svg' };
  if (mmr <= 1799) return { label: 'Platinum I',   rank: 'Platinum', tier: 'I',   color: 'from-[#005e66] to-[#003338]', text: 'text-[#00e5ff]', border: 'border-[#00e5ff]/50', min: 1700, next: 1800, icon: '/ranks/Platinum.svg' };
  return { label: 'BMT Legend', rank: 'BMT Legend', tier: '', color: 'from-[#800080] to-[#330033]', text: 'text-[#ff00ff]', border: 'border-[#ff00ff]/60', min: 1800, next: 2000, icon: '/ranks/Legend.svg' };
}`;

function replaceRankDataFunc(content) {
  const startIdx = content.indexOf('function getRankData(mmr: number) {');
  if (startIdx === -1) return content;
  const endIdx = content.indexOf('}', startIdx);
  return content.substring(0, startIdx) + universalRankData + content.substring(endIdx + 1);
}

try {
  // ---------------------------------------------------------
  // 1. SquadManager.tsx
  // ---------------------------------------------------------
  const smPath = 'src/components/teams/SquadManager.tsx';
  let smContent = fs.readFileSync(smPath, 'utf8');
  smContent = replaceRankDataFunc(smContent);
  
  const oldRankBadge = `function RankBadge({ mmr, inline = false }: { mmr: number, inline?: boolean }) {
  const d = getRankData(mmr);
  if (inline) return <span className={\`\${d.text} font-black italic\`}>{d.rank} {d.tier}</span>;
  return (
    <div className={\`flex flex-col items-center justify-center px-3 py-2 rounded-xl bg-gradient-to-b \${d.color} border \${d.border} shadow-lg shadow-black/50 overflow-hidden relative\`}>
      <div className="absolute inset-0 bg-white/5 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/20 via-transparent to-transparent opacity-50"></div>
      <span className={\`text-[10px] uppercase font-black tracking-widest \${d.text} drop-shadow-md relative z-10 leading-none\`}>{d.rank}</span>
      {d.tier && <span className={\`text-[8px] font-black mt-1 \${d.text} opacity-80 relative z-10 leading-none\`}>{d.tier}</span>}
    </div>
  );
}`;

  const newRankBadge = `function RankBadge({ mmr, inline = false }: { mmr: number, inline?: boolean }) {
  const d = getRankData(mmr);
  if (inline) return <span className="inline-flex items-center gap-1.5"><img src={d.icon} className="h-4 w-auto object-contain drop-shadow-md" alt="Rank" /><span className={\`\${d.text} font-black italic\`}>{d.rank} {d.tier}</span></span>;
  return (
    <div className={\`flex flex-col items-center justify-center px-4 py-2.5 rounded-xl bg-neutral-900/50 border \${d.border} shadow-lg shadow-black/50 overflow-hidden relative\`}>
      <img src={d.icon} className="h-8 w-auto object-contain mb-1 drop-shadow-lg relative z-10" alt="Rank" />
      <span className={\`text-[10px] uppercase font-black tracking-widest \${d.text} drop-shadow-md relative z-10 leading-none\`}>{d.rank}</span>
      {d.tier && <span className={\`text-[8px] font-black mt-0.5 \${d.text} opacity-80 relative z-10 leading-none\`}>{d.tier}</span>}
    </div>
  );
}`;
  if (smContent.includes(oldRankBadge)) {
    smContent = smContent.replace(oldRankBadge, newRankBadge);
  }
  fs.writeFileSync(smPath, smContent, 'utf8');
  console.log('Patched SquadManager.tsx');
  
  // ---------------------------------------------------------
  // 2. Teams page
  // ---------------------------------------------------------
  const teamPath = 'src/app/[locale]/teams/[id]/page.tsx';
  let tContent = fs.readFileSync(teamPath, 'utf8');
  tContent = replaceRankDataFunc(tContent);
  
  // replace trophy logic
  tContent = tContent.replace(
    /<Trophy size=\{16\} style=\{\{ color: rankData\.color \}\} className="mb-1" \/>/g,
    `<img src={rankData.icon} className="w-8 h-8 object-contain mb-1 drop-shadow-[0_2px_8px_rgba(255,255,255,0.15)]" alt="Rank" />`
  );
  
  // Also fix color on Teams banner
  // <p className="text-[12px] font-black uppercase tracking-widest" style={{ color: rankData.color }}>{rankData.label}</p>
  // Because the new getRankData uses 'text', 'color', 'label'. Wait. In teams page, old getRankData returns {label, color}. The new one returns {label, text, color...}. But `color` is now the gradient string for Tailwind.
  // Wait!!! If I replaced `color` with a tailwind "from-[] to-[]" string, then `style={{ color: rankData.color }}` will visually break!
  // Let's replace `style={{ color: rankData.color }}` with `className={\`text-[12px] font-black uppercase tracking-widest \${rankData.text}\`}`
  tContent = tContent.replace(
    `className="text-[12px] font-black uppercase tracking-widest" style={{ color: rankData.color }}>{rankData.label}</p>`,
    `className={\`text-[12px] font-black uppercase tracking-widest \${rankData.text}\`}>{rankData.label}</p>`
  );
  
  fs.writeFileSync(teamPath, tContent, 'utf8');
  console.log('Patched Teams Page');


  // ---------------------------------------------------------
  // 3. Match Interact page
  // ---------------------------------------------------------
  const matchPath = 'src/app/[locale]/interact/match/[id]/page.tsx';
  let mContent = fs.readFileSync(matchPath, 'utf8');
  mContent = replaceRankDataFunc(mContent);
  
  // Find spans and replace with inline-flex SVGs
  // Using Regex to safely capture all occurrences.
  // Pattern 1:
  // <span className="text-[9px] font-bold" style={{ color: r.color }}>{r.label}</span>
  mContent = mContent.replace(
    /<span className="text-\[9px\] font-bold" style=\{\{ color: r\.color \}\}>\{r\.label\}<\/span>/g,
    `<span className={\`inline-flex items-center gap-1 text-[9px] font-bold \${r.text}\`}><img src={r.icon} className="w-3.5 h-3.5 object-contain" alt="" />{r.label}</span>`
  );

  // Pattern 2:
  // <span className="text-[9px] font-bold" style={{ color: rank.color }}>{rank.label}</span>
  mContent = mContent.replace(
    /<span className="text-\[9px\] font-bold" style=\{\{ color: rank\.color \}\}>\{rank\.label\}<\/span>/g,
    `<span className={\`inline-flex items-center gap-1 text-[9px] font-bold \${rank.text}\`}><img src={rank.icon} className="w-3.5 h-3.5 object-contain" alt="" />{rank.label}</span>`
  );

  // Pattern 3:
  // <div className="text-[10px] font-bold" style={{ color: rank.color }}>{rank.label}</div>
  mContent = mContent.replace(
    /<div className="text-\[10px\] font-bold" style=\{\{ color: rank\.color \}\}>\{rank\.label\}<\/div>/g,
    `<div className={\`flex items-center justify-center gap-1 text-[10px] font-bold \${rank.text}\`}><img src={rank.icon} className="w-3.5 h-3.5 object-contain" alt="" />{rank.label}</div>`
  );

  fs.writeFileSync(matchPath, mContent, 'utf8');
  console.log('Patched Match Page');


} catch (error) {
  console.log('Script error:', error);
}
