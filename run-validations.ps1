$ErrorActionPreference = "Stop"
npx prisma validate
npx prisma generate
npx tsc --noEmit -p api/tsconfig.json
npm run lint:ui
npm run lint:api
npm run build
npm run test:run
