const fs = require('fs');
let schema = fs.readFileSync('prisma/schema.prisma', 'utf8');

const sponsorsModels = `

// ─────────────────────────────────────────────────────────────────────────────
// SPONSORS — Frontend Banner Layer
// ─────────────────────────────────────────────────────────────────────────────

model Sponsor {
  id         String   @id @default(cuid())
  imageUrl   String
  ctaLink    String?
  order      Int      @default(0)
  active     Boolean  @default(true)
  createdAt  DateTime @default(now())

  @@map("sponsors")
}

model SponsorSettings {
  id         String   @id @default("singleton")
  autoSlide  Boolean  @default(true)
  intervalMs Int      @default(3500)
  updatedAt  DateTime @updatedAt

  @@map("sponsor_settings")
}
`;

if (!schema.includes('model Sponsor {')) {
  schema = schema.trimEnd() + '\n' + sponsorsModels;
  fs.writeFileSync('prisma/schema.prisma', schema, 'utf8');
  console.log('Schema updated! Total lines:', schema.split('\\n').length);
} else {
  console.log('Sponsors models already exist in schema');
}
