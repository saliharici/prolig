const fs = require('fs');

// update src/types.ts
let typesContent = fs.readFileSync('src/types.ts', 'utf8');
typesContent = typesContent.replace(/export type RoleCode =\s*\| 'SUPER_ADMIN'/, "export type RoleCode = \n  | 'SUPER_ADMIN'\n  | 'BOLGE_KOORDINATORU'");
fs.writeFileSync('src/types.ts', typesContent, 'utf8');

// Also DemoApp has some typescript errors.
// "Cannot find name 'role'. Did you mean 'roles'?"
// We missed some `role` variables in DemoApp.tsx.
