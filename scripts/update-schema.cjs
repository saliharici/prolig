const fs = require('fs');
let schema = fs.readFileSync('prisma/schema.prisma', 'utf8');

// Add BOLGE_KOORDINATORU to RoleCode enum
if (!schema.includes('BOLGE_KOORDINATORU')) {
  schema = schema.replace(
    /enum RoleCode \{\n  GENEL_KOORDINATOR\n/,
    "enum RoleCode {\n  GENEL_KOORDINATOR\n  BOLGE_KOORDINATORU\n"
  );
}

// Add assignedRegion to User model
if (!schema.includes('assignedRegion')) {
  schema = schema.replace(
    /provinceId   Int\?/,
    "assignedRegion String?   // Bölge Koordinatörünün sorumlu olduğu bölge (örn: 'Marmara')\n  provinceId   Int?"
  );
}

fs.writeFileSync('prisma/schema.prisma', schema, 'utf8');
