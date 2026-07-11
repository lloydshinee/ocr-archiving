# File storage in Supabase Storage

- **Status**: accepted
- **Date**: 2025-01 (inferred from code)

## Context

The system stores uploaded document files and serves them for viewing
and download. Options considered: local filesystem, S3-compatible
storage (MinIO, AWS S3), Supabase Storage.

## Decision

Store files in Supabase Storage's `documents` bucket. File paths follow
the pattern `{documentId}/v{version}-{filename}` to keep all versions
of a document co-located and avoid collisions.

The bucket is private (not public). Files are served through Next.js API
routes (`/api/documents/[id]/view` and `/api/documents/[id]/download`)
that authenticate the user, check permissions, stream the file from
Storage, and log the access to the audit trail.

## Consequences

- No separate storage infrastructure to manage — reuses the existing
  Supabase project.
- Access control is enforced in application code, not at the storage
  layer.
- Supabase Storage bandwidth is metered (free tier includes 2 GB
  transfer); large downloads count toward the project quota.
- The service role key is required for server-side file access; the
  worker needs it to download files for OCR.
- Old version files remain in Storage even after a version is deleted
  (the DB record is removed but the storage object is not cleaned up).
