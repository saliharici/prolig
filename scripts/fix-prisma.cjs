const fs = require('fs');
let schema = fs.readFileSync('prisma/schema.prisma', 'utf8');

// Ensure User has authorProfile
if (!schema.includes('authorProfile AuthorProfile?')) {
    schema = schema.replace(/status\s+String\s+@default\("Aktif"\)/, 'status       String        @default("Aktif")\n  authorProfile AuthorProfile?');
}

// Remove payments, questions from AuthorProfile
schema = schema.replace(/payments\s+Payment\[\]\n/g, '');
schema = schema.replace(/questions\s+Question\[\]\n/g, '');

fs.writeFileSync('prisma/schema.prisma', schema, 'utf8');
