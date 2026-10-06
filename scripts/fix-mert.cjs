const fs = require('fs');
let content = fs.readFileSync('src/DemoApp.tsx', 'utf8');

// replace Merhaba, Mert with currentUser.fullName.split(' ')[0]
content = content.replace(/Merhaba, Mert/g, "Merhaba, {currentUser.fullName.split(' ')[0]}");

fs.writeFileSync('src/DemoApp.tsx', content, 'utf8');
console.log('Fixed Mert');
