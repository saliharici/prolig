const fs = require('fs');

let idTs = fs.readFileSync('api/v1/questions/[id].ts', 'utf8');
idTs = idTs.replace(/..\/..\/_lib\//g, '../_lib/');
fs.writeFileSync('api/v1/questions/[id].ts', idTs, 'utf8');

let workflowTs = fs.readFileSync('api/v1/questions/[id]/workflow.ts', 'utf8');
workflowTs = workflowTs.replace(/..\/..\/..\/_lib\//g, '../../_lib/');
fs.writeFileSync('api/v1/questions/[id]/workflow.ts', workflowTs, 'utf8');
