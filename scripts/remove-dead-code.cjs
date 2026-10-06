const fs = require('fs');

let accessCode = fs.readFileSync('api/v1/_lib/question-access.ts', 'utf8');
accessCode = accessCode.replace(/export function canWorkflowSubmit[\s\S]*?}\n\n/g, '');
fs.writeFileSync('api/v1/_lib/question-access.ts', accessCode, 'utf8');

let testCode = fs.readFileSync('tests/question-api.test.ts', 'utf8');
testCode = testCode.replace(/, canWorkflowSubmit/g, '');
testCode = testCode.replace(/  it\('YAZAR can submit TASLAK or REVIZYON'[\s\S]*?}\);\n\n/g, '');
fs.writeFileSync('tests/question-api.test.ts', testCode, 'utf8');
