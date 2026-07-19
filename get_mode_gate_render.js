const fs = require('fs');
const content = fs.readFileSync('src/app/[locale]/matches/[matchId]/live/page.tsx', 'utf8');

const idx = content.indexOf('showModeGate');
if (idx !== -1) {
  // Let's find where it is rendered in return statement
  let searchIdx = content.indexOf('showModeGate', idx + 100);
  while (searchIdx !== -1) {
    if (content.substring(searchIdx - 50, searchIdx).includes('{') || content.substring(searchIdx - 50, searchIdx).includes('&&')) {
      console.log(content.substring(searchIdx - 200, searchIdx + 1200));
      break;
    }
    searchIdx = content.indexOf('showModeGate', searchIdx + 100);
  }
} else {
  console.log('Not found');
}
