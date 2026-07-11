"use client"

import { useEffect, useState, useRef } from "react"
import { createClient } from "@/lib/supabase/browser"
import { MessageSquareIcon, Trash2Icon, SendIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"

interface Comment {
  id: string
  document_id: string
  user_id: string
  content: string
  created_at: string
  updated_at: string
  user: { full_name: string } | null
}

interface CommentPanelProps {
  documentId: string
  currentUserId: string
  currentUserRole: string
}

export function CommentPanel({ documentId, currentUserId, currentUserRole }: CommentPanelProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [newComment, setNewComment] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function fetchComments() {
      try {
        const res = await fetch(`/api/comments?document_id=${documentId}`)
        if (!res.ok) throw new Error("Failed to fetch comments")
        const data = await res.json()
        setComments(data.comments ?? [])
      } catch {
        toast.error("Failed to load comments")
      } finally {
        setLoading(false)
      }
    }

    fetchComments()

    const supabase = createClient()
    const channel = supabase
      .channel(`comments:${documentId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "comments",
          filter: `document_id=eq.${documentId}`,
        },
        (payload) => {
          const raw = payload.new as Record<string, unknown>
          const newComment: Comment = {
            id: raw.id as string,
            document_id: raw.document_id as string,
            user_id: raw.user_id as string,
            content: raw.content as string,
            created_at: raw.created_at as string,
            updated_at: raw.updated_at as string,
            user: null,
          }
          setComments((prev) => {
            if (prev.some((c) => c.id === newComment.id)) return prev
            return [...prev, newComment]
          })
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "comments",
          filter: `document_id=eq.${documentId}`,
        },
        (payload) => {
          const deletedId = payload.old.id as string
          setComments((prev) => prev.filter((c) => c.id !== deletedId))
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [documentId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [comments])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!newComment.trim() || submitting) return

    setSubmitting(true)
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document_id: documentId, content: newComment.trim() }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? "Failed to post comment")
      }

      const data = await res.json()

      if (data.comment) {
        setComments((prev) => {
          if (prev.some((c) => c.id === data.comment.id)) return prev
          return [...prev, data.comment]
        })
      }

      setNewComment("")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to post comment")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(commentId: string) {
    try {
      const res = await fetch(`/api/comments/${commentId}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete comment")
      toast.success("Comment deleted")
    } catch {
      toast.error("Failed to delete comment")
    }
  }

  return (
    <div className="rounded-xl border bg-card shadow-sm">
      <div className="flex items-center gap-2 border-b px-5 py-3">
        <MessageSquareIcon className="size-3.5 text-muted-foreground" />
        <p
          className="text-xs uppercase tracking-[0.15em] text-muted-foreground"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          Comments ({comments.length})
        </p>
      </div>

      <div className="flex max-h-80 flex-col gap-3 overflow-y-auto px-5 py-4">
        {loading ? (
          <p className="text-xs text-muted-foreground">Loading comments...</p>
        ) : comments.length === 0 ? (
          <p className="text-xs text-muted-foreground">No comments yet.</p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex size-6 items-center justify-center rounded-full bg-muted text-[10px] font-medium uppercase text-muted-foreground">
                    {(comment.user?.full_name ?? "?")[0]}
                  </div>
                  <span className="text-xs font-medium">{comment.user?.full_name ?? "Unknown"}</span>
                  <span
                    className="text-[10px] text-muted-foreground/50"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {new Date(comment.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                {(comment.user_id === currentUserId || currentUserRole === "dean") && (
                  <button
                    onClick={() => handleDelete(comment.id)}
                    className="text-muted-foreground/40 hover:text-destructive transition-colors"
                    title="Delete comment"
                  >
                    <Trash2Icon className="size-3" />
                  </button>
                )}
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed pl-8">
                {comment.content}
              </p>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 border-t p-3">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Write a comment..."
          className="min-h-0 resize-none text-sm"
          rows={2}
        />
        <Button
          type="submit"
          size="icon"
          disabled={!newComment.trim() || submitting}
          className="shrink-0 self-end"
        >
          <SendIcon className="size-4" />
        </Button>
      </form>
    </div>
  )
}
