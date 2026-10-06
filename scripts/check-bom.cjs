const fs = require('fs');

function writeWithoutBOM(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    if (content.charCodeAt(0) === 0xFEFF) {
        content = content.slice(1);
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Removed BOM from', filePath);
    }
}

writeWithoutBOM('src/DemoApp.tsx');
