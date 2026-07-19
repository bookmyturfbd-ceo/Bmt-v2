const fs = require('fs');
const content = fs.readFileSync('src/app/[locale]/interact/page.tsx', 'utf8');
const lines = content.split('\n');
console.log('Total lines:', lines.length);
let tCount = 0;
lines.forEach((line, i) => {
  if (line.includes('t(') || line.includes('useTranslations') || line.includes('translations') || line.includes('messages')) {
    console.log(`Line ${i + 1}: ${line.trim()}`);
    tCount++;
  }
});
console.log('Total translation references found:', tCount);
