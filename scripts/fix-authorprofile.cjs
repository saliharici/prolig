const fs = require('fs');

let idTs = fs.readFileSync('api/v1/questions/[id].ts', 'utf8');
idTs = idTs.replace(
  '  if (user.role.code !== \'YAZAR\') {\n    return res.status(403).json({ error: \'Only YAZAR can edit\' });\n  }',
  '  if (user.role.code !== \'YAZAR\') {\n    return res.status(403).json({ error: \'Only YAZAR can edit\' });\n  }\n\n  if (!user.AuthorProfile) {\n    return res.status(403).json({ error: \'AuthorProfile required\' });\n  }'
);
fs.writeFileSync('api/v1/questions/[id].ts', idTs, 'utf8');
