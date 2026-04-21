const fs = require('fs');

try {
  let c = fs.readFileSync('prisma/schema.prisma', 'utf8');

  if (!c.includes('model TeamAnnouncement {')) {
    // 1. Add to Player model
    c = c.replace(
      '  chatMessages   MatchChatMessage[] @relation("PlayerChatMessages")\n\n  @@map("players")',
      '  chatMessages   MatchChatMessage[] @relation("PlayerChatMessages")\n  teamAnnouncements TeamAnnouncement[]\n\n  @@map("players")'
    );

    // 2. Add to Team model and insert TeamAnnouncement model
    c = c.replace(
      '// TEAM & CHALLENGE SYSTEM\n// ─────────────────────────────────────────────────────────────────────────────\n\nmodel Team {',
      `// TEAM & CHALLENGE SYSTEM
// ─────────────────────────────────────────────────────────────────────────────

model TeamAnnouncement {
  id        String   @id @default(cuid())
  teamId    String
  authorId  String
  title     String
  content   String   @db.Text
  createdAt DateTime @default(now())

  team      Team     @relation(fields: [teamId], references: [id], onDelete: Cascade)
  author    Player   @relation(fields: [authorId], references: [id], onDelete: Cascade)

  @@map("team_announcements")
}

model Team {`
    );

    c = c.replace(
      '  disputes            ChallengeDispute[]\n\n  isSubscribed Boolean @default(false)',
      '  disputes            ChallengeDispute[]\n  announcements       TeamAnnouncement[]\n\n  isSubscribed Boolean @default(false)'
    );

    fs.writeFileSync('prisma/schema.prisma', c, 'utf8');
    console.log('Successfully patched schema.prisma');
  } else {
    console.log('Schema already contains TeamAnnouncement');
  }
} catch (e) {
  console.error(e);
}
