# OCR: standalone polling worker

- **Status**: accepted
- **Date**: 2025-01 (inferred from code)

## Context

Uploaded documents (PDF, images, DOCX, XLSX) should be full-text
searchable, which requires OCR. OCR is slow (seconds to minutes per
file) and must not block the upload HTTP request. The system runs on a
single VM without a job queue or message broker.

## Decision

Run a standalone Node.js script (`scripts/ocr-worker.ts`) that polls the
`ocr_jobs` table every 5 seconds. The worker:

1. Picks up pending jobs ordered by creation time.
2. Downloads the file from Supabase Storage.
3. Runs the appropriate extraction pipeline:
   - **PDF**: `pdftoppm` → images → `tesseract` each image
   - **Images** (JPEG/PNG): `tesseract` directly
   - **DOCX**: XML text extraction from `word/document.xml`; if empty (image-only), extracts images from `word/media/` and OCRs each with Tesseract
   - **XLSX**: XML text extraction from worksheets + shared strings
   - **PPTX**: LibreOffice headless → PDF → images → tesseract (LibreOffice required)
4. Writes extracted text back to `document_versions.ocr_text`.
5. Retries failed jobs up to 3 times with a 5-minute delay.

The worker is started independently (`npx tsx scripts/ocr-worker.ts`)
and has no HTTP server. It exits on error and relies on external
supervision (systemd, PM2, or manual restart).

## Consequences

- OCR is fully async — uploads return immediately with `ocr_status:
  "pending"`.
- The worker must be running separately from the web server. No OCR
  processing happens if it's down.
- No external dependencies beyond the CLI tools listed in the README
  (tesseract, poppler-utils, libreoffice, python3).
- Failure is visible to users via the `OcrStatusBadge` component with a
  retry button (`POST /api/ocr` re-queues the job).
- Retry logic with exponential delay prevents thundering herd on
  transient failures.
