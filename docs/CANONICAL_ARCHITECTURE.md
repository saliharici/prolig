# Canonical Architecture — Pro-Lig

## 1. Active Runtime (SSOT)
The authoritative frontend path is:
- `src/main.tsx` (Entry point)
- `src/DemoApp.tsx` (Active Application Shell & State)
- `src/demo/*` (Active Supporting Models & Components)
- `src/demo.css` (Active Styling)

## 2. Future Backend Runtime
**Canonical Choice:** Vercel Serverless Functions (`api/v1/*`)
**Reasoning:** Native, seamless integration with the existing Vercel deployment pipeline currently hosting the Vite SPA.
- All new API routes must be placed under `api/v1/`.
- `server.ts` and `server/*` are classified as **ARCHIVE**.
- `legacy/api/*` is classified as **REFERENCE**.

## 3. Database Access Strategy
**Canonical Choice:** Prisma (`prisma/schema.prisma`)
**Reasoning:** Provides static type safety, automated migrations, and schema validation.
- Raw `pg` business queries must be migrated to Prisma.
- `PrismaClient` will be instantiated globally for serverless environments.

## 4. Identity & Authorization Model
### User vs. Author Identity
- **User:** The authenticated identity (Login email/password, roles, system-wide settings).
- **AuthorProfile:** A 0..1 relationship attached to a `User`. Contains professional metadata (subject, active projects, etc.).
- Only `User`s with the `YAZAR` role require an `AuthorProfile`.
- Editors, Coordinators, and Accounting staff are just `User`s; they do not need an `AuthorProfile`.

### Role Single Source of Truth (SSOT)
The following roles are explicitly supported and strictly enforced:
- `GENEL_KOORDINATOR`
- `BOLGE_KOORDINATORU`
- `IL_KOORDINATORU`
- `EDITOR`
- `YAZAR`
- `MUHASEBE`

*Note: The `YONETICI` role currently in the Prisma enum is designated as **OBSOLETE/ARCHIVE** and will be migrated out.*

## 5. Archive Boundaries
To prevent architectural drift and AI hallucination, the following directories/files are explicitly excluded from the active production path:
- `src/App.tsx` (**REFERENCE**)
- `legacy/*` (**REFERENCE**)
- `temp_restore/*` (**ARCHIVE**)
- `server.ts` (**ARCHIVE**)

Do not import from or build upon these archived paths.
