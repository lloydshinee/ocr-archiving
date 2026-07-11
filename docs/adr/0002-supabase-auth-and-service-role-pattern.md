# Supabase Auth + service-role backend pattern

- **Status**: accepted
- **Date**: 2025-01 (inferred from code)

## Context

The system needs authentication (who can log in) and authorization (what
actions they can perform on which resources). Supabase provides Auth
(email/password) and Row-Level Security (RLS), which is the conventional
approach. However, the permission model is complex: hierarchical folder
inheritance, six action types, document-level overrides, lock bypasses,
and three permission-management tiers.

## Decision

Use Supabase Auth for authentication but bypass RLS entirely in the
backend API routes. All API handlers use `createAdminClient()` (the
Supabase service role key, which skips RLS) and enforce authorization
explicitly in TypeScript via `lib/permission-utils.ts`.

The client-side (browser) Supabase client uses the anon key — it only
handles authentication (login, signup, session refresh) and Realtime
subscriptions.

## Consequences

- All authorization logic lives in one place (TypeScript) and can be
  unit-tested without a database.
- The permission cascade (parent folder → child folder → document) is
  feasible to implement; RLS recursive policies for this model would be
  complex and hard to debug.
- The service role key must be kept secret (server-only env var). Every
  API route must authenticate the user first and check permissions
  before acting — there is no "free" RLS safety net.
- First-run Dean account creation (`POST /api/auth/setup`) also uses
  the service role (bypasses auth) because no users exist yet.
