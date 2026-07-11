import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/admin-client";
import { FolderBreadcrumb } from "@/components/folder-breadcrumb";
import { DocumentDialog } from "@/components/document-dialog";
import { CommentPanel } from "@/components/comment-panel";
import { notFound } from "next/navigation";
import { ViewButton } from "./view-button";
import {
  FileIcon,
  DownloadIcon,
  HistoryIcon,
  TagIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DocumentActions } from "./document-actions";
import { VersionActions } from "@/components/version-actions";
import { hasDocumentAction, getUserProfile, isFolderLocked } from "@/lib/permission-utils";
import { OcrStatusBadge } from "@/components/ocr-status-badge";
import { isOcrEligible } from "@/lib/search-utils";

export default async function DocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const profile = await getUserProfile(user.id);

  const adminClient = createAdminClient();

  const { data: doc } = await adminClient
    .from("documents")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (!doc) notFound();

  const isLocked = doc.folder_id ? await isFolderLocked(doc.folder_id) : false;

  const categoryPromise = doc.category_id
    ? adminClient
        .from("categories")
        .select("name")
        .eq("id", doc.category_id)
        .single()
    : Promise.resolve({ data: null });

  const docTypePromise = doc.document_type_id
    ? adminClient
        .from("document_types")
        .select("name")
        .eq("id", doc.document_type_id)
        .single()
    : Promise.resolve({ data: null });

  const { data: tagLinks } = await adminClient
    .from("document_tags")
    .select("tag_id")
    .eq("document_id", id);

  let tags: { id: string; name: string }[] = [];
  if (tagLinks && tagLinks.length > 0) {
    const { data: tagData } = await adminClient
      .from("tags")
      .select("id, name")
      .in(
        "id",
        tagLinks.map((t) => t.tag_id),
      );
    tags = tagData ?? [];
  }

  const { data: versions } = await adminClient
    .from("document_versions")
    .select("*")
    .eq("document_id", id)
    .order("version_number", { ascending: false });

  const { data: owner } = await adminClient
    .from("users")
    .select("full_name")
    .eq("id", doc.owner_id)
    .single();

  const [{ data: categoryData }, { data: docTypeData }] = await Promise.all([
    categoryPromise,
    docTypePromise,
  ]);

  const currentVersion = versions?.find((v) => v.id === doc.current_version_id);

  const breadcrumbs = await getFolderPath(doc.folder_id);
  breadcrumbs.push({ id: doc.id, name: doc.title });

  return (
    <div className="flex flex-col gap-6">
      <FolderBreadcrumb items={breadcrumbs} />

      <div>
        <p
          className="text-xs uppercase tracking-[0.2em] text-muted-foreground"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          Document
        </p>
        <h1
          className="mt-1 text-2xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {doc.title}
        </h1>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {docTypeData?.name && (
            <Badge variant="outline">{docTypeData.name}</Badge>
          )}
          {categoryData?.name && (
            <Badge variant="secondary">{categoryData.name}</Badge>
          )}
          {tags.map((t) => (
            <span
              key={t.id}
              className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-[11px]"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              <TagIcon className="mr-1 size-3" />
              {t.name}
            </span>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
          <span>
            Uploaded by{" "}
            <span className="font-medium text-foreground">
              {owner?.full_name ?? "Unknown"}
            </span>
          </span>
          <span style={{ fontFamily: "var(--font-mono)" }}>
            {new Date(doc.created_at).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </span>
          <span>
            Modified{" "}
            <span style={{ fontFamily: "var(--font-mono)" }}>
              {new Date(doc.updated_at).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </span>
          </span>
          <span style={{ fontFamily: "var(--font-mono)" }}>
            {versions?.length ?? 0} version
            {(versions?.length ?? 0) !== 1 ? "s" : ""}
          </span>
          <span style={{ fontFamily: "var(--font-mono)" }}>
            {(doc.file_size / 1024 / 1024).toFixed(2)} MB
          </span>
          {doc.is_archived && (
            <span
              className="px-2 py-0.5 rounded text-[10px] uppercase tracking-[0.12em] bg-amber-200 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              Archived
            </span>
          )}
          {currentVersion && isOcrEligible(doc.file_type) && (
            <OcrStatusBadge
              status={currentVersion.ocr_status}
              versionId={currentVersion.id}
            />
          )}
        </div>
      </div>

      {doc.description && (
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {doc.description}
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-2 items-center">
        <ViewButton
          documentId={doc.id}
          title={doc.title}
          fileType={doc.file_type}
        />
        <a
          href={`/api/documents/${doc.id}/download`}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <DownloadIcon className="size-4" /> Download
        </a>
        <a
          href={`/api/documents/${doc.id}/download`}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <FileIcon className="size-4" /> Current version (v
          {versions?.find((v) => v.id === doc.current_version_id)
            ?.version_number ?? "?"}
          )
        </a>
        {await hasDocumentAction(user.id, doc.id, "edit") && (
          <DocumentDialog
            mode="edit"
            folderId={doc.folder_id ?? ""}
            folderName=""
            disabled={isLocked}
            document={{
              id: doc.id,
              title: doc.title,
              description: doc.description,
              category_id: doc.category_id,
              document_type_id: doc.document_type_id,
              tags,
            }}
          />
        )}
        <DocumentActions
          documentId={doc.id}
          documentTitle={doc.title}
          isArchived={doc.is_archived ?? false}
          isLocked={isLocked}
          canArchive={await hasDocumentAction(user.id, doc.id, "archive")}
          canDelete={await hasDocumentAction(user.id, doc.id, "delete")}
        />
      </div>

      {versions && versions.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <HistoryIcon className="size-3.5 text-muted-foreground" />
            <p
              className="text-xs uppercase tracking-[0.15em] text-muted-foreground"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              Version history
            </p>
          </div>
          <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
            <div className="divide-y">
              {versions.map((v) => (
                <div
                  key={v.id}
                  className="flex flex-wrap items-center justify-between gap-4 px-5 py-3"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span
                      className="text-xs text-primary font-medium shrink-0"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      v{v.version_number}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm">
                          {v.file_path.split("/").pop()}
                        </span>
                        {v.id === doc.current_version_id && (
                          <Badge variant="outline" className="text-[10px]">
                            current
                          </Badge>
                        )}
                      </div>
                      <div
                        className="mt-0.5 flex items-center gap-3 text-[11px] text-muted-foreground/50"
                        style={{ fontFamily: "var(--font-mono)" }}
                      >
                        <span>{(v.file_size / 1024).toFixed(1)} KB</span>
                        <span>
                          {new Date(v.created_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <VersionActions
                    documentId={doc.id}
                    versionId={v.id}
                    versionNumber={v.version_number}
                    fileName={v.file_path.split("/").pop() ?? ""}
                    fileType={v.file_type}
                    isCurrent={v.id === doc.current_version_id}
                    title={doc.title}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <CommentPanel
        documentId={doc.id}
        currentUserId={user.id}
        currentUserRole={profile?.role ?? "faculty"}
      />
    </div>
  );
}

async function getFolderPath(
  folderId: string,
): Promise<{ id: string; name: string }[]> {
  const adminClient = createAdminClient();
  const breadcrumbs: { id: string; name: string }[] = [];
  let currentId: string | null = folderId;

  while (currentId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await adminClient
      .from("folders")
      .select("id, name, parent_id")
      .eq("id", currentId)
      .is("deleted_at", null)
      .single();

    const folder = result.data as {
      id: string;
      name: string;
      parent_id: string | null;
    } | null;

    if (!folder) break;

    breadcrumbs.unshift({ id: folder.id, name: folder.name });
    currentId = folder.parent_id;
  }

  return breadcrumbs;
}
