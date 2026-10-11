# System Architecture: Design-to-Elementor Platform

## 1. Overview

Design-to-Elementor is an AI-assisted conversion platform that allows users to submit design sources, configure Elementor output settings, trigger backend processing, review conversion diagnostics, and download or publish generated artifacts.

The platform is divided into the following layers:

- Frontend UI: Next.js + React + TypeScript + Tailwind CSS
- API Layer: REST API for authenticated user and workflow operations
- Business Logic / Orchestration: backend service that validates sources, manages queues, and orchestrates AI/IR/Elementor conversion steps
- Data Layer: relational database for users, projects, conversions, artifact metadata, and WordPress connections
- Storage Layer: private local filesystem managed by the backend API
- External Integrations: WordPress, storage buckets, AI providers, and optional source providers

This is a strict separation of concerns: the frontend is responsible for the user experience only. Conversion logic, validation, source analysis, security validation, AI orchestration, and publishing are handled by the backend.

---

## 2. High-Level Architecture

```text
┌─────────────────────────────────────────────────────────────────────┐
│                         Client / User Interface                       │
│  Next.js App Router (React + TypeScript + Tailwind)                 │
│  - Login / Register                                                  │
│  - Dashboard                                                         │
│  - Projects                                                          │
│  - Source Upload                                                     │
│  - Conversion Settings                                               │
│  - Diagnostics & Review                                              │
│  - Artifact Download / Publish                                        │
└───────────────────────────────┬─────────────────────────────────────┘
                                │ HTTPS / REST API
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Backend API Service                           │
│  Express / NestJS / FastAPI / custom API service                     │
│  - Auth service                                                      │
│  - Project lifecycle                                                 │
│  - Upload authorization & validation                                 │
│  - Conversion orchestration                                           │
│  - Artifact metadata management                                       │
│  - Diagnostics and status updates                                     │
│  - WordPress publish orchestration                                    │
└───────────────┬───────────────────────────────┬──────────────────────┘
                │                               │
                ▼                               ▼
      ┌─────────────────┐          ┌──────────────────────────────┐
      │ Relational DB   │          │ File / Object Storage        │
      │ PostgreSQL      │          │ - Uploaded files            │
      │ - users         │          │ - Generated artifacts       │
      │ - projects      │          │ - Logs / temporary payloads │
      │ - conversions   │          └──────────────────────────────┘
      │ - artifacts     │
      │ - wordpress sites│
      │ - audit logs    │
      └─────────────────┘
                │
                ▼
      ┌─────────────────────────────────────┐
      │ Background Workers / Job Queue     │
      │ - source validation                │
      │ - AI analysis                      │
      │ - IR processing                    │
      │ - Elementor compilation            │
      │ - diagnostics aggregation          │
      └─────────────────────────────────────┘
                │
                ▼
      ┌─────────────────────────────────────┐
      │ External Services                  │
      │ - WordPress site API               │
      │ - AI provider / LLM                │
      │ - Storage provider / CDN           │
      └─────────────────────────────────────┘
```

---

## 3. Core Components

### 3.1 Frontend (Next.js App)

The frontend is designed for user interaction only. It provides:

- Authentication pages: login, register, sign out flow
- Dashboard with overview cards, project summary, queue overview
- Project creation and listing
- Source-aware intake UI (`/projects/new`) with three source cards: a
  React/Next.js ZIP dropzone, a Figma file-JSON uploader (direct upload, parsed
  locally), and a Framer published-site URL analyzer. The selected source type is
  a single state that drives all input controls, validation, and the conversion
  reference.
- Conversion settings selection
- Monitoring of conversion stages and diagnostics
- Artifact review and export actions
- WordPress-connected site management when available

Files in the current frontend project are organized by feature and responsibility, for example:

- `app/` — routes and page entry points
- `components/` — reusable UI blocks and layout
- `features/` — auth, projects, uploads, conversions, artifact UI
- `lib/` — API client, schemas, utilities and error handling

### 3.2 API Layer

The backend exposes a versioned REST API, typically under `/api/v1`.

Responsibilities:

- authenticate users
- verify user permissions
- create and manage projects
- authorize uploads and validate file metadata
- start conversions and return job status
- query diagnostics and stage history
- expose artifact metadata and download URLs
- manage connected WordPress sites
- expose backend capability flags

The frontend integrates with backend endpoints through a centralized API client, instead of duplicating request logic across pages.

### 3.3 Backend Business Logic

This layer performs all trust-sensitive work:

- checking file validity and size limits
- verifying project ownership and authorization
- orchestrating conversion jobs
- polling or listening for status updates
- storing stage history and diagnostics
- processing generated outputs
- publishing to WordPress only after explicit user approval

This layer is not part of the frontend application.

### 3.4 Database

The database stores the system's canonical state.

Recommended database: PostgreSQL

Why PostgreSQL:

- strong relational modeling
- robust transactional guarantees
- easy JSONB support for flexible metadata
- mature support for authentication, auditing, and reporting

### 3.5 Storage

Recommended storage:

- Backend-managed local filesystem storage at the configured private storage root

Stored items:

- uploaded ZIP archives
- screenshots
- generated conversion ZIP packages
- temporary intermediary outputs
- logs or export payloads

### 3.6 Background Job System

Conversion work should happen asynchronously. The recommended pattern is:

- API creates a conversion record and enqueues a job
- worker processes the job in the background
- worker updates status, current stage, and diagnostics
- frontend polls or listens for updates

This decouples long-running processing from the request/response cycle and prevents timeouts.

---

## 4. Suggested Database Schema

### 4.1 Users

```sql
users (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
)
```

### 4.2 Projects

```sql
projects (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  source_type TEXT NOT NULL,
  target_platform TEXT NOT NULL,
  target_architecture TEXT,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
)
```

### 4.3 Files / Uploads

```sql
project_files (
  id UUID PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id),
  original_name TEXT NOT NULL,
  storage_key TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT NOT NULL,
  checksum TEXT,
  created_at TIMESTAMPTZ NOT NULL
)
```

### 4.4 Conversions

```sql
conversions (
  id UUID PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id),
  status TEXT NOT NULL,
  current_stage TEXT,
  source_type TEXT NOT NULL,
  target_platform TEXT NOT NULL,
  target_architecture TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
)
```

### 4.5 Conversion Diagnostics

```sql
conversion_diagnostics (
  id UUID PRIMARY KEY,
  conversion_id UUID NOT NULL REFERENCES conversions(id),
  severity TEXT NOT NULL,
  message TEXT NOT NULL,
  stage TEXT,
  created_at TIMESTAMPTZ NOT NULL
)
```

### 4.6 Artifacts

```sql
artifacts (
  id UUID PRIMARY KEY,
  conversion_id UUID NOT NULL REFERENCES conversions(id),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  storage_key TEXT NOT NULL,
  url TEXT,
  size_bytes BIGINT,
  created_at TIMESTAMPTZ NOT NULL
)
```

### 4.7 WordPress Sites

```sql
wordpress_sites (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  base_url TEXT NOT NULL,
  status TEXT NOT NULL,
  connected_at TIMESTAMPTZ NOT NULL,
  credentials_ref TEXT NULL,
  metadata JSONB
)
```

### 4.8 Audit / Actions

```sql
audit_logs (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  entity_type TEXT NOT NULL,
  entity_id UUID,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL
)
```

---

## 5. API Routes

The following route structure is expected for the platform and aligns with the frontend contract described in the README and implementation plan.

### 5.1 Authentication

```text
POST /api/v1/auth/login
POST /api/v1/auth/register
POST /api/v1/auth/logout
GET  /api/v1/me
```

Purpose:

- authenticate users
- return session or JWT token
- allow profile data retrieval

### 5.2 Project Management

```text
GET    /api/v1/projects
POST   /api/v1/projects
GET    /api/v1/projects/:projectId
PATCH  /api/v1/projects/:projectId
DELETE /api/v1/projects/:projectId
```

Purpose:

- list user projects
- create new project records
- rename/update project metadata
- delete when authorized

### 5.3 Uploads

```text
POST /api/v1/uploads/authorize
POST /api/v1/uploads/complete
GET  /api/v1/uploads/:uploadId
```

Purpose:

- validate file type and size server-side
- receive uploaded bytes through an authenticated backend endpoint; never receive filesystem paths
- confirm upload completion and store metadata

### 5.4 Conversions

```text
POST /api/v1/projects/:projectId/conversions
GET  /api/v1/conversions/:conversionId
POST /api/v1/conversions/:conversionId/retry
POST /api/v1/conversions/:conversionId/cancel
```

Purpose:

- start the conversion job
- fetch conversion status and current stage
- allow retry only when backend confirms it is permitted
- allow cancellation only when allowed

### 5.5 Diagnostics and History

```text
GET /api/v1/conversions/:conversionId/diagnostics
GET /api/v1/conversions/:conversionId/stages
```

Purpose:

- return warnings, errors, and informational events
- display stage history and conversion timeline

### 5.6 Artifacts

```text
GET  /api/v1/artifacts
GET  /api/v1/artifacts/:artifactId
GET  /api/v1/artifacts/:artifactId/download
```

Purpose:

- list generated outputs
- serve artifact metadata
- allow user download of the generated Elementor archive

### 5.7 WordPress Integration

```text
GET  /api/v1/wordpress-sites
POST /api/v1/wordpress-sites/connect
POST /api/v1/wordpress-sites/:siteId/publish
```

Purpose:

- list connected sites
- connect a WordPress destination
- publish generated output after explicit authorization

### 5.8 Capabilities

```text
GET /api/v1/capabilities
```

Purpose:

- return source intake availability, accepted formats, and upload limits
- report Elementor conversion as unavailable until the approved DIR/compiler exist
- require the normal authenticated API session

---

## 6. Authentication and Authorization Model

Recommended model:

- session-based auth or short-lived JWT tokens with secure HttpOnly cookies
- backend verifies user identity from every request
- project ownership and role checks enforced server-side
- frontend never trusts client-side permissions as a final guard

Roles:

- admin: full access to platform and connected sites
- editor: can create projects, run conversions, view artifacts
- viewer: read-only access to dashboards and project summaries

Security requirements:

- never expose database credentials
- never store secrets in `NEXT_PUBLIC_*`
- never pass API keys or WordPress creds to the frontend
- do not render untrusted HTML directly
- do not execute uploaded source code in browser
- sanitize all file names and user-supplied content

---

## 7. Data Flow

### 7.1 User Login Flow

1. User enters email/password in frontend
2. Frontend sends POST to `/api/v1/auth/login`
3. Backend validates credentials
4. Backend returns session token / cookie
5. Frontend stores auth state for subsequent requests

### 7.2 Project Creation Flow

1. User creates project from dashboard or project screen
2. Frontend sends project metadata to `/api/v1/projects`
3. Backend creates the project record and returns the project metadata
4. Project becomes available for source upload and conversion setup

### 7.3 Upload Flow

1. Frontend loads authenticated source capabilities and enables only React/Next.js ZIP
2. Browser checks the selected file extension and configured maximum for usability
3. Frontend creates the project with the strict name-only project schema
4. Frontend requests upload authorization, streams raw ZIP bytes, and completes upload inspection
5. Backend checks archive safety, React/Next.js manifest dependencies, and expected app source paths without executing uploaded code
6. Frontend reports the detected framework and explains that conversion is unavailable

### 7.4 Conversion Flow

1. The current UI reports the Elementor target as unavailable; it does not offer unsupported architecture or license settings
2. The API validates conversion settings and the ready upload, then returns `501 CONVERSION_PIPELINE_UNAVAILABLE`
3. No conversion job is created until the approved DIR schema and compiler exist

### 7.5 Artifact Review / Publish Flow

1. Backend generates ZIP or publishable asset
2. Artifact metadata is stored in the database
3. Frontend shows artifact summary and warnings
4. User may download artifact or publish to a connected WordPress site
5. WordPress publishing is done only when the backend confirms authorization and destination readiness

---

## 8. Recommended Technologies

### Frontend

- Next.js 14+
- React 18+
- TypeScript
- Tailwind CSS
- Lucide icons / accessible UI primitives

### Backend

- Node.js + NestJS / Express / or Fastify
- TypeScript
- Prisma or TypeORM for relational ORM
- BullMQ / Redis for job queue (recommended for async processing)

### Database

- PostgreSQL
- optional Redis for job queue and realtime coordination

### Storage

- a writable private filesystem shared by the API and worker

### External integrations

- WordPress REST API
- AI provider APIs
- email / audit provider, if needed

---

## 9. Recommended Local Development Setup

### 9.1 Required software

Install the following:

- Node.js LTS
- pnpm
- PostgreSQL
- Redis (for queue processing)
- no storage service or container runtime is required
- Git

### 9.2 Install dependencies

```bash
pnpm install
```

### 9.3 Environment variables

Frontend:

```env
NEXT_PUBLIC_APP_NAME="Design-to-Elementor"
NEXT_PUBLIC_API_BASE_URL="http://localhost:4000/api/v1"
```

Backend (example):

```env
PORT=4000
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/design_to_elementor"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="replace-with-secure-secret"
STORAGE_BUCKET="design-to-elementor-dev"
WORDPRESS_API_BASE_URL="https://example-wordpress-site.com/wp-json"
```

### 9.4 Run local services

```bash
# PostgreSQL
# start database and create schema

# Redis
redis-server

# Frontend
pnpm --filter web dev

# Backend
pnpm dev
```

### 9.5 Database migration example

```bash
pnpm prisma migrate dev
```

or

```bash
pnpm db:migrate
```

depending on the backend project structure.

---

## 10. Production Architecture (Recommended)

In production, the recommended deployment pattern is:

- Frontend: Vercel or a comparable static/server-rendered deployment
- Backend API: containerized Node service deployed to a managed platform
- Database: managed PostgreSQL service
- Redis: managed Redis queue service
- Storage: private local filesystem
- Background workers: dedicated worker runtime with autoscaling
- Logging and monitoring: OpenTelemetry, Sentry, application logs

This guarantees scale, traceability, and separation between the app UI and conversion pipeline.

---

## 11. Operational Concerns

### Monitoring

Track:

- API latency
- project usage
- conversion queue depth
- conversion failure rates
- artifact generation completion rate
- diagnostics volume per project

### Observability

Add:

- request logging
- audit trail for important actions
- structured logs for each conversion stage
- health checks for API, DB, storage, and workers

### Backup / Recovery

- daily DB backups
- retention policy for uploaded files and artifacts
- offline restore paths for failed deployments

---

## 12. Security Architecture Notes

- No secrets in frontend environment variables
- All authorization logic server-side
- Sensitive tokens stored in secure server storage, not client state
- CSRF protection for cookie-based sessions
- Signed uploads or reserved storage URLs for user uploads
- Private filesystem permissions and membership-authorized API streaming
- No execution of uploaded code in the browser

---

## 13. Summary

The platform is a layered system where:

- the frontend handles UX and presentation
- the backend handles trust-sensitive logic and orchestration
- PostgreSQL stores canonical records
- the backend's private storage directory retains uploaded files and generated artifacts
- async workers handle conversion jobs and diagnostics
- WordPress publishing is an explicit backend-controlled action

This architecture keeps the system secure, modular, and scalable while respecting the requirement that the frontend never performs trusted conversion logic itself.
