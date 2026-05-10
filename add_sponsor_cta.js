const fs = require('fs');

let schema = fs.readFileSync('prisma/schema.prisma', 'utf8');

if (!schema.includes('ctaText    String?')) {
  schema = schema.replace(
    'ctaLink    String?',
    'ctaText    String?\n  ctaLink    String?'
  );
  fs.writeFileSync('prisma/schema.prisma', schema, 'utf8');
  console.log('Added ctaText to Sponsor model!');
} else {
  console.log('ctaText already exists!');
}
