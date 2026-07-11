"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { createClient } from "@/lib/supabase/browser"
import { BellIcon, CheckCheckIcon, FileIcon, MessageSquareIcon, ShieldIcon, ArchiveIcon } from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import Link from "next/link"

interface Notification {
  id: string
  type: string
  title: string
  body: string | null
  resource_type: string | null
  resource_id: string | null
  is_read: boolean
  created_at: string
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [open, setOpen] = useState(false)
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null)

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?limit=10")
      if (!res.ok) return
      const data = await res.json()
      setNotifications(data.notifications ?? [])
      setUnreadCount(data.unread_count ?? 0)
    } catch {
      // silent
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchNotifications()

    const supabase = createClient()

    supabase.auth.getUser().then(({ data: { user } }) => {
      const userId = user?.id
      if (!userId) return

      const topic = `notifications:${userId}`
      const existing = supabase.getChannels().find((c) => c.topic === topic)
      if (existing) supabase.removeChannel(existing)

      const channel = supabase
        .channel(topic)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          () => {
            fetchNotifications()
          },
        )
        .subscribe()

      channelRef.current = channel
    })

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current)
    }
  }, [fetchNotifications])

  async function markAsRead(id: string) {
    await fetch(`/api/notifications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_read: true }),
    })
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
    )
    setUnreadCount((prev) => Math.max(0, prev - 1))
  }

  async function markAllAsRead() {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id)
    await Promise.all(
      unreadIds.map((id) =>
        fetch(`/api/notifications/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_read: true }),
        }),
      ),
    )
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    setUnreadCount(0)
  }

  function getIcon(type: string) {
    switch (type) {
      case "document":
        return <FileIcon className="size-3.5" />
      case "comment":
        return <MessageSquareIcon className="size-3.5" />
      case "permission":
        return <ShieldIcon className="size-3.5" />
      case "archive":
        return <ArchiveIcon className="size-3.5" />
      default:
        return <BellIcon className="size-3.5" />
    }
  }

  function getResourceUrl(n: Notification): string {
    if (n.resource_type === "document" && n.resource_id) {
      return `/dashboard/documents/${n.resource_id}`
    }
    if (n.resource_type === "folder" && n.resource_id) {
      return `/dashboard/folders/${n.resource_id}`
    }
    return "#"
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            className="relative text-white/70 hover:text-white hover:bg-white/10 inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors size-8"
          >
            <BellIcon className="size-4" />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[9px] font-medium text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
        }
      />
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-4 py-2.5">
          <p
            className="text-xs uppercase tracking-[0.15em] text-muted-foreground"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            Notifications
          </p>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              <CheckCheckIcon className="size-3" />
              Mark all read
            </button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-8">
            <BellIcon className="size-6 text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground">No notifications yet</p>
          </div>
        ) : (
          <div className="flex max-h-80 flex-col divide-y overflow-y-auto">
            {notifications.map((n) => (
              <Link
                key={n.id}
                href={getResourceUrl(n)}
                onClick={() => {
                  if (!n.is_read) markAsRead(n.id)
                  setOpen(false)
                }}
                className={`flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/50 ${
                  !n.is_read ? "bg-muted/20" : ""
                }`}
              >
                <div className="mt-0.5 shrink-0 text-muted-foreground">
                  {getIcon(n.type)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{n.title}</p>
                  {n.body && (
                    <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                      {n.body}
                    </p>
                  )}
                  <p
                    className="mt-1 text-[10px] text-muted-foreground/50"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {new Date(n.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                {!n.is_read && (
                  <div className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                )}
              </Link>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
