# CCS Archive — Design Guidelines

Reference doc for building any new page or component in this app. Goal: every
screen should feel like it belongs to the same physical-records system —
folders, tabs, stamps, ledgers — not a generic SaaS dashboard.

Read this before styling anything. If a pattern here doesn't cover your case,
match its *spirit* (institutional, paper-and-ink, metadata-forward) rather
than inventing a new visual language.

---

## 1. Core metaphor

Every visual decision should trace back to physical records: a manila folder
tab, a stamped permission, a ledger line, a paper card. Don't add decoration
that isn't grounded in that world. If you can't explain a visual choice in
terms of "this is what a folder/stamp/ledger would do," reconsider it.

## 2. Component library

**shadcn/ui is the only component library.** Every interactive primitive —
Button, Input, Dialog, Table, Badge, Toast/Sonner, Select, Checkbox,
Avatar, Separator, Tooltip, DropdownMenu, etc. — comes from shadcn. Install
with `npx shadcn@latest add <component>` before building anything that
needs it; never hand-roll a primitive shadcn already provides, and never
pull in a different UI kit (MUI, Chakra, Ant, etc.) alongside it.

Restyle shadcn components through the token system in sections 3–4 below
(className overrides, CSS variables), not by forking the component source.
Icons come from `lucide-react`, matching what shadcn expects by default.

---

## 3. Color

Use CSS variables with hardcoded fallbacks, never bare hex/oklch inline. This
keeps every surface in sync if the palette changes later.

```css
:root {
  --brand-ink: oklch(0.18 0.03 160);      /* darkest surface — nav, hero, footer */
  --brand-ink-2: oklch(0.22 0.03 160);    /* one step lighter — card chrome, ticker strip */
  --brand-accent: oklch(0.55 0.15 155);   /* third "window dot," small highlights */
}
```

```tsx
style={{ backgroundColor: "var(--brand-ink, oklch(0.18 0.03 160))" }}
```

Beyond those three, **use shadcn semantic tokens exclusively** —
`bg-primary`, `text-muted-foreground`, `bg-background`, `text-destructive`,
`border-border`, etc. Never hardcode a color that already has a token.
Rule of thumb:

| Need | Use |
|---|---|
| Darkest chrome (nav, hero, footer, card headers) | `var(--brand-ink)` |
| One step lighter (card body chrome, ticker strip) | `var(--brand-ink-2)` |
| Brand/CTA color | `bg-primary` / `text-primary-foreground` |
| Body copy on light surfaces | `text-foreground` / `text-muted-foreground` |
| Errors | `text-destructive` |
| Borders on light surfaces | `border-border` |
| Borders on dark surfaces | `border-white/10` |

Never invent a one-off color for a single component.

---

## 4. Typography

Three faces, each with one job. Don't blend their roles.

| Face | CSS var | Used for |
|---|---|---|
| **Fraunces** | `var(--font-display)` | Headings only (`h1`/`h2`/page titles). Never body copy, never labels. |
| **Inter** | default sans (`--font-body`) | All body copy, buttons, nav links. |
| **IBM Plex Mono** | `var(--font-mono)` | Anything that reads like *metadata*: eyebrows, tags, version strings, timestamps, form field labels, breadcrumbs, footer text. |

Mono eyebrow pattern (use above nearly every heading):

```tsx
<p
  className="text-xs uppercase tracking-[0.2em] text-muted-foreground"
  style={{ fontFamily: "var(--font-mono)" }}
>
  Level 1 · Dean
</p>
```

If a string represents "data about the thing" rather than "the thing
itself," it's mono. A document's title is Inter; its version number, tags,
and upload timestamp are mono.

---

## 5. Signature components (reuse, don't reinvent)

### Folder tab
The trapezoid tab sitting above content on dark surfaces. Use at the top of
any full-page dark hero (landing hero, login, setup, and any future
full-bleed auth/marketing screen).

```tsx
<div
  className="bg-primary px-6 py-2 text-xs uppercase tracking-[0.2em] text-primary-foreground"
  style={{
    clipPath: "polygon(6% 0, 94% 0, 100% 100%, 0% 100%)",
    fontFamily: "var(--font-mono)",
  }}
>
  College of Computer Studies
</div>
```

### Window-chrome card
Any card that represents "a document, a session, or a piece of system state"
gets this treatment: dark header with three status dots + a mono breadcrumb,
paper-colored body underneath. Used for the hero document mockup and the
login/setup card. Reuse for anything else that deserves to feel like a
"live" artifact (e.g. a settings panel, a preview card).

```tsx
<div className="overflow-hidden rounded-xl border border-white/10 shadow-2xl"
     style={{ backgroundColor: "var(--brand-ink-2, ...)" }}>
  <div className="flex items-center gap-1.5 px-4 py-3">
    <span className="h-2.5 w-2.5 rounded-full bg-destructive" />
    <span className="h-2.5 w-2.5 rounded-full bg-primary" />
    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "var(--brand-accent, ...)" }} />
    <span className="ml-3 text-xs text-white/50" style={{ fontFamily: "var(--font-mono)" }}>
      Breadcrumb / Context
    </span>
  </div>
  <div className="bg-background p-8">{/* content */}</div>
</div>
```

### Permission stamps
The six permission actions (View, Create, Edit, Move, Delete, Archive)
always render as slightly-rotated bordered chips with a mono uppercase
label — never as a plain list or table when shown decoratively. If shown
functionally (e.g. an actual permission-editing UI), keep the visual
identity (icon + mono label) but drop the rotation.

### Audit ticker
A horizontal auto-scrolling mono log strip. Reserve this specifically for
audit/activity content — don't repurpose the marquee pattern for anything
else (nav, promos, etc.), or it stops meaning "this is the live record."
Always respect `prefers-reduced-motion`.

---

## 6. Layout rules

- Page content max width: `max-w-6xl`, centered (`mx-auto px-6`).
- Auth/standalone screens (login, setup): `max-w-sm` card, centered
  vertically with `min-h-svh`.
- Alternate section backgrounds down the page for rhythm: dark ink → paper
  → white → paper → dark ink (CTA/footer). Don't run two dark or two paper
  sections back to back.
- Section vertical padding: `py-20` to `py-24` for marketing sections.

---

## 7. States & accessibility (non-negotiable, not just for auth pages)

Every async action anywhere in the app must have all three states visible
to the user — no silent blank screens:

1. **Loading** — a spinner or skeleton, never a bare `return null`.
2. **Error** — a visible message plus a retry action if the request can be
   retried. Wrap all `fetch` calls in try/catch.
3. **Success** — the actual content/result.

Additional baseline:
- Forms: disable all fields (`<fieldset disabled={loading}>`), not just the
  submit button, while a request is in flight.
- Errors get `role="alert"` / `aria-live="polite"`.
- Inputs get correct `autoComplete` values (`email`, `new-password`, `name`, etc.).
- Any animation (ticker, transitions) respects `prefers-reduced-motion`.
- Any external image (logos, avatars) has an `onError` fallback — never a
  bare `<img>` with no failure path.

---

## 8. Dashboard surfaces (folders, documents, tables, modals, forms)

Sections 3–4 (color/type tokens) apply everywhere. The hero-style patterns
in section 5 (folder tab, window-chrome card, ticker) are for marketing and
auth screens — **don't use them inside the dashboard**. Dense, working UI
needs its own, quieter versions of the same identity:

### Layout
- Dashboard pages are light (paper/background), not the dark ink hero —
  ink is reserved for the persistent top nav/sidebar only.
- Sidebar/nav: `var(--brand-ink)` background, same as the marketing nav.
  Active item gets a `bg-primary/10` highlight with a `text-primary` label,
  not a full primary-filled pill.
- Breadcrumbs (College-Wide / BSCS / Accreditation) always render in mono,
  same as the hero mockup breadcrumb — this is the one hero pattern that
  does carry into the dashboard, since it's genuinely metadata.

### Folder / document lists
- Row-based, not card-grid, once you're several folders deep — cards are
  for the landing page's illustrative mockup, not for browsing hundreds of
  real documents.
- Each row: icon (folder or file-type icon), title (Inter), then mono
  metadata trailing right-aligned — version, modified date, owner initials.
  Same "title = Inter, data-about-the-thing = mono" rule as section 4.
- Category and Document Type render as `Badge` (shadcn), using
  `bg-muted text-muted-foreground` for Category and an outline variant for
  Document Type, so the two fixed taxonomies are visually distinct from
  freeform Tags.
- Tags render as small pill chips, mono, `bg-muted` — same chip used in the
  hero mockup (`#accreditation`), just smaller and without the rotation.
- Archived items: same row, reduced to `opacity-60`, no color change — a
  document doesn't turn red when archived, it just recedes. Reserve
  `text-destructive` for irreversible or blocking states only (delete
  confirmation, lock notices, errors).
- Locked folders: a small `Lock` icon in `text-muted-foreground` next to
  the name — never a full banner, it shouldn't shout.

### Tables (audit log, version history, recycle bin)
- Plain shadcn `Table`, not the window-chrome card treatment.
- Timestamps, actor names, and action verbs in mono; everything else in
  Inter. This makes tables instantly scannable as "ledger data."
- Row hover: `bg-muted/50`, no border color changes.
- Empty table state: see "Empty states" below, not a blank `<tbody>`.

### Modals / dialogs
- Use shadcn `Dialog` for all create/rename/permission/confirm flows — no
  custom modal shells.
- Dialog header: plain Inter title (not Fraunces — Fraunces is reserved for
  page-level headings, a modal is a task, not a destination), optional mono
  eyebrow above it only if it adds real context (e.g. "BSCS / Accreditation").
- Destructive confirms (delete, purge from Recycle Bin) always name the
  exact item being acted on in the body text, and the confirm button uses
  `variant="destructive"` — never a primary-colored confirm for an
  irreversible action.
- Permission-editing dialogs reuse the **permission stamp** chip style
  (icon + mono label) as toggles, so granting/revoking an action visually
  matches how it's shown everywhere else in the app.

### Forms (metadata edit, folder create/rename, comments)
- Same rules as the auth forms already built: `<fieldset disabled={loading}>`
  while submitting, mono uppercase labels, `role="alert"` errors, full
  loading/error/success states — no exceptions for "small" dashboard forms.
- Comment composer: plain Inter input, no special styling — comments are
  conversational, not part of the ledger, so they stay in the body font.

### Empty states
- Every empty folder, empty search result, empty audit log, and empty
  recycle bin needs a real empty state: a muted icon, one line of Inter
  copy stating what's missing, and — if applicable — the action to fix it
  (e.g. "No documents yet — Upload one"). Never a bare blank area.

### Notifications / toasts
- Use shadcn `Sonner`/`Toast`. Icon + one line, Inter, no mono — a toast is
  a passing system message, not a record.
- Bell icon badge count uses `bg-destructive` for the dot, matching the
  destructive token, not the primary/manila accent — keep primary reserved
  for actions the user takes, not alerts they receive.

### Buttons, generally
- Primary action per view: `variant="default"` (bg-primary), one per
  screen/section.
- Everything else (Cancel, secondary nav actions): `variant="outline"` or
  `variant="ghost"`.
- Irreversible actions: `variant="destructive"`, always with a confirm
  dialog in front of it, never a bare button that fires immediately.

---

## 9. Don'ts

- Don't use raw hex/oklch for anything shadcn already tokenizes.
- Don't use Fraunces for body copy or Inter for eyebrows/metadata.
- Don't add numbered markers (01/02/03) unless the content is a genuine
  ordered sequence — role hierarchy is a tree, not a numbered list.
- Don't introduce a new card style, button style, or motion pattern without
  checking sections 5–6 first for an existing one that fits.
- Don't ship a loading or error state that isn't visibly different from a
  blank page.
- Don't bring the folder tab, window-chrome card, or ticker into the
  dashboard — those are the marketing/auth "face" of the app, not the
  working UI.
- Don't build a custom modal, table, or toast component — use shadcn's and
  restyle via tokens, don't reimplement.
- Don't color-code archived/locked state with red or yellow — those are
  reserved for destructive/error states. Archived and locked are just
  "different," not "wrong."
