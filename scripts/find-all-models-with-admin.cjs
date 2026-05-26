const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
const schema = fs.readFileSync(schemaPath, 'utf8');

const lines = schema.split('\n');
console.log('Searching schema.prisma for "admin" or "Admin"...');
lines.forEach((line, index) => {
  if (line.toLowerCase().includes('admin') || line.toLowerCase().includes('super')) {
    console.log(`${index + 1}: ${line.trim()}`);
  }
});
