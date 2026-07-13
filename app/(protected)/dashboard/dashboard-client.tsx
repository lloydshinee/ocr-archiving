"use client"

import { useEffect, useState } from "react"
import {
  FolderIcon,
  FileIcon,
  UsersIcon,
  HardDriveIcon,
  ArchiveIcon,
  ShieldIcon,
  ClockIcon,
  SearchIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"
import { SmartDropZone } from "@/components/smart-drop-zone"

interface DashboardData {
  role: string
  stats: Record<string, number> | null
  recent_uploads: { id: string; title: string; file_type: string; created_at: string; uploaded_by: string }[]
  recent_modified: { id: string; title: string; updated_at: string }[]
  document_categories: Record<string, number> | null
  users_by_role: Record<string, number> | null
  recent_audit_entries: { id: string; action: string; resource_type: string; created_at: string; user_name: string }[]
  inactive_users: { id: string; full_name: string; email: string; role: string }[]
  recent_documents: { id: string; title: string; file_type: string; created_at: string }[]
}

export function DashboardPageClient() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/dashboard")
      .then((res) => res.ok ? res.json() : null)
      .then((json) => setData(json))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col gap-10">
        <div>
          <Skeleton className="h-4 w-24" />
          <Skeleton className="mt-2 h-8 w-40" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-10">
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

      {data?.stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={FileIcon}
            label="Documents"
            value={formatNumber(data.stats.total_documents)}
          />
          <StatCard
            icon={FolderIcon}
            label="Folders"
            value={formatNumber(data.stats.total_folders)}
          />
          <StatCard
            icon={HardDriveIcon}
            label="Storage"
            value={formatBytes(data.stats.total_storage_bytes)}
          />
          <StatCard
            icon={UsersIcon}
            label="Active Users"
            value={formatNumber(data.stats.active_users)}
          />
          <StatCard
            icon={ArchiveIcon}
            label="Archived"
            value={formatNumber(data.stats.archived_documents)}
          />
          <StatCard
            icon={ShieldIcon}
            label="Permissions"
            value={formatNumber(data.stats.total_permissions)}
          />
        </div>
      )}

      {!data?.stats && data?.recent_documents && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            icon={FileIcon}
            label="Recent Documents"
            value={formatNumber(data.recent_documents.length)}
          />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 border-b pb-6">
        <p
          className="text-xs uppercase tracking-[0.15em] text-muted-foreground"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          Quick actions
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/search">
            <Button size="sm">
              <SearchIcon className="size-4" /> Search
            </Button>
          </Link>
        </div>
      </div>

      <SmartDropZone />

      {data?.recent_uploads && data.recent_uploads.length > 0 && (
        <Section title="Recent uploads" icon={ClockIcon}>
          <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
            <div className="divide-y">
              {data.recent_uploads.slice(0, 5).map((item) => (
                <Link
                  key={item.id}
                  href={`/dashboard/documents/${item.id}`}
                  className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-muted/30 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{item.title}</p>
                    <div className="mt-0.5 flex items-center gap-3 text-[11px] text-muted-foreground/50">
                      <span>{item.uploaded_by}</span>
                    </div>
                  </div>
                  <span
                    className="shrink-0 text-[11px] text-muted-foreground/50"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {timeAgo(item.created_at)}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </Section>
      )}

      {data?.recent_modified && data.recent_modified.length > 0 && (
        <Section title="Recently modified" icon={ClockIcon}>
          <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
            <div className="divide-y">
              {data.recent_modified.slice(0, 5).map((item) => (
                <Link
                  key={item.id}
                  href={`/dashboard/documents/${item.id}`}
                  className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-muted/30 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{item.title}</p>
                    <div className="mt-0.5 flex items-center gap-3 text-[11px] text-muted-foreground/50">
                      <span>modified</span>
                    </div>
                  </div>
                  <span
                    className="shrink-0 text-[11px] text-muted-foreground/50"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {timeAgo(item.updated_at)}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </Section>
      )}

      {data?.recent_documents && data.recent_documents.length > 0 && !data?.stats && (
        <Section title="Recent documents" icon={ClockIcon}>
          <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
            <div className="divide-y">
              {data.recent_documents.slice(0, 5).map((item) => (
                <Link
                  key={item.id}
                  href={`/dashboard/documents/${item.id}`}
                  className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-muted/30 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{item.title}</p>
                  </div>
                  <span
                    className="shrink-0 text-[11px] text-muted-foreground/50"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {timeAgo(item.created_at)}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </Section>
      )}

      {data?.document_categories && Object.keys(data.document_categories).length > 0 && (
        <Section title="Document categories" icon={FileIcon}>
          <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
            <div className="divide-y">
              {Object.entries(data.document_categories).map(([name, count]) => (
                <div
                  key={name}
                  className="flex items-center justify-between px-5 py-3"
                >
                  <span className="text-sm">{name}</span>
                  <span
                    className="text-xs text-muted-foreground"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {count} document{count !== 1 ? "s" : ""}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Section>
      )}

      {data?.users_by_role && (
        <Section title="Users by role" icon={UsersIcon}>
          <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
            <div className="divide-y">
              {Object.entries(data.users_by_role).map(([role, count]) => (
                <div
                  key={role}
                  className="flex items-center justify-between px-5 py-3"
                >
                  <span className="text-sm capitalize">{role.replace("_", " ")}</span>
                  <span
                    className="text-xs text-muted-foreground"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Section>
      )}

      {data?.recent_audit_entries && data.recent_audit_entries.length > 0 && (
        <Section title="Recent audit activity" icon={ShieldIcon}>
          <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
            <div className="divide-y">
              {data.recent_audit_entries.slice(0, 5).map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between gap-4 px-5 py-3.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">
                      <span className="font-medium">{entry.user_name}</span>{" "}
                      {formatAction(entry.action)} a {entry.resource_type}
                    </p>
                  </div>
                  <span
                    className="shrink-0 text-[11px] text-muted-foreground/50"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {timeAgo(entry.created_at)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Section>
      )}

      {data?.inactive_users && data.inactive_users.length > 0 && (
        <Section title="Inactive users (30+ days)" icon={UsersIcon}>
          <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
            <div className="divide-y">
              {data.inactive_users.slice(0, 5).map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between px-5 py-3"
                >
                  <div>
                    <p className="text-sm">{u.full_name}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </div>
                  <span
                    className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground/50"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {u.role.replace("_", " ")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Section>
      )}
    </div>
  )
}

function StatCard({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
        <Icon className="size-5 text-primary" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-2xl font-semibold">{value}</p>
        <p
          className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          {label}
        </p>
      </div>
    </div>
  )
}

function Section({ title, icon: Icon, children }: { title: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <Icon className="size-3.5 text-muted-foreground" />
        <p
          className="text-xs uppercase tracking-[0.15em] text-muted-foreground"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          {title}
        </p>
      </div>
      {children}
    </div>
  )
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M"
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K"
  return n.toString()
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B"
  const units = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return (bytes / Math.pow(1024, i)).toFixed(1) + " " + units[i]
}

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const date = new Date(dateStr).getTime()
  const diff = now - date
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "now"
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function formatAction(action: string): string {
  const map: Record<string, string> = {
    upload: "uploaded",
    download: "downloaded",
    edit: "edited",
    delete: "deleted",
    delete_document: "deleted",
    restore: "restored",
    restore_document: "restored",
    move: "moved",
    folder_create: "created",
    grant_permission: "granted permissions on",
    modify_permission: "modified permissions on",
    revoke_permission: "revoked permissions on",
    archive_document: "archived",
    unarchive_document: "unarchived",
    archive_folder: "archived",
    unarchive_folder: "unarchived",
    archive: "archived",
    permanent_delete: "permanently deleted",
    restore_version: "restored version of",
    version_update: "updated version of",
    login: "logged in",
    permission_change: "changed permissions on",
    ownership_transfer: "transferred ownership of",

  }
  return map[action] ?? action
}
