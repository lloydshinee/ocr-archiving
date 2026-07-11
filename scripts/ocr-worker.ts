#!/usr/bin/env npx tsx
import { createClient } from "@supabase/supabase-js"
import { extractText } from "@/lib/document-extractor"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const POLL_INTERVAL_MS = 5000
const MAX_RETRIES = 3
const RETRY_DELAY_MIN = 5

async function downloadFile(filePath: string): Promise<Buffer> {
  const { data, error } = await adminClient.storage
    .from("documents")
    .download(filePath)

  if (error || !data) {
    throw new Error(`Failed to download file: ${error?.message || "unknown"}`)
  }

  return Buffer.from(await data.arrayBuffer())
}

async function processOcrJob(
  jobId: string,
  versionId: string,
  documentId: string,
  filePath: string,
  fileType: string,
) {
  try {
    await adminClient
      .from("ocr_jobs")
      .update({ status: "processing", started_at: new Date().toISOString() })
      .eq("id", jobId)

    await adminClient
      .from("document_versions")
      .update({ ocr_status: "processing" })
      .eq("id", versionId)

    const buffer = await downloadFile(filePath)
    const ocrText = await extractText(buffer, fileType)

    await adminClient
      .from("document_versions")
      .update({
        ocr_text: ocrText || null,
        ocr_status: "completed",
      })
      .eq("id", versionId)

    await adminClient
      .from("ocr_jobs")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", jobId)

    console.log(`OCR completed for version ${versionId} (${ocrText.length} chars)`)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error(`OCR failed for version ${versionId}: ${message}`)

    await adminClient
      .from("document_versions")
      .update({ ocr_status: "failed" })
      .eq("id", versionId)

    await adminClient
      .from("ocr_jobs")
      .update({
        status: "failed",
        error_message: message,
        completed_at: new Date().toISOString(),
        retry_count: (await getRetryCount(jobId)) + 1,
      })
      .eq("id", jobId)
  }
}

async function getRetryCount(jobId: string): Promise<number> {
  const { data } = await adminClient
    .from("ocr_jobs")
    .select("retry_count")
    .eq("id", jobId)
    .single()
  return data?.retry_count ?? 0
}

async function poll() {
  while (true) {
    try {
      const { data: jobs } = await adminClient
        .from("ocr_jobs")
        .select("id, version_id, document_id, status, created_at, completed_at")
        .or(
          `status.eq.pending,and(status.eq.failed,retry_count.lt.${MAX_RETRIES})`,
        )
        .order("created_at", { ascending: true })
        .limit(1)

      if (jobs && jobs.length > 0) {
        const job = jobs[0]

        if (job.status === "failed") {
          const retryDelay = RETRY_DELAY_MIN * 60 * 1000
          const lastFailureMs = new Date(job.completed_at || job.created_at || "").getTime()
          if (Date.now() - lastFailureMs < retryDelay) {
            await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))
            continue
          }
        }

        const { data: version } = await adminClient
          .from("document_versions")
          .select("file_path, file_type")
          .eq("id", job.version_id)
          .single()

        if (version) {
          await processOcrJob(
            job.id,
            job.version_id,
            job.document_id,
            version.file_path,
            version.file_type,
          )
        }
      }
    } catch (err) {
      console.error("Poll error:", err instanceof Error ? err.message : "Unknown")
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))
  }
}

console.log("OCR worker started — polling for pending jobs...")
poll().catch((err) => {
  console.error("Fatal error:", err)
  process.exit(1)
})
