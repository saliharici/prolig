const fs = require('fs');

// 1. Update model.ts
let model = fs.readFileSync('src/demo/model.ts', 'utf8');

// Update interfaces
model = model.replace(/activeProjects: number;/, 'activeProjects: number;\n  levels: string[];');
model = model.replace(/grade: string;/g, 'grade: string;\n  level: string;');

// Add levels to authors
model = model.replace(/status: 'Aktif' },/g, "status: 'Aktif', levels: ['Ortaokul'] },");
model = model.replace(/status: 'Davet edildi' },/g, "status: 'Davet edildi', levels: ['Lise'] },");

// Fix some specific authors to have multiple or different
model = model.replace(/Ortaokul/, 'Ortaokul\', \'Lise'); // first match
model = model.replace(/Ortaokul/, 'İlkokul\', \'Ortaokul'); // second match
model = model.replace(/Ortaokul/, 'Mezun'); // third match

// Add level to projects
model = model.replace(/grade: '8. Sınıf'/g, "grade: '8. Sınıf', level: 'Ortaokul'");
model = model.replace(/grade: '7. Sınıf'/g, "grade: '7. Sınıf', level: 'Ortaokul'");
model = model.replace(/grade: '6. Sınıf'/g, "grade: '6. Sınıf', level: 'Ortaokul'");
model = model.replace(/grade: '9. Sınıf'/g, "grade: '9. Sınıf', level: 'Lise'");
model = model.replace(/grade: '10. Sınıf'/g, "grade: '10. Sınıf', level: 'Lise'");

// Ensure we didn't miss projects/questions that didn't match the regex exactly
model = model.replace(/grade: '([^']+)', deadline/g, "grade: '\', level: 'Ortaokul', deadline");
model = model.replace(/grade: '([^']+)', projectId/g, "grade: '\', level: 'Ortaokul', projectId");

// Section types
model = model.replace(/type Section = 'overview' \| 'questions'/g, "type Section = 'overview' | 'grades' | 'questions'");
model = model.replace(/projects: 'Projeler',/g, "grades: 'Eğitim Kademeleri',\n  projects: 'Projeler',");

// Permissions
model = model.replace(/overview', 'questions'/g, "overview', 'grades', 'questions'");

fs.writeFileSync('src/demo/model.ts', model, 'utf8');
console.log('model.ts updated.');
