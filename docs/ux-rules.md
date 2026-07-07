# CCS Archive — UX & Design Rules

## Design System

### Colors
- **Primary**: `oklch(0.8323 0.2459 147.2264)` — vibrant green (`bg-primary`, `text-primary`)
- **Primary Foreground**: `oklch(0.2626 0.0147 166.4589)` — dark green (`bg-primary-foreground`, `text-primary-foreground`)
- **Dark bg**: `oklch(0.18 0.03 160)` — deep green for nav/footer/hero
- **Destructive**: `oklch(0.5523 0.1927 32.7272)` — red for delete/error
- **Muted**: `oklch(0.9461 0 0)` — subtle background

### Typography
- **Display**: Fraunces — headings, hero text, brand name
- **Body**: Inter — all body text, form labels, general UI
- **Mono**: IBM Plex Mono — labels, badges, metadata, timestamps

### Layout
- **Container**: `max-w-6xl` for centered content
- **Spacing**: 4/8dp rhythm via Tailwind spacing scale
- **Radius**: `--radius: 0.5rem`

## Component Patterns

### Modals (Dialog)
Use `@/components/ui/dialog` for confirmations, forms, and detail views.
- Always include `DialogTitle` and `DialogDescription`
- Destructive actions must use `variant="destructive"` buttons
- Modal backdrop: 50% black scrim
- Escape key and outside click dismiss

```tsx
<Dialog>
  <DialogTrigger asChild>
    <Button>Open</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Action</DialogTitle>
      <DialogDescription>Description of the action.</DialogDescription>
    </DialogHeader>
    {/* form content */}
    <DialogFooter>
      <Button variant="outline">Cancel</Button>
      <Button>Confirm</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Toasts (Sonner)
Use `sonner` toast for transient feedback (3-5s auto-dismiss).
- Success: green checkmark + brief message
- Error: red X + actionable message
- Destructive actions: show undo toast

```tsx
import { toast } from "sonner"
toast.success("Document archived.")
toast.error("Failed to upload.", { description: "File too large." })
```

### Forms
- Always show visible labels (not placeholder-only)
- Validate on blur, show error below field
- Disable submit during async operations, show spinner
- Required fields marked with asterisk
- Use `Field`, `FieldLabel`, `FieldGroup` from `@/components/ui/field`

### Loading States
- Buttons: disable + show "Loading..." text during async
- Page load: skeleton placeholders using `@/components/ui/skeleton`
- Content load: spinner after 300ms delay if not instant
- Modals: disable submit + show spinner

### Empty States
- Always show helpful message + action when no content
- Use muted text + a CTA button

### Touch & Interaction
- Touch targets minimum 44×44px
- Hover: 150-300ms transitions
- Focus: visible focus rings preserved
- Reduced motion: respect `prefers-reduced-motion`

### Accessibility
- All icons in buttons must have `aria-label`
- Form errors use `role="alert"`
- Color never the sole indicator — add icon/text
- Keyboard navigation: tab order matches visual order

## Page Rules

### Landing Page (`/`)
- Public, no auth required
- Dark green hero, nav, footer
- Scrolling ticker, role cards, feature grid

### Login Page (`/login`)
- Public, redirects to dashboard if authenticated
- Dark green background matching landing page
- Centered card with form
- CCS logo prominent

### Setup Page (`/setup`)
- Only accessible when no admin exists
- Same visual style as login

### Dashboard (`/dashboard`)
- Authenticated only
- Sidebar with green accent matching brand
- Stats cards at top, recent activity below
- All CRUD operations use modals
- Deletes use confirmation dialogs
