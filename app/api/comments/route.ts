import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/admin-client"
import { hasDocumentAction } from "@/lib/permission-utils"

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const url = new URL(request.url)
    const documentId = url.searchParams.get("document_id")
    if (!documentId) {
      return NextResponse.json({ error: "document_id is required" }, { status: 400 })
    }

    const canView = await hasDocumentAction(user.id, documentId, "view")
    if (!canView) return NextResponse.json({ error: "Access denied" }, { status: 403 })

    const adminClient = createAdminClient()

    const { data: comments, error } = await adminClient
      .from("comments")
      .select("*, user:users!comments_user_id_fkey(full_name)")
      .eq("document_id", documentId)
      .order("created_at", { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ comments: comments ?? [] })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await request.json()
    const { document_id, content } = body

    if (!document_id || !content?.trim()) {
      return NextResponse.json({ error: "document_id and content are required" }, { status: 400 })
    }

    const canView = await hasDocumentAction(user.id, document_id, "view")
    if (!canView) return NextResponse.json({ error: "Access denied" }, { status: 403 })

    const adminClient = createAdminClient()

    const { data: comment, error } = await adminClient
      .from("comments")
      .insert({
        document_id,
        user_id: user.id,
        content: content.trim(),
      })
      .select("*, user:users!comments_user_id_fkey(full_name)")
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const { data: doc } = await adminClient
      .from("documents")
      .select("title, folder_id, owner_id")
      .eq("id", document_id)
      .single()

    if (doc) {
      const userIds = new Set<string>()

      const { data: existingCommenters } = await adminClient
        .from("comments")
        .select("user_id")
        .eq("document_id", document_id)
        .neq("user_id", user.id)

      if (existingCommenters) {
        for (const c of existingCommenters) {
          userIds.add(c.user_id)
        }
      }

      if (doc.owner_id !== user.id) {
        userIds.add(doc.owner_id)
      }

      for (const uid of userIds) {
        await adminClient.from("notifications").insert({
          user_id: uid,
          type: "comment",
          title: "New comment",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          body: `${(comment?.user as any)?.full_name ?? "Someone"} commented on "${doc.title}"`,
          resource_type: "document",
          resource_id: document_id,
        })
      }
    }

    return NextResponse.json({ comment }, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
