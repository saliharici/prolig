# Pilot V1 Contract — Pro-Lig

This document defines the strict workflow, data scope, and API boundaries required for the Pro-Lig Pilot V1 release.

## 1. Geographic & Data Scope Rules
Every backend API endpoint must automatically enforce the logged-in user's data scope:

- **GENEL_KOORDINATOR:** Authorized global scope (can view/act on all regions, projects, and questions).
- **BOLGE_KOORDINATORU:** Bound to an `assignedRegion` (e.g., Marmara). Can only read data belonging to provinces within this region. *(Note: For Pilot V1, Bölge Koordinatörü may remain a read-oriented role unless later requirements explicitly grant assignment/management actions).*
- **IL_KOORDINATORU:** Bound to an `assignedProvince`. Can only read data explicitly linked to their province. *(Note: For Pilot V1, İl Koordinatörü may remain a read-oriented role unless later requirements explicitly grant assignment/management actions).*
- **EDITOR:** Bound to an assigned editorial scope (e.g., subject or grade level).
- **YAZAR:** Bound to their own content (questions they created) and projects explicitly assigned to them.
- **MUHASEBE:** Bound to permitted financial contexts. Read-only access to projects/users, write access only to payment/hakediş status.

## 2. Question Workflow (State Machine)
The lifecycle of a `Question` is strictly controlled by the backend state machine.

### States:
1. `Taslak`
2. `İncelemede`
3. `Revizyon`
4. `Onaylandı`
5. `Reddedildi`

### Transitions & Rules:
- **Create:** Only `YAZAR` can create a question (Status: `Taslak`).
- **Submit for Review (`Taslak` / `Revizyon` -> `İncelemede`):** Only the `YAZAR` who owns the question can submit it.
- **Review Actions (`İncelemede` -> `Revizyon` | `Onaylandı` | `Reddedildi`):** Only `EDITOR` or `GENEL_KOORDINATOR` can perform these actions.
- **Edit Lock:** A `Question` can ONLY be edited by the `YAZAR` when its status is `Taslak` or `Revizyon`. Once `Onaylandı`, `Reddedildi`, or `İncelemede`, it becomes **immutable** to the author.
- **Administrative Override:** `GENEL_KOORDINATOR` may force-change a status or re-assign an author if required, logged in the Audit Trail.

## 3. API Contract (v1)
All API endpoints will be served from `/api/v1/` and will require Secure Session Cookie Authentication. 
The browser must NOT receive the authentication JWT/token through JSON for storage in localStorage, sessionStorage, or frontend state.

### Public Endpoints
- `POST /api/v1/auth/login` (email, password) -> Sets `HttpOnly` session cookie `prolig_session`, returns `{ user }`
- `GET /api/v1/health`

### Authenticated Endpoints
- `GET /api/v1/auth/me` -> returns `{ user, roles, permissions }`
- `POST /api/v1/auth/logout` -> expires session cookie
- `GET /api/v1/authors` (Returns scoped list based on requester's role)
- `GET /api/v1/authors/:id`
- `GET /api/v1/projects` (Scoped by role/province)
- `GET /api/v1/projects/:id`
- `GET /api/v1/questions` (Scoped by role/author/project)
- `POST /api/v1/questions` (Create draft)
- `PATCH /api/v1/questions/:id` (Update content, only if Taslak/Revizyon)
- `POST /api/v1/questions/:id/workflow` (Submit, Approve, Reject, Request Revision - requires payload `{ action, note }`)
- `GET /api/v1/payments` (Scoped to MUHASEBE / GENEL_KOORDINATOR)
- `POST /api/v1/payments/:id/approve`
- `POST /api/v1/payments/:id/pay`
- `GET /api/v1/audit` (Append-only log read endpoint, scoped to GENEL_KOORDINATOR)

## 4. UI Protection
During Phase 1 and implementation, the current visual layout (Tailwind, `demo.css`, Cards, Layouts) must be completely preserved. 
No redesigns are permitted during the backend integration phases.

