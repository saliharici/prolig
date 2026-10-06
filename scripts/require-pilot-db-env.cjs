require('dotenv/config');

if (!process.env.DATABASE_URL) {
  console.error("ERROR: DATABASE_URL is required to run Pilot DB integration tests.");
  process.exit(1);
}

if (process.env.PROLIG_PILOT_DB_CONFIRMED !== "true") {
  console.error("ERROR: PROLIG_PILOT_DB_CONFIRMED=true is required to run Pilot DB integration tests.");
  process.exit(1);
}
