# CCS Archive

A document archiving and records management system for the College of Computer Studies. Built with Next.js 16 (App Router), Supabase (self-hosted via Docker), and shadcn/ui.

**Features**

- Folder hierarchy with unlimited nesting, archive, and lock
- Document upload, versioning, metadata (category, type, tags), and full-text search (OCR)
- Four roles: Dean, Program Head, Faculty, Student Assistant
- Granular permission system (6 actions: View, Create, Edit, Move, Delete, Archive) — individual grants and bulk-by-role
- Recycle bin with 30-day retention and manual purge
- Audit log (indelible, filterable, paginated)
- Real-time notifications and document comments
- Inline document viewer (PDF, images, text)
- Folder ZIP download

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16.2 (App Router, React 19) |
| Language | TypeScript 5 (strict mode) |
| Styling | Tailwind CSS v4 + shadcn/ui (base-nova) |
| Icons | lucide-react |
| Database | Supabase PostgreSQL (11 tables, full-text search via tsvector) |
| Auth | Supabase Auth (email/password) |
| Storage | Supabase Storage (`documents` bucket) |
| OCR | Tesseract + pdftoppm (polling worker). LibreOffice optional — only needed for PPTX support |
| UI Primitives | @base-ui/react |
| Testing | Vitest + jsdom + @testing-library/react |

---

## Prerequisites

- **Node.js** >= 18 (uses `^20` types, recommend 20 LTS or later)
- **npm** (or pnpm, yarn, bun)
- **Docker Compose** for the local Supabase stack — or a remote Supabase project if you prefer
- **Required for OCR**:
  - `tesseract-ocr` (CLI, with English language pack)
  - `poppler-utils` (provides `pdftoppm`) — for PDF OCR
  - `python3` — for DOCX/XLSX text extraction and PDF OCR pipeline
- **Optional**:
  - `libreoffice` (headless) — only needed if you want PPTX OCR support

### Installing OCR dependencies (Ubuntu/Debian)

```bash
# Required for full-text search on uploaded documents
sudo apt install tesseract-ocr poppler-utils python3

# Optional — only if you need PPTX OCR
sudo apt install libreoffice-core libreoffice-impress
```

> **Without OCR deps, the app still works** — uploads, downloads, metadata, permissions, search all function normally. Only OCR-based full-text search of documents will be unavailable (search relies on filenames and metadata).

> **Microsoft Word (.docx) and Excel (.xlsx) OCR does not need LibreOffice** — text is extracted via XML parsing. For image-only DOCX files (scanned pages), images are OCR'd directly with Tesseract.

---

## Setup

### 1. Clone and install

```bash
git clone <repo-url> ccs-archive
cd ccs-archive
npm install
```

### 2. Start local Supabase

Make sure Docker is running, then start the Supabase stack:

```bash
docker compose up -d
```

> If you don't have a Supabase compose file yet, see [supabase community docker compose](https://github.com/supabase-community/supabase-docker-compose) for a ready-to-use one.

This starts all Supabase services locally (PostgreSQL, Auth, Storage, Realtime, etc.). The default URL is `http://localhost:8000`.

### 3. Configure environment

Create `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzgzMzM0NzAyLCJleHAiOjE5NDEwMTQ3MDJ9.asY2_7QeAGb_FhBeIR1B_djuwjXhjywVBf3GkOE3-bo
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3ODMzMzQ3MDIsImV4cCI6MTk0MTAxNDcwMn0.pv3AcMLVyU06DwsRi-rqhDOrR8bUNdQJOATIdEC3gyw
```

> These are the default local Supabase keys included with every local Supabase instance. If you're connecting to a remote Supabase project, replace them with your project's keys from **Project Settings > API**.

### 4. Set up the database

Copy and run the migration file against your running Supabase instance:

```bash
# Via Supabase Studio SQL Editor at http://localhost:8000/project/default/sql/new
# Or via psql directly:
psql "$DATABASE_URL" -f supabase-migration.sql
```

This creates all tables, enums, extensions, functions, and the storage bucket.

### 5. Start development

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000). The first visit will redirect to `/setup` to create the initial Dean account.

### 6. Start the OCR worker (optional)

```bash
npm run worker
```

The worker polls the `ocr_jobs` table every 5 seconds, processes pending jobs, and updates `document_versions.ocr_text` with extracted text.

Supported formats:
- **PDF** → pdftoppm → Tesseract
- **JPEG/PNG** → Tesseract directly
- **DOCX** → XML text extraction; if empty (image-only), extracts images from ZIP and OCRs them with Tesseract
- **XLSX** → XML text extraction (shared strings + cell values)
- **PPTX** → Requires LibreOffice (converts to PDF → pdftoppm → Tesseract)
- **TXT** → Read as-is

> The worker needs the same Supabase env vars as the app (`NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`).

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Next.js development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm test` | Run Vitest test suite |
| `npm run test:watch` | Run tests in watch mode |
| `npm run worker` | Start the OCR polling worker |

---

## Project structure

```
app/
  (auth)/               # Login and setup pages
  (protected)/          # All authenticated pages (dashboard, folders, documents, etc.)
  api/                  # REST API route handlers (45 files, ~100 handler methods)
  layout.tsx            # Root layout (fonts, providers)
  page.tsx              # Landing page
components/
  ui/                   # shadcn UI primitives (25 components)
  ...                   # App-specific components (23 files)
lib/
  supabase/             # DB client (server, browser, session, types)
  permission-utils.ts   # Permission engine (hierarchical check, lock bypass)
  folder-utils.ts       # Tree builder, breadcrumb resolver
  search-utils.ts       # Search result filtering, OCR eligibility
  user-utils.ts         # Role hierarchy validation
  file-icons.tsx        # MIME type → icon mapping
  seed.ts               # First-run seed data
  utils.ts              # cn() utility
scripts/
  ocr-worker.ts         # Standalone OCR polling worker
docs/
  adr/                  # Architectural Decision Records
  agents/               # AI agent workflow docs
tests/
  setup.ts              # Test setup (jest-dom matchers)
  helpers.ts            # Test helpers (user creation/cleanup)
  auth.test.ts          # Auth integration tests
  middleware.test.ts    # Session middleware tests
```

---

## Architecture overview

### API pattern

All API routes use `createAdminClient()` (Supabase service role key) and enforce authorization in application code via `lib/permission-utils.ts`. There is no RLS — all access control is explicit TypeScript logic.

### Permission model

Six actions (`view`, `create`, `edit`, `move`, `delete`, `archive`) are grantable per-user per-folder or per-document. Permissions inherit from parent folders unless `inherit_permissions` is disabled. Three tiers of permission management:

1. **Dean** — manages all folders, all programs
2. **Program Head** — manages their program's hierarchy (folder creation, permission grants)
3. **Folder Owner** — manages permissions on owned folder and all descendant subfolders

### Folder lock

A lock prevents all modifications (upload, rename, move, delete, archive) on a folder and its entire subtree. Lock is inherited by children (checked by walking the ancestor chain). Only Dean and Program Heads bypass the lock.

### Data flow

1. Upload → `POST /api/documents` → creates DB record + storage file + version 1 → queues OCR job
2. Search → `search_archives` RPC → filters results by user permission → returns documents + folders
3. Delete → sets `deleted_at` → appears in Recycle Bin → 30-day soft-delete retention (manual purge by Dean)

---

## Database

11 tables, 1 enum, 3 database functions, 1 storage bucket. See CONTEXT.md for the domain glossary.

---

## Env vars

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key (for client-side auth + Realtime) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service role key (for backend API routes + OCR worker) |

---

## Testing

```bash
npm test                 # Run once
npm run test:watch       # Watch mode
```

Tests use Vitest with jsdom. Auth tests require a real Supabase connection (reads env vars from `vitest.config.ts`).
