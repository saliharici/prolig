const fs = require('fs');
const envFile = fs.readFileSync('.env.development.local', 'utf8');

const lines = envFile.split('\n');
for (let line of lines) {
    if (line.trim() && !line.startsWith('#')) {
        const parts = line.split('=');
        const name = parts[0];
        let val = parts.slice(1).join('=');
        // hide password
        val = val.replace(/:([^:@]+)@/, ':***@');
        console.log(`${name} = ${val}`);
    }
}
