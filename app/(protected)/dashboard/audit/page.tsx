"use client"

import { useEffect, useState, useCallback } from "react"
import { ShieldIcon, SearchIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"

interface AuditEntry {
  id: string
  user_id: string
  user_name: string
  user_email: string
  user_role: string
  action: string
  resource_type: string
  resource_id: string | null
  details: Record<string, unknown>
  created_at: string
}

interface AuditData {
  entries: AuditEntry[]
  total: number
  page: number
  limit: number
  valid_actions: string[]
  users: { id: string; full_name: string; email: string }[]
}

const ACTION_LABELS: Record<string, string> = {
  login: "Login", upload: "Upload", download: "Download", edit: "Edit",
  delete: "Delete", delete_document: "Delete", delete_folder: "Delete",
  restore: "Restore", restore_document: "Restore", restore_folder: "Restore",
  move: "Move", folder_create: "Create",
  grant_permission: "Grant", modify_permission: "Modify", revoke_permission: "Revoke",
  bulk_grant_permission: "Bulk Grant", bulk_revoke_permission: "Bulk Revoke",
  archive_document: "Archive", unarchive_document: "Unarchive",
  archive_folder: "Archive", unarchive_folder: "Unarchive",
  archive: "Archive", permanent_delete: "Purge",
  restore_version: "Restore Version", version_update: "Version Update",
  lock_folder: "Lock", unlock_folder: "Unlock",
  transfer_ownership: "Transfer", ownership_transfer: "Transfer",
  delete_version: "Delete Version", permission_change: "Permission Change",
}

const ACTION_COLORS: Record<string, string> = {
  login: "bg-blue-200 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300",
  upload: "bg-emerald-200 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300",
  download: "bg-slate-200 text-slate-800 dark:bg-slate-800/50 dark:text-slate-300",
  edit: "bg-sky-200 text-sky-800 dark:bg-sky-900/50 dark:text-sky-300",
  delete: "bg-red-200 text-red-800 dark:bg-red-900/50 dark:text-red-300",
  delete_document: "bg-red-200 text-red-800 dark:bg-red-900/50 dark:text-red-300",
  delete_folder: "bg-red-200 text-red-800 dark:bg-red-900/50 dark:text-red-300",
  restore: "bg-teal-200 text-teal-800 dark:bg-teal-900/50 dark:text-teal-300",
  restore_document: "bg-teal-200 text-teal-800 dark:bg-teal-900/50 dark:text-teal-300",
  restore_folder: "bg-teal-200 text-teal-800 dark:bg-teal-900/50 dark:text-teal-300",
  move: "bg-orange-200 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300",
  folder_create: "bg-emerald-200 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300",
  grant_permission: "bg-violet-200 text-violet-800 dark:bg-violet-900/50 dark:text-violet-300",
  modify_permission: "bg-violet-200 text-violet-800 dark:bg-violet-900/50 dark:text-violet-300",
  revoke_permission: "bg-red-200 text-red-800 dark:bg-red-900/50 dark:text-red-300",
  bulk_grant_permission: "bg-violet-200 text-violet-800 dark:bg-violet-900/50 dark:text-violet-300",
  bulk_revoke_permission: "bg-red-200 text-red-800 dark:bg-red-900/50 dark:text-red-300",
  archive_document: "bg-amber-200 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300",
  unarchive_document: "bg-amber-200 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300",
  archive_folder: "bg-amber-200 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300",
  unarchive_folder: "bg-amber-200 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300",
  archive: "bg-amber-200 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300",
  permanent_delete: "bg-red-200 text-red-800 dark:bg-red-900/50 dark:text-red-300",
  restore_version: "bg-teal-200 text-teal-800 dark:bg-teal-900/50 dark:text-teal-300",
  version_update: "bg-sky-200 text-sky-800 dark:bg-sky-900/50 dark:text-sky-300",
  lock_folder: "bg-rose-200 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300",
  unlock_folder: "bg-rose-200 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300",
  transfer_ownership: "bg-purple-200 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300",
  ownership_transfer: "bg-purple-200 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300",
  delete_version: "bg-red-200 text-red-800 dark:bg-red-900/50 dark:text-red-300",
  permission_change: "bg-violet-200 text-violet-800 dark:bg-violet-900/50 dark:text-violet-300",
}

export default function AuditLogPage() {
  const [data, setData] = useState<AuditData | null>(null)
  const [loading, setLoading] = useState(true)
  const [filterUserId, setFilterUserId] = useState("")
  const [filterAction, setFilterAction] = useState("")
  const [filterResourceType, setFilterResourceType] = useState("")
  const [filterDateFrom, setFilterDateFrom] = useState("")
  const [filterDateTo, setFilterDateTo] = useState("")
  const [page, setPage] = useState(1)

  const fetchData = useCallback(async (p: number) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterUserId) params.set("user_id", filterUserId)
      if (filterAction) params.set("action", filterAction)
      if (filterResourceType) params.set("resource_type", filterResourceType)
      if (filterDateFrom) params.set("date_from", filterDateFrom)
      if (filterDateTo) params.set("date_to", filterDateTo)
      params.set("page", p.toString())
      params.set("limit", "50")

      const res = await fetch(`/api/audit?${params.toString()}`)
      if (res.ok) {
        const json = await res.json()
        setData(json)
        setPage(p)
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [filterUserId, filterAction, filterResourceType, filterDateFrom, filterDateTo])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData(1)
  }, [fetchData])

  const totalPages = data ? Math.ceil(data.total / data.limit) : 1

  function formatAction(action: string): string {
    return ACTION_LABELS[action] ?? action.replace(/_/g, " ")
  }

  function describe(entry: AuditEntry): string {
    const d = entry.details ?? {}
    const rt = entry.resource_type
    const item = d.item ? `"${d.item}"` : d.title ? `"${d.title}"` : d.file_name ? `"${d.file_name}"` : d.new_name ? `"${d.new_name}"` : rt

    switch (entry.action) {
      case "move":
        return `moved ${rt} ${item} from "${d.from}" to "${d.to}"`
      case "upload":
        return `uploaded ${rt} "${d.file_name}"`
      case "download":
        return `downloaded ${rt} "${d.file_name}"`
      case "edit":
        return d.new_name
          ? `renamed ${rt} "${d.item}" to "${d.new_name}"`
          : `edited ${rt} ${item}`
      case "folder_create":
        return `created ${rt} ${item}`
      case "delete":
      case "delete_document":
      case "delete_folder":
        return `deleted ${rt} ${item}`
      case "restore":
      case "restore_document":
      case "restore_folder":
        return `restored ${rt} ${item}`
      case "archive":
      case "archive_document":
      case "archive_folder":
        return `archived ${rt} ${item}`
      case "unarchive_document":
      case "unarchive_folder":
        return `unarchived ${rt} ${item}`
      case "permanent_delete":
        return `permanently deleted ${rt} ${item}`
      case "lock_folder":
        return `locked ${rt} ${item}`
      case "unlock_folder":
        return `unlocked ${rt} ${item}`
      case "transfer_ownership":
      case "ownership_transfer":
        return `transferred ownership of ${rt} ${item}`
      case "grant_permission":
        return `granted permissions on ${rt} ${item}`
      case "modify_permission":
        return `modified permissions on ${rt} ${item}`
      case "revoke_permission":
        return `revoked permissions on ${rt} ${item}`
      case "bulk_grant_permission":
        return `bulk granted ${rt} permissions (${d.target_role})`
      case "bulk_revoke_permission":
        return `bulk revoked ${rt} permissions (${d.target_role})`
      case "restore_version":
        return `restored version ${d.version_number} of ${rt} ${item}`
      case "version_update":
        return `updated version of ${rt} ${item}`
      case "delete_version":
        return `deleted version ${d.deleted_version} of ${rt} ${item}`
      case "login":
        return "logged in"
      default:
        return `${entry.action} ${rt} ${item}`
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p
          className="text-xs uppercase tracking-[0.2em] text-muted-foreground"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          Monitoring
        </p>
        <h1
          className="mt-2 text-2xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Audit Log
        </h1>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-1.5">
          <Label className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            User
          </Label>
          <select
            value={filterUserId}
            onChange={(e) => setFilterUserId(e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
          >
            <option value="">All users</option>
            {(data?.users ?? []).map((u) => (
              <option key={u.id} value={u.id}>
                {u.full_name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            Action
          </Label>
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
          >
            <option value="">All actions</option>
            {(data?.valid_actions ?? []).map((a) => (
              <option key={a} value={a}>
                {formatAction(a)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            Resource type
          </Label>
          <input
            value={filterResourceType}
            onChange={(e) => setFilterResourceType(e.target.value)}
            placeholder="e.g. document"
            className="h-8 rounded-md border border-input bg-background px-2 text-xs w-28"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            From
          </Label>
          <input
            type="date"
            value={filterDateFrom}
            onChange={(e) => setFilterDateFrom(e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            To
          </Label>
          <input
            type="date"
            value={filterDateTo}
            onChange={(e) => setFilterDateTo(e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
          />
        </div>

        <Button size="sm" onClick={() => fetchData(1)} className="shrink-0">
          <SearchIcon className="size-3.5" /> Filter
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : data && data.entries.length > 0 ? (
        <>
          <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
            <div className="divide-y">
              {data.entries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex flex-wrap items-center justify-between gap-4 px-5 py-3.5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{entry.user_name}</span>
                      <span
                        className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground/50"
                        style={{ fontFamily: "var(--font-mono)" }}
                      >
                        {entry.user_role.replace("_", " ")}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      <span
                        className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium ${ACTION_COLORS[entry.action] ?? "bg-muted text-muted-foreground"}`}
                        style={{ fontFamily: "var(--font-mono)" }}
                      >
                        {formatAction(entry.action)}
                      </span>{" "}
                      {describe(entry)}
                    </p>
                  </div>
                  <span
                    className="shrink-0 text-[11px] text-muted-foreground/50"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {new Date(entry.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {data.total} total entries
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => fetchData(page - 1)}
              >
                <ChevronLeftIcon className="size-3.5" /> Previous
              </Button>
              <span className="text-xs text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => fetchData(page + 1)}
              >
                Next <ChevronRightIcon className="size-3.5" />
              </Button>
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-xl border bg-card p-10 shadow-sm">
          <ShieldIcon className="size-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No audit entries found</p>
        </div>
      )}
    </div>
  )
}
