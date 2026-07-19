const fs = require('fs');
const data = JSON.parse(fs.readFileSync('messages/en.json', 'utf8'));
console.log('Keys in messages/en.json:', Object.keys(data));
// If there is an 'Interact' or 'Match' section, log its keys
if (data.Interact) {
  console.log('Interact keys:', Object.keys(data.Interact));
}
if (data.Match) {
  console.log('Match keys:', Object.keys(data.Match));
}
