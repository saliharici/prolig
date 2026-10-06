const fs = require('fs');
let code = fs.readFileSync('api/v1/_lib/question-access.ts', 'utf8');

code = code.replace(
  '        province: {\n          region: user.assignedRegion\n        }',
  '        AuthorProfile: {\n          province: {\n            region: user.assignedRegion\n          }\n        }'
);

code = code.replace(
  '        provinceId: user.provinceId',
  '        AuthorProfile: {\n          provinceId: user.provinceId\n        }'
);

fs.writeFileSync('api/v1/_lib/question-access.ts', code, 'utf8');
