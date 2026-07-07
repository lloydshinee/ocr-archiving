/**
 * CCS Archiving System — Landing Page
 * Next.js (App Router) + shadcn/ui + lucide-react
 */

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Eye,
  Plus,
  Pencil,
  Move,
  Trash2,
  Archive,
  Lock,
  History,
  MessageSquare,
  Bell,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

const INK = "var(--brand-ink, oklch(0.18 0.03 160))";
const INK2 = "var(--brand-ink-2, oklch(0.22 0.03 160))";
const ACCENT = "var(--brand-accent, oklch(0.55 0.15 155))";

const ACTIONS = [
  { label: "View", icon: Eye, rotate: "-rotate-2" },
  { label: "Create", icon: Plus, rotate: "rotate-1" },
  { label: "Edit", icon: Pencil, rotate: "-rotate-1" },
  { label: "Move", icon: Move, rotate: "rotate-2" },
  { label: "Delete", icon: Trash2, rotate: "-rotate-2" },
  { label: "Archive", icon: Archive, rotate: "rotate-1" },
];

const ROLES = [
  {
    name: "Dean",
    note: "Unrestricted authority. Creates Program Head accounts.",
  },
  {
    name: "Program Head",
    note: "Owns a program's hierarchy. Grants and revokes permissions.",
  },
  {
    name: "Faculty",
    note: "Permission-based access. No permission management.",
  },
  {
    name: "Student Assistant",
    note: "Permission-based access. No permission management.",
  },
];

const FEATURES = [
  {
    icon: History,
    title: "Version history",
    body: "Every replaced document is kept, indefinitely. Restore any prior version without losing what came after it.",
  },
  {
    icon: MessageSquare,
    title: "Comments",
    body: "A flat, chronological thread on every document, visible to everyone with access to it.",
  },
  {
    icon: Bell,
    title: "Real-time notifications",
    body: "New documents, comments, and permission changes land instantly — no email, just the bell.",
  },
  {
    icon: Trash2,
    title: "30-day recycle bin",
    body: "Deleted items wait thirty days before they're gone for good. The Dean can purge early if needed.",
  },
  {
    icon: Lock,
    title: "Folder locks",
    body: "Freeze a folder and everything beneath it. Only the Dean or the locking Program Head can lift it.",
  },
  {
    icon: ShieldCheck,
    title: "Audit log",
    body: "Every login, upload, move, and permission change — who, what, when — kept indefinitely.",
  },
];

const TICKER = [
  "R. Santos uploaded Level II Survey 2026.pdf to BSCS / Accreditation",
  "Dean archived Curriculum Draft v3 in BLIS / Curriculum",
  "M. Cruz restored version 4 of Faculty Handbook.docx",
  "Program Head granted Edit to J. Reyes on BSIT / Faculty Records",
  "A. Del Rosario commented on Minutes — May 2026.pdf",
  "System permanently deleted 3 items from Recycle Bin",
  "Program Head locked BSCS / Board Exam Results",
];

export default function Page() {
  return (
    <div className="bg-background text-foreground">
      {/* NAV */}
      <header
        className="sticky top-0 z-50 border-b"
        style={{
          backgroundColor: INK,
          borderColor: "rgba(255,255,255,0.08)",
        }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/ccs.png"
              alt="CCS Logo"
              className="h-8 w-auto"
            />
            <span
              className="text-lg tracking-tight text-white"
              style={{ fontFamily: "var(--font-display)" }}
            >
              CCS Archive
            </span>
          </div>
          <nav className="hidden items-center gap-8 text-sm md:flex text-white/75">
            <a href="#roles" className="hover:text-white transition-colors">
              Roles
            </a>
            <a href="#features" className="hover:text-white transition-colors">
              Features
            </a>
            <a href="#audit" className="hover:text-white transition-colors">
              Audit trail
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              className="text-white hover:bg-white/10"
              render={<a href="/login" />}
              nativeButton={false}
            >
              Sign in
            </Button>
            <Button className="hover:opacity-90" render={<a href="/login" />} nativeButton={false}>
              Request access
            </Button>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section
        className="relative overflow-hidden"
        style={{ backgroundColor: INK }}
      >
        <div className="mx-auto max-w-6xl px-6 pt-8">
          <div className="flex">
            <div
              className="bg-primary px-6 py-2 text-xs uppercase tracking-[0.2em] text-primary-foreground"
              style={{
                clipPath: "polygon(6% 0, 94% 0, 100% 100%, 0% 100%)",
                fontFamily: "var(--font-mono)",
              }}
            >
              College of Computer Studies
            </div>
          </div>
        </div>

        <div className="mx-auto grid max-w-6xl gap-12 px-6 pb-24 pt-8 md:grid-cols-2 md:items-center">
          <div>
            <h1
              className="text-5xl leading-[1.05] text-white md:text-6xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Every record,
              <br />
              properly filed.
            </h1>
            <p className="mt-6 max-w-md text-base leading-relaxed text-white/70">
              One archive for every program in the college. Folders nest
              without limit, permissions cascade the way authority actually
              does, and nothing that happens to a document goes unrecorded.
            </p>
            <div className="mt-8 flex items-center gap-4">
              <Button
                size="lg"
                className="hover:opacity-90"
                render={<a href="/login" />}
                nativeButton={false}
              >
                Request access <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white/25 bg-transparent text-white hover:bg-white/10"
                render={<a href="#roles" />}
                nativeButton={false}
              >
                See how permissions work
              </Button>
            </div>
          </div>

          {/* signature mockup */}
          <div
            className="rounded-lg border p-1 shadow-2xl"
            style={{
              backgroundColor: INK2,
              borderColor: "rgba(255,255,255,0.08)",
            }}
          >
            <div className="flex items-center gap-1.5 px-3 py-2">
              <span className="h-2.5 w-2.5 rounded-full bg-destructive" />
              <span className="h-2.5 w-2.5 rounded-full bg-primary" />
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: ACCENT }} />
              <span
                className="ml-3 text-xs text-white/50"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                College-Wide / BSCS / Accreditation
              </span>
            </div>
            <div className="rounded-md bg-background p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Level II Survey 2026.pdf
                  </p>
                  <p
                    className="mt-1 text-xs text-muted-foreground"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    v4 · uploaded by R. Santos · 2 minutes ago
                  </p>
                </div>
                <Badge variant="default">Report</Badge>
              </div>
              <Separator className="my-4" />
              <div className="flex flex-wrap gap-2">
                {["accreditation", "survey", "level-ii"].map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    #{tag}
                  </span>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between">
                <div className="flex -space-x-2">
                  {["JR", "AD", "MC"].map((initials) => (
                    <div
                      key={initials}
                      className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-primary text-[10px] font-medium text-primary-foreground"
                    >
                      {initials}
                    </div>
                  ))}
                </div>
                <span
                  className="text-xs text-muted-foreground"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  View · Edit · Move
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AUDIT TICKER */}
      <div
        id="audit"
        className="overflow-hidden border-y py-3"
        style={{
          backgroundColor: INK2,
          borderColor: "rgba(255,255,255,0.08)",
        }}
      >
        <div className="ccs-ticker flex w-max gap-10 whitespace-nowrap">
          {[...TICKER, ...TICKER].map((line, i) => (
            <span
              key={i}
              className="text-xs text-white/55"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              <span className="text-primary">•</span>&nbsp; {line}
            </span>
          ))}
        </div>
      </div>

      {/* ROLES */}
      <section id="roles" className="mx-auto max-w-6xl px-6 py-24">
        <p
          className="text-xs uppercase tracking-[0.2em] text-muted-foreground"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          Who holds what authority
        </p>
        <h2
          className="mt-3 text-3xl text-foreground md:text-4xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Authority flows down. Access is always explicit.
        </h2>

        <div className="mt-14 grid gap-6 md:grid-cols-4">
          {ROLES.map((role, i) => (
            <div key={role.name} className="relative">
              {i > 0 && (
                <div className="absolute -left-6 top-10 hidden h-px w-6 bg-border md:block" />
              )}
              <div
                className="rounded-lg border p-6"
                style={{
                  backgroundColor: i < 2 ? INK : undefined,
                  borderColor: "var(--border, oklch(0.9037 0 0))",
                  color: i < 2 ? undefined : undefined,
                }}
              >
                <p
                  className="text-xs uppercase tracking-[0.15em]"
                  style={{
                    fontFamily: "var(--font-mono)",
                    color: i < 2 ? undefined : undefined,
                  }}
                >
                  <span
                    style={{
                      color: ACCENT,
                    }}
                  >
                    {i === 0 ? "Level 1" : i === 1 ? "Level 2" : "Level 3"}
                  </span>
                </p>
                <h3
                  className="mt-2 text-lg font-medium"
                  style={{
                    fontFamily: "var(--font-display)",
                    color: i < 2 ? "#fff" : undefined,
                  }}
                >
                  {role.name}
                </h3>
                <p
                  className="mt-2 text-sm leading-relaxed"
                  style={{
                    color: i < 2 ? "rgba(255,255,255,0.7)" : "var(--muted-foreground, oklch(0.4386 0 0))",
                  }}
                >
                  {role.note}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* PERMISSION STAMPS */}
      <section className="bg-muted py-20">
        <div className="mx-auto max-w-6xl px-6">
          <p
            className="text-xs uppercase tracking-[0.2em] text-muted-foreground"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            Six actions. Nothing implied.
          </p>
          <h2
            className="mt-3 max-w-xl text-3xl text-foreground md:text-4xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Permissions are granted one stamp at a time.
          </h2>

          <div className="mt-12 flex flex-wrap gap-5">
            {ACTIONS.map(({ label, icon: Icon, rotate }) => (
              <div
                key={label}
                className={`flex items-center gap-2 rounded-md border-2 border-foreground/20 bg-transparent px-5 py-3 ${rotate}`}
              >
                <Icon className="h-4 w-4 text-destructive" />
                <span
                  className="text-sm uppercase tracking-[0.1em] text-foreground"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-6 max-w-lg text-sm leading-relaxed text-muted-foreground">
            Assigned per user, per folder or document, inherited from parent
            folders by default. Category and Document Type changes stay reserved
            for the Dean and Program Heads.
          </p>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-24">
        <p
          className="text-xs uppercase tracking-[0.2em] text-muted-foreground"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          Underneath the folders
        </p>
        <h2
          className="mt-3 text-3xl text-foreground md:text-4xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Built for records that need to hold up.
        </h2>

        <div className="mt-14 grid gap-px overflow-hidden rounded-lg border bg-border">
          <div className="grid gap-px sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <div key={title} className="bg-background p-8">
                <Icon className="h-5 w-5 text-primary" />
                <h3
                  className="mt-4 text-base font-medium text-foreground"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24" style={{ backgroundColor: INK }}>
        <div className="mx-auto max-w-6xl px-6 text-center">
          <h2
            className="text-3xl text-white md:text-5xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Get your records in order.
          </h2>
          <p className="mx-auto mt-4 max-w-md text-sm text-white/60">
            Ask your Dean&apos;s office to set up your program, or sign in if
            your account is already active.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Button
              size="lg"
              className="hover:opacity-90"
              render={<a href="/login" />}
              nativeButton={false}
            >
              Request access
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white/25 bg-transparent text-white hover:bg-white/10"
              render={<a href="/login" />}
              nativeButton={false}
            >
              Sign in
            </Button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer
        className="border-t py-10"
        style={{
          backgroundColor: INK,
          borderColor: "rgba(255,255,255,0.08)",
        }}
      >
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 text-xs text-white/50 md:flex-row">
          <span style={{ fontFamily: "var(--font-mono)" }}>
            CCS Archiving System
          </span>
          <span style={{ fontFamily: "var(--font-mono)" }}>
            BSCS · BSIT · BLIS
          </span>
        </div>
      </footer>
    </div>
  );
}
