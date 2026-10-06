const fs = require('fs');
const glob = require('glob'); // Note: we might not have glob. Let's just use a list.

const files = [
  'api/v1/_lib/current-user.ts',
  'api/v1/_lib/question-access.ts',
  'api/v1/_lib/question-dto.ts',
  'api/v1/questions/index.ts',
  'api/v1/questions/[id].ts',
  'api/v1/questions/[id]/workflow.ts',
  'tests/question-api.test.ts',
  'tests/question-handlers.test.ts',
  'prisma/schema.prisma',
  'prisma/seed.ts'
];

let bomCount = 0;
for (const f of files) {
  if (fs.existsSync(f)) {
    let buf = fs.readFileSync(f);
    if (buf.length >= 3 && buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) {
      console.log('BOM found in ' + f);
      bomCount++;
      fs.writeFileSync(f, buf.slice(3));
    }
  }
}
console.log('BOM count stripped: ' + bomCount);
