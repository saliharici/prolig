import "dotenv/config";
import { defineConfig } from "prisma/config";
import { assertRelease03DbEnvironment } from "./server/release03-db-policy.js";

// No Prisma CLI/build step may read migration credentials on an unapproved Preview.
assertRelease03DbEnvironment();

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DIRECT_URL ?? "",
  },
});
