const https = require('https');
https.get('https://react.dev/errors/310', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const pMatches = data.match(/<p[^>]*>([\s\S]*?)<\/p>/g);
    if(pMatches && pMatches.length > 0) {
      console.log(pMatches.map(p => p.replace(/<[^>]+>/g, '')).join('\n'));
    }
  });
});
