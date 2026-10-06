const fs = require('fs');
let content = fs.readFileSync('src/DemoApp.tsx', 'utf8');

content = content.replace(/\[data\.activities, role, visibleProjects\]/, '[data.activities, currentUser.role, visibleProjects]');

// Also fix Type '"SUPER_ADMIN"' is not assignable to type 'Role'.
// AuthUser uses RoleCode, DemoApp uses Role. We should cast currentUser.role as Role.
content = content.replace(/currentUser\.role/g, '(currentUser.role as Role)');

fs.writeFileSync('src/DemoApp.tsx', content, 'utf8');
console.log('Fixed DemoApp role usages.');
