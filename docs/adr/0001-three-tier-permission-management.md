# Three-tier permission management hierarchy

The system has three levels of permission management authority: the Dean manages everything, Program Heads manage their program's hierarchy, and a folder owner manages permissions on their owned folder and all descendant subfolders. Owner authority overrides child owners — a parent folder owner can revoke permissions a subfolder owner granted.

We chose this instead of a flat Dean-only model because the Dean cannot manage every folder's permissions in a growing repository. We rejected giving owners authority only on their own folder (not children) because that would create permission deadlocks — a parent owner accountable for the folder's contents would have no control over who accesses its subfolders.
