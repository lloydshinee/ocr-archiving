<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Agent skills

### Issue tracker

GitHub Issues, using the `gh` CLI. PRs are not treated as a triage surface. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout — one `CONTEXT.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.

### Coding rules

- **React/Next.js code**: Load the `vercel-react-best-practices` skill before writing or refactoring any React components, data fetching, or performance-sensitive code.
- **UI and styling**: Load the `frontend-design` skill before designing or building any UI components, pages, or layouts.
- **shadcn/ui components**: Load the `shadcn` skill before adding, modifying, or composing shadcn components.

### Git workflow

Every feature, fix, or issue gets its own branch and commits. Never work directly on `main`.

1. **Branch naming**: `{type}/{issue-number}-{short-description}` — e.g. `feat/2-foundation-auth`, `fix/14-logout-redirect`, `ui/3-dashboard-redesign`
2. **Commit granularity**: One commit per logical change. A good commit answers "what" and "why" — not "how".
3. **Commit message format**: `<type>(<scope>): <description>` — e.g. `feat(auth): add first-run Dean setup flow`, `fix(middleware): allow / to be visited by anyone`
4. **Types**: `feat`, `fix`, `refactor`, `ui`, `chore`, `docs`
5. **Before committing**: Always run `git status`, `git diff --stat`, and `git log --oneline -5` to verify what's staged.
6. **Never commit**: secrets, `.env` files, node_modules, build artifacts.
7. **Closing issues**: Reference the issue in commits (`Refs #2`) or PR descriptions (`Closes #2`). Close the issue after verifying all acceptance criteria pass.
