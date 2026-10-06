const fs = require('fs');

let schema = fs.readFileSync('prisma/schema.prisma', 'utf8');

// Add passwordHash to User
if (!schema.includes('passwordHash')) {
    schema = schema.replace(
        /email\s+String\s+@unique/,
        "email        String        @unique\n  passwordHash String?"
    );
}

// Rename Author to AuthorProfile
schema = schema.replace(/model Author \{/g, 'model AuthorProfile {');
schema = schema.replace(/authors\s+Author\[\]/g, 'authorProfiles AuthorProfile[]');
schema = schema.replace(/author\s+Author\?/g, 'authorProfile AuthorProfile?');
schema = schema.replace(/author\s+Author /g, 'authorProfile AuthorProfile ');
schema = schema.replace(/assignedAuthor\s+Author\?/g, 'assignedAuthorProfile AuthorProfile?');

// Remove Author fields from AuthorProfile that belong to User
schema = schema.replace(/\s+firstName\s+String\n\s+lastName\s+String\n\s+email\s+String\s+@unique\n\s+phone\s+String\n/, '\n  userId Int @unique\n  user User @relation(fields: [userId], references: [id], onDelete: Cascade)\n');

// Add AuthorProfile back-relation to User
if (!schema.includes('authorProfile AuthorProfile?')) {
    schema = schema.replace(/status\s+String\s+@default\("Aktif"\)/, 'status       String        @default("Aktif")\n  authorProfile AuthorProfile?');
}

// Fix Question
schema = schema.replace(/authorId\s+Int\n\s+authorProfile\s+AuthorProfile\s+@relation\(fields: \[authorId\], references: \[id\]\)/g, 'authorUserId Int\n  authorUser   User @relation(fields: [authorUserId], references: [id])');
schema = schema.replace(/@@index\(\[authorId\]\)/g, '@@index([authorUserId])');

// Add questions to User
if (!schema.includes('questions Question[]')) {
    schema = schema.replace(/sentMessages\s+Message\[\]\s+@relation\("SentMessages"\)/, 'sentMessages     Message[]      @relation("SentMessages")\n  questions Question[]');
}

fs.writeFileSync('prisma/schema.prisma', schema, 'utf8');
console.log('Schema updated.');
