const fs = require('fs');
let content = fs.readFileSync('src/DemoApp.tsx', 'utf8');

content = content.replace(/\[data\.projects, role\]/g, '[data.projects, currentUser.role]');
content = content.replace(/\[data\.questions, role, visibleProjects\]/g, '[data.questions, currentUser.role, visibleProjects]');
content = content.replace(/\[data\.authors, role\]/g, '[data.authors, currentUser.role]');

fs.writeFileSync('src/DemoApp.tsx', content, 'utf8');
