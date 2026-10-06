const crypto = require('crypto');
const fs = require('fs');
if (!fs.existsSync('.local')) {
  fs.mkdirSync('.local');
}
if (!fs.existsSync('.local/prolig-pilot-credentials.env')) {
  const passwords = [
    'GENEL_KOORDINATOR',
    'BOLGE_KOORDINATORU',
    'IL_KOORDINATORU',
    'EDITOR',
    'YAZAR',
    'MUHASEBE'
  ].map(role => `PILOT_${role}_PASSWORD=${crypto.randomBytes(12).toString('base64').replace(/[^a-zA-Z0-9]/g, 'a')}`).join('\n');
  fs.writeFileSync('.local/prolig-pilot-credentials.env', passwords, 'utf8');
}
