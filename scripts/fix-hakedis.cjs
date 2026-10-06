const fs = require('fs');
let txt = fs.readFileSync('docs/PILOT_V1_CONTRACT.md', 'utf8');
txt = txt.replace('payment/hakedix status', 'payment/hakediş status');
fs.writeFileSync('docs/PILOT_V1_CONTRACT.md', txt, 'utf8');
