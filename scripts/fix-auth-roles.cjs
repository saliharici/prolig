const fs = require('fs');

['api/v1/auth/login.ts', 'api/v1/auth/me.ts'].forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/where: { (.*) }/g, 'where: {  }, include: { role: true }');
    content = content.replace(/role: user\.roleCode,/g, 'role: user.role.code,');
    fs.writeFileSync(file, content, 'utf8');
});
