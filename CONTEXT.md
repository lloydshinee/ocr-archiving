# CCS Archiving System

A document archiving and records management system for the College of Computer Studies.

## Language

### Organization

**Program**:
An academic program within the College of Computer Studies (e.g., BSCS, BSIT, BLIS). Each Program has one Program Head and one auto-created root folder. Programs can share document access with other programs.
_Avoid_: Department, course, major

### Roles & People

**Dean**:
The system administrator with unrestricted authority over all folders, documents, permissions, users, and system settings. Can override any Program Head action. Creates Dean and Program Head accounts.
_Avoid_: Admin, super-admin, superuser

**Program Head**:
A role below the Dean that can create top-level folders, grant/revoke/modify permissions, and manage their program's hierarchy. May share documents with other programs at their discretion. Multiple Program Heads can exist (one per program). Creates Faculty and Student Assistant accounts.
_Avoid_: Chair, department head

**Faculty**:
A user who accesses folders and documents based on permissions assigned by the Dean or a Program Head. Cannot manage permissions.
_Avoid_: Instructor, professor, teacher

**Student Assistant**:
A user with the same access model as Faculty — permissions-based, no permission management. Distinct from Faculty in role name and likely in typical permission assignments.
_Avoid_: SA, student worker, aide

**Deactivated User**:
A user account disabled by the Dean or a Program Head. Cannot log in. Owned documents and audit trail records are preserved. Reactivation restores the account with its prior role and permissions intact.
_Avoid_: Disabled, suspended, banned

### Files & Folders

**Folder**:
A hierarchical container for documents and subfolders. Supports unlimited nesting. Records ownership (creator, creation date, last modified by, last modified date). The owner receives baseline operational permissions on the folder.
_Avoid_: Directory, collection

**Document**:
A file with metadata (title, description, category, type, tags, version info) stored within a folder. The owner receives baseline operational permissions on the document. Maximum file size is 100 MB, configurable by the Dean. Supported formats: PDF, DOCX, XLSX, PPTX, JPG, PNG, TXT, ZIP. Non-supported formats are rejected on upload. ZIP files are stored as-is (not extracted for OCR).
_Avoid_: File, record, entry

**Owner**:
The user who created a folder or document. Ownership confers baseline operational permissions (view, upload, rename, move, delete, archive) on the owned item and permission management rights on that folder and all its descendant subfolders, overriding child owners. Ownership can be transferred by the Dean or a Program Head.
_Avoid_: Creator, author, responsible

**Lock (folder)**:
Prevents all modifications (uploads, renames, moves, deletes, archiving) to a folder and its entire subtree. Only the Dean and Program Heads bypass the lock. Cascades to all subfolders and documents. Reversible by the Dean or the locking Program Head.
_Avoid_: Freeze, read-only, protect

**Archive (verb)**:
Marks a folder or document as inactive. The item remains in its original folder location but is hidden from default views. Users with permission can toggle "Show archived" to see archived items. No auto-expiry — archival is permanent until explicitly unarchived. Archiving a folder cascades to all children; unarchiving the parent restores each child's previous archive state.
_Avoid_: Deactivate, retire

**Delete**:
Moves a folder or document to the Recycle Bin, where it can be restored within 30 days before permanent deletion.
_Avoid_: Remove, trash, soft-delete

**Recycle Bin**:
A holding area for deleted folders and documents. Items restorable within 30 days. A daily scheduled job permanently deletes expired items and their storage files. The Dean may manually purge items before expiry.
_Avoid_: Trash, deleted items

### Metadata

**Category**:
A broad, fixed grouping for documents and folders, managed by the Dean (e.g., Accreditation, Faculty Records, Curriculum). Used for filtering and organization.
_Avoid_: Classification, group, section

**Document Type**:
A fixed classification of the document's form or purpose, managed by the Dean (e.g., Memo, Report, Minutes, Correspondence). Distinct from Category — a Report could belong to the Accreditation category.
_Avoid_: Format, kind, class

**Tag**:
A freeform keyword added by any user with permission to edit metadata. System-wide: existing tags appear as autocomplete suggestions to converge vocabulary. Used for flexible cross-cutting labeling.
_Avoid_: Label, keyword, flag

### Activity

**Notification**:
An in-app alert triggered by events relevant to the user: new document in an accessible folder, new comment on a participating thread, permission changes affecting the user, or archival/deletion of owned items. Delivered in real-time via Supabase subscriptions with a bell icon and badge count. No email delivery.
_Avoid_: Alert, message, ping

### Collaboration

**Comment**:
A discussion message attached to a document. Visible to all users with access to that document. Flat chronological threading (no nested replies). Delivered in real-time on the document view page.
_Avoid_: Note, remark, annotation

### Permissions

**Permission**:
An explicit grant of one or more actions on a folder or document, assigned to a specific user. Each permission record tracks who assigned it (Dean, Program Head, or owning user of the parent folder) for accountability. Inherits from parent folders by default unless inheritance is explicitly disabled. Six unified action types:

- **View** — see folder in hierarchy; view/download document
- **Create** — create subfolders and upload documents; upload new document version
- **Edit** — rename folder and edit document metadata (title, description, tags). Category and Document Type changes are reserved for the Dean and Program Heads.
- **Move** — move folder; move document
- **Delete** — move folder to Recycle Bin; move document to Recycle Bin
- **Archive** — mark folder as archived; mark document as archived

Lock and permission management are separate mechanisms, not actions in the permission set.

_Avoid_: ACL, access rule, privilege

### Organization

**College-Wide Folder**:
A top-level folder not belonging to any program, for CCS-wide records (Dean's Office, College Memorandums, Accreditation). Only the Dean may create these.
_Avoid_: Root folder, shared drive, central folder

### Audit

**Audit Log**:
A persistent record of every significant system action (logins, uploads, downloads, edits, deletions, restorations, moves, folder creation, permission changes, ownership transfers, archival, version updates). Each entry records the acting user, affected resource, action, timestamp, and relevant details. Accessible only to the Dean and Program Heads. Kept indefinitely.
_Avoid_: History, activity log, event log

### Versions

**Version**:
A historical snapshot of a document created automatically whenever the document is replaced. All versions are kept indefinitely. Users with permission may view and restore previous versions. Restoring a version creates a new version entry whose file is a copy of the restored version's content, preserving full history.
_Avoid_: Revision, snapshot, edition
