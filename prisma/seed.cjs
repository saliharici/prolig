const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const fs = require('fs');

const prisma = new PrismaClient();

async function main() {
  const envContent = fs.readFileSync('.local/prolig-pilot-credentials.env', 'utf8');
  const getPass = (role) => {
    const match = envContent.match(new RegExp(`PILOT_${role}_PASSWORD=(.*)`));
    return match ? match[1] : 'fallback';
  };

  const rolesToSeed = [
    { code: 'GENEL_KOORDINATOR', name: 'Genel Koordinatör' },
    { code: 'BOLGE_KOORDINATORU', name: 'Bölge Koordinatörü' },
    { code: 'IL_KOORDINATORU', name: 'İl Koordinatörü' },
    { code: 'EDITOR', name: 'Editör' },
    { code: 'YAZAR', name: 'Yazar' },
    { code: 'MUHASEBE', name: 'Muhasebe' }
  ];

  for (const r of rolesToSeed) {
    await prisma.role.upsert({
      where: { code: r.code },
      update: {},
      create: r
    });
  }

  const marmara = await prisma.province.upsert({
    where: { code: '34' },
    update: {},
    create: { code: '34', name: 'İstanbul', region: 'Marmara' }
  });

  const branch = await prisma.branch.upsert({
    where: { name: 'Matematik' },
    update: {},
    create: { name: 'Matematik', description: 'Matematik Branşı' }
  });

  const roles = await prisma.role.findMany();
  const getRoleId = (code) => roles.find(r => r.code === code).id;

  const users = [
    { email: 'pilot.genel@prolig.local', role: 'GENEL_KOORDINATOR' },
    { email: 'pilot.bolge@prolig.local', role: 'BOLGE_KOORDINATORU' },
    { email: 'pilot.il@prolig.local', role: 'IL_KOORDINATORU' },
    { email: 'pilot.editor@prolig.local', role: 'EDITOR' },
    { email: 'pilot.yazar@prolig.local', role: 'YAZAR' },
    { email: 'pilot.muhasebe@prolig.local', role: 'MUHASEBE' }
  ];

  for (const u of users) {
    const pass = getPass(u.role);
    const hash = await bcrypt.hash(pass, 10);
    
    let userCreate = {
      email: u.email,
      username: u.email.split('@')[0],
      passwordHash: hash,
      firstName: 'Pilot',
      lastName: u.role,
      roleId: getRoleId(u.role),
      status: 'Aktif'
    };

    if (u.role === 'BOLGE_KOORDINATORU') {
      userCreate.assignedRegion = 'Marmara';
    } else if (u.role === 'IL_KOORDINATORU') {
      userCreate.provinceId = marmara.id;
    }

    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { passwordHash: hash },
      create: userCreate
    });

    if (u.role === 'YAZAR') {
      await prisma.authorProfile.upsert({
        where: { userId: user.id },
        update: {},
        create: {
          userId: user.id,
          branchId: branch.id,
          provinceId: marmara.id,
          experience: 5
        }
      });
    }
  }

  console.log("Seed successful");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
