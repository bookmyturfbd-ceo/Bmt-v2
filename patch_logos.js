const fs = require('fs');

try {
  const pageFile = 'src/app/[locale]/interact/page.tsx';
  let pageContent = fs.readFileSync(pageFile, 'utf8');

  // 1. Re-declare getRankData to inject SVG paths
  const oldRankData = `function getRankData(mmr: number) {
  if (mmr <= 699)  return { label: 'Bronze III',   color: '#cd7f32', glow: '165,80,0', min: 0, next: 700, icon: '🥉' };
  if (mmr <= 799)  return { label: 'Bronze II',    color: '#cd7f32', glow: '165,80,0', min: 700, next: 800, icon: '🥉' };
  if (mmr <= 899)  return { label: 'Bronze I',     color: '#cd7f32', glow: '165,80,0', min: 800, next: 900, icon: '🥉' };
  if (mmr <= 999)  return { label: 'Silver III',   color: '#c0c0c0', glow: '180,180,180', min: 900, next: 1000, icon: '🥈' };
  if (mmr <= 1099) return { label: 'Silver II',    color: '#c0c0c0', glow: '180,180,180', min: 1000, next: 1100, icon: '🥈' };
  if (mmr <= 1199) return { label: 'Silver I',     color: '#c0c0c0', glow: '180,180,180', min: 1100, next: 1200, icon: '🥈' };
  if (mmr <= 1299) return { label: 'Gold III',     color: '#ffd700', glow: '200,160,0', min: 1200, next: 1300, icon: '🥇' };
  if (mmr <= 1399) return { label: 'Gold II',      color: '#ffd700', glow: '200,160,0', min: 1300, next: 1400, icon: '🥇' };
  if (mmr <= 1499) return { label: 'Gold I',       color: '#ffd700', glow: '200,160,0', min: 1400, next: 1500, icon: '🥇' };
  if (mmr <= 1599) return { label: 'Platinum III', color: '#00e5ff', glow: '0,200,220', min: 1500, next: 1600, icon: '💎' };
  if (mmr <= 1699) return { label: 'Platinum II',  color: '#00e5ff', glow: '0,200,220', min: 1600, next: 1700, icon: '💎' };
  if (mmr <= 1799) return { label: 'Platinum I',   color: '#00e5ff', glow: '0,200,220', min: 1700, next: 1800, icon: '💎' };
  return { label: 'BMT Legend', color: '#ff00ff', glow: '200,0,200', min: 1800, next: 2000, icon: '👑' };
}`;

  const newRankData = `function getRankData(mmr: number) {
  if (mmr <= 699)  return { label: 'Bronze III',   color: '#cd7f32', glow: '165,80,0', min: 0, next: 700, icon: '/ranks/Bronze.svg' };
  if (mmr <= 799)  return { label: 'Bronze II',    color: '#cd7f32', glow: '165,80,0', min: 700, next: 800, icon: '/ranks/Bronze.svg' };
  if (mmr <= 899)  return { label: 'Bronze I',     color: '#cd7f32', glow: '165,80,0', min: 800, next: 900, icon: '/ranks/Bronze.svg' };
  if (mmr <= 999)  return { label: 'Silver III',   color: '#c0c0c0', glow: '180,180,180', min: 900, next: 1000, icon: '/ranks/Silver.svg' };
  if (mmr <= 1099) return { label: 'Silver II',    color: '#c0c0c0', glow: '180,180,180', min: 1000, next: 1100, icon: '/ranks/Silver.svg' };
  if (mmr <= 1199) return { label: 'Silver I',     color: '#c0c0c0', glow: '180,180,180', min: 1100, next: 1200, icon: '/ranks/Silver.svg' };
  if (mmr <= 1299) return { label: 'Gold III',     color: '#ffd700', glow: '200,160,0', min: 1200, next: 1300, icon: '/ranks/Gold.svg' };
  if (mmr <= 1399) return { label: 'Gold II',      color: '#ffd700', glow: '200,160,0', min: 1300, next: 1400, icon: '/ranks/Gold.svg' };
  if (mmr <= 1499) return { label: 'Gold I',       color: '#ffd700', glow: '200,160,0', min: 1400, next: 1500, icon: '/ranks/Gold.svg' };
  if (mmr <= 1599) return { label: 'Platinum III', color: '#00e5ff', glow: '0,200,220', min: 1500, next: 1600, icon: '/ranks/Platinum.svg' };
  if (mmr <= 1699) return { label: 'Platinum II',  color: '#00e5ff', glow: '0,200,220', min: 1600, next: 1700, icon: '/ranks/Platinum.svg' };
  if (mmr <= 1799) return { label: 'Platinum I',   color: '#00e5ff', glow: '0,200,220', min: 1700, next: 1800, icon: '/ranks/Platinum.svg' };
  return { label: 'BMT Legend', color: '#ff00ff', glow: '200,0,200', min: 1800, next: 2000, icon: '/ranks/Legend.svg' };
}`;

  if (pageContent.includes(oldRankData)) {
    pageContent = pageContent.replace(oldRankData, newRankData);
    console.log('Updated getRankData with SVG paths.');
  }

  // 2. Change the render in the MMR Popup from text node to <img>
  const oldIconSpan = `<span className="text-2xl drop-shadow-md">{dynRank.icon}</span>`;
  const newIconImg = `<img src={dynRank.icon} className="h-10 w-auto object-contain drop-shadow-[0_4px_12px_rgba(255,255,255,0.15)]" alt="Rank Icon" />`;

  if (pageContent.includes(oldIconSpan)) {
    pageContent = pageContent.replace(oldIconSpan, newIconImg);
    console.log('Updated Popup to render SVG img.');
  }

  // 3. To go the extra mile, we'll swap out the Trophy icon for Your Listed Teams & Challengeable Teams view!
  const regexTrophy = /<Trophy size=\{10\} \/>/g;
  const newTrophy = `<img src={rank.icon} className="w-3.5 h-3.5 object-contain" alt="Rank" />`;
  if (pageContent.match(regexTrophy)) {
    pageContent = pageContent.replace(regexTrophy, newTrophy);
    console.log('Updated Trophy icons in Team lists to use SVG icons.');
  }

  fs.writeFileSync(pageFile, pageContent, 'utf8');
} catch (error) {
  console.log('Script error:', error);
}
