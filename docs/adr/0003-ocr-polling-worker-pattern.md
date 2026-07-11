# OCR: standalone polling worker

- **Status**: accepted
- **Date**: 2025-01 (inferred from code)
- **Updated**: 2026-07 — replaced Python subprocess pipeline with pure-Node extractors

## Context

Uploaded documents (PDF, images, DOCX, XLSX) should be full-text
searchable, which requires OCR. OCR is slow (seconds to minutes per
file) and must not block the upload HTTP request. The system runs on a
single VM without a job queue or message broker.

## Decision

Run a standalone Node.js script (`scripts/ocr-worker.ts`) that polls the
`ocr_jobs` table every 5 seconds. The worker:

1. Picks up pending/retryable jobs ordered by creation time.
2. Downloads the file from Supabase Storage into a Buffer (no temp files).
3. Passes the buffer to the unified `extractText(buffer, fileType)` function in `lib/document-extractor.ts`, which delegates to:
   - **PDF**: `pdf-parse` (pdfjs-dist) for text-based PDFs; falls back to screenshot rendering via `pdf-parse` → `tesseract.js` for scanned PDFs
   - **Images** (JPEG/PNG/TIFF/BMP/GIF): `tesseract.js` (WASM, pure Node)
   - **DOCX**: `mammoth` (pure Node) for text extraction; falls back to `adm-zip` + `tesseract.js` for image-only DOCX
   - **XLSX**: `xlsx` (SheetJS, pure Node) for worksheet text extraction
   - **PPTX**: XML text extraction from slides via `adm-zip` (pure Node)
   - **Plain text**: direct buffer `toString()`
4. Writes extracted text back to `document_versions.ocr_text`.
5. Retries failed jobs up to 3 times with a 5-minute delay from the failure time.

The worker is started independently (`npx tsx scripts/ocr-worker.ts`)
and has no HTTP server. It exits on error and relies on external
supervision (systemd, PM2, or manual restart).

## Consequences

- OCR is fully async — uploads return immediately with `ocr_status:
  "pending"`.
- The worker must be running separately from the web server. No OCR
  processing happens if it's down.
- No system-level CLI dependencies — all extraction uses pure-Node
  libraries (`pdf-parse`, `tesseract.js`, `mammoth`, `xlsx`, `adm-zip`).
  No `tesseract`, `poppler-utils`, `python3`, or `libreoffice` required.
- The extraction logic lives in `lib/document-extractor.ts` as a
  testable module instead of inline Python scripts.
- Failure is visible to users via the `OcrStatusBadge` component with a
  retry button (`POST /api/ocr` re-queues the job).
- Retry delay is flat (not exponential) — the worker waits a fixed
  5 minutes before retrying a failed job.