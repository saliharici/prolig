const fs = require('fs');
let schema = fs.readFileSync('prisma/schema.prisma', 'utf8');
if (!schema.includes('payments Payment[]')) {
    schema = schema.replace(/questions Question\[\]/, 'questions Question[]\n  payments Payment[]');
}
fs.writeFileSync('prisma/schema.prisma', schema, 'utf8');
