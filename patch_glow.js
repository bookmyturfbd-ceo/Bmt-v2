const fs = require('fs');

function fixGlows(content) {
  let c = content;
  c = c.replace(/icon: '\/ranks\/Bronze\.svg'/g, "glow: '165,80,0', icon: '/ranks/Bronze.svg'");
  c = c.replace(/icon: '\/ranks\/Silver\.svg'/g, "glow: '180,180,180', icon: '/ranks/Silver.svg'");
  c = c.replace(/icon: '\/ranks\/Gold\.svg'/g, "glow: '200,160,0', icon: '/ranks/Gold.svg'");
  c = c.replace(/icon: '\/ranks\/Platinum\.svg'/g, "glow: '0,200,220', icon: '/ranks/Platinum.svg'");
  c = c.replace(/icon: '\/ranks\/Legend\.svg'/g, "glow: '200,0,200', icon: '/ranks/Legend.svg'");
  return c;
}

try {
  ['src/components/teams/SquadManager.tsx', 'src/app/[locale]/teams/[id]/page.tsx', 'src/app/[locale]/interact/match/[id]/page.tsx'].forEach(f => {
    let c = fs.readFileSync(f, 'utf8');
    c = fixGlows(c);
    fs.writeFileSync(f, c, 'utf8');
  });
  console.log('Fixed glows');
} catch (e) {
  console.error(e);
}
