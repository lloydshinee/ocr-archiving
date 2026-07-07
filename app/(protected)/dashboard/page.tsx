import { FolderIcon, UsersIcon, TagsIcon, FileIcon, BellIcon, ClockIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

const STATS = [
  { label: "Documents", value: "1,247", icon: FileIcon },
  { label: "Folders", value: "43", icon: FolderIcon },
  { label: "Users", value: "18", icon: UsersIcon },
  { label: "Categories", value: "8", icon: TagsIcon },
]

const RECENT = [
  { action: "R. Santos uploaded Level II Survey 2026.pdf", time: "2 min ago", folder: "BSCS / Accreditation" },
  { action: "Dean archived Curriculum Draft v3", time: "15 min ago", folder: "BLIS / Curriculum" },
  { action: "M. Cruz restored Faculty Handbook (v4)", time: "1 hour ago", folder: "College-Wide / Handbooks" },
  { action: "J. Reyes granted Edit permission", time: "3 hours ago", folder: "BSIT / Faculty Records" },
  { action: "A. Del Rosario commented on Minutes", time: "5 hours ago", folder: "College-Wide / Minutes" },
]

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-10">
      {/* Page heading */}
      <div>
        <p
          className="text-xs uppercase tracking-[0.2em] text-muted-foreground"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          Overview
        </p>
        <h1
          className="mt-2 text-2xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Dashboard
        </h1>
      </div>

      {/* Stats — ledger cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="flex items-center gap-4 rounded-xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
              <Icon className="size-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p
                className="truncate text-2xl font-semibold"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {value}
              </p>
              <p
                className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                {label}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap items-center gap-3 border-b pb-6">
        <p
          className="text-xs uppercase tracking-[0.15em] text-muted-foreground"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          Quick actions
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm">
            <FolderIcon className="size-4" /> New folder
          </Button>
          <Button variant="outline" size="sm">
            <FileIcon className="size-4" /> Upload file
          </Button>
        </div>
      </div>

      {/* Recent activity */}
      <div>
        <div className="mb-4 flex items-center gap-2">
          <ClockIcon className="size-3.5 text-muted-foreground" />
          <p
            className="text-xs uppercase tracking-[0.15em] text-muted-foreground"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            Recent activity
          </p>
        </div>

        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <div className="divide-y">
            {RECENT.map((item, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-4 px-5 py-3.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{item.action}</p>
                  <p
                    className="mt-1 text-[11px] text-muted-foreground"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {item.folder}
                  </p>
                </div>
                <span
                  className="shrink-0 text-[11px] text-muted-foreground/50"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  {item.time}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Announcement */}
      <div className="flex items-start gap-3 rounded-xl border bg-card p-5 shadow-sm">
        <BellIcon className="mt-0.5 size-5 shrink-0 text-primary" />
        <div>
          <p className="text-sm font-medium">Folder lock feature is now available</p>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
            Program Heads can now lock folders to prevent modifications. Only the Dean or
            the locking Program Head can unlock them.
          </p>
        </div>
      </div>
    </div>
  )
}
