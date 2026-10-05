const fs = require('fs');
let demo = fs.readFileSync('src/DemoApp.tsx', 'utf8');

demo = demo.replace("title: questionTitle.trim(), subject: project.subject, grade: project.grade, projectId: project.id,", "title: questionTitle.trim(), subject: project.subject, grade: project.grade, level: project.level, projectId: project.id,");

fs.writeFileSync('src/DemoApp.tsx', demo, 'utf8');
