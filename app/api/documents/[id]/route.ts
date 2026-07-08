import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/admin-client"
import {
  hasDocumentAction,
  getUserProfile,
  isFolderLocked,
  canBypassLock,
} from "@/lib/permission-utils"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params

    const canView = await hasDocumentAction(user.id, id, "view")
    if (!canView) return NextResponse.json({ error: "Access denied" }, { status: 403 })

    const adminClient = createAdminClient()

    const { data: doc } = await adminClient
      .from("documents")
      .select("*, category:categories(name), document_type:document_types(name)")
      .eq("id", id)
      .is("deleted_at", null)
      .single()

    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    const { data: versions } = await adminClient
      .from("document_versions")
      .select("*")
      .eq("document_id", id)
      .order("version_number", { ascending: false })

    const { data: tagLinks } = await adminClient
      .from("document_tags")
      .select("tag_id")
      .eq("document_id", id)

    let tags: { id: string; name: string }[] = []

    if (tagLinks && tagLinks.length > 0) {
      const { data: tagData } = await adminClient
        .from("tags")
        .select("id, name")
        .in(
          "id",
          tagLinks.map((t) => t.tag_id),
        )
      tags = tagData ?? []
    }

    const { data: owner } = await adminClient
      .from("users")
      .select("full_name")
      .eq("id", doc.owner_id)
      .single()

    const currentVersion = versions?.find(
      (v) => v.id === doc.current_version_id,
    )

    return NextResponse.json({
      document: {
        ...doc,
        tags,
        owner_name: owner?.full_name ?? "Unknown",
        version_count: versions?.length ?? 0,
        current_version_number: currentVersion?.version_number ?? null,
      },
      versions: versions ?? [],
      tags,
    })
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const profile = await getUserProfile(user.id)
    if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params
    const body = await request.json()
    const { title, description, folderId, categoryId, documentTypeId, tags: tagsStr } = body

    const adminClient = createAdminClient()

    const { data: existing } = await adminClient
      .from("documents")
      .select("id, owner_id, folder_id")
      .eq("id", id)
      .is("deleted_at", null)
      .single()

    if (!existing) return NextResponse.json({ error: "Document not found" }, { status: 404 })

    const canEdit = await hasDocumentAction(user.id, id, "edit")
    if (!canEdit) return NextResponse.json({ error: "Unauthorized" }, { status: 403 })

    if (existing.folder_id) {
      const locked = await isFolderLocked(existing.folder_id)
      if (locked && !(await canBypassLock(user.id))) {
        return NextResponse.json({ error: "The folder containing this document is locked" }, { status: 403 })
      }
    }

    const isDean = profile.role === "dean"

    const updateData: {
      updated_at: string
      title?: string
      description?: string | null
      folder_id?: string
      category_id?: string | null
      document_type_id?: string | null
    } = {
      updated_at: new Date().toISOString(),
    }

    if (title !== undefined && title.trim().length > 0) {
      updateData.title = title.trim()
    }

    if (description !== undefined) {
      updateData.description = description?.trim() ?? null
    }

    if (folderId !== undefined) {
      updateData.folder_id = folderId
    }

    if (isDean && categoryId !== undefined) {
      updateData.category_id = categoryId
    }

    if ((isDean || profile.role === "program_head") && documentTypeId !== undefined) {
      updateData.document_type_id = documentTypeId
    }

    if (tagsStr !== undefined) {
      const tagNames: string[] = tagsStr
        ? tagsStr.split(",").map((t: string) => t.trim()).filter(Boolean)
        : []

      await adminClient.from("document_tags").delete().eq("document_id", id)

      for (const tagName of tagNames) {
        const { data: existingTag } = await adminClient
          .from("tags")
          .select("id")
          .eq("name", tagName)
          .single()

        let tagId = existingTag?.id

        if (!tagId) {
          const { data: newTag } = await adminClient
            .from("tags")
            .insert({ name: tagName })
            .select()
            .single()
          tagId = newTag?.id
        }

        if (tagId) {
          await adminClient
            .from("document_tags")
            .insert({ document_id: id, tag_id: tagId })
        }
      }
    }

    const { data: doc, error } = await adminClient
      .from("documents")
      .update(updateData)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ document: doc })
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}
