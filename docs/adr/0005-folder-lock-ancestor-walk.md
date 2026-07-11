# Folder lock: ancestor-chain walk

- **Status**: accepted
- **Date**: 2025-01 (inferred from code)

## Context

A locked folder should prevent modifications to itself and all
descendants (subfolders, documents). Several approaches exist: (a) a
trigger that propagates the lock to children at the DB level, (b) an
eventual-consistency background job that syncs the lock flag, (c)
checking the ancestor chain at access time.

## Decision

Do not propagate the lock flag to children. Instead, `isFolderLocked()`
in `lib/permission-utils.ts` walks up the parent chain at access time
and returns `true` if any ancestor has `is_locked = true`.

Subfolder creation inherits the parent's lock state at the API layer
(when `POST /api/folders` creates a folder, it sets `is_locked` from
the parent), so new children are born locked if their parent is locked.
But existing children are not retroactively updated when a parent is
locked — the ancestor walk handles that at check time.

The `canBypassLock()` function allows Dean and Program Head roles to
perform modifications regardless of lock state.

## Consequences

- No data migration needed when locking a folder — existing children
  become effectively locked immediately via the ancestor check.
- Unlocking a parent instantly unlocks all descendants (no propagation
  delay).
- Every modification endpoint must call `isFolderLocked()` — if a new
  endpoint is added without the check, locks can be bypassed.
- The ancestor walk requires one query per level in the worst case
  (though in practice folder depth is rarely > 5).
