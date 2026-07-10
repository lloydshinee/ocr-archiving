#!/usr/bin/env npx tsx
import { createClient } from "@supabase/supabase-js"
import { exec } from "node:child_process"
import { readFile, writeFile, unlink } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { randomUUID } from "node:crypto"

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
const OCR_IMAGE_TYPES = ["image/jpeg", "image/png"]

async function downloadFile(filePath: string): Promise<ArrayBuffer> {
  const { data, error } = await adminClient.storage
    .from("documents")
    .download(filePath)

  if (error || !data) {
    throw new Error(`Failed to download file: ${error?.message || "unknown"}`)
  }

  return data.arrayBuffer()
}

function runTesseract(imagePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(`tesseract "${imagePath}" stdout 2>/dev/null`, { timeout: 120000 }, (error, stdout) => {
      if (error) {
        reject(new Error(`Tesseract failed: ${error.message}`))
        return
      }
      resolve(stdout.trim())
    })
  })
}

function runPdfOcr(pdfPath: string): Promise<string> {
  const pythonScript = join(tmpdir(), `ocr-pdf-${randomUUID()}.py`)
  const script = [
    "import subprocess, sys, tempfile, os, glob",
    "pdf = sys.argv[1]",
    "tmp = tempfile.mkdtemp()",
    "try:",
    "    subprocess.run(['pdftoppm', '-png', '-r', '300', pdf, os.path.join(tmp, 'page')], check=True, capture_output=True)",
    "    pages = sorted(glob.glob(os.path.join(tmp, 'page-*.png')))",
    "    text_parts = []",
    "    for p in pages:",
    "        result = subprocess.run(['tesseract', p, 'stdout'], capture_output=True, text=True)",
    "        text_parts.append(result.stdout)",
    "    print(''.join(text_parts).strip())",
    "finally:",
    "    subprocess.run(['rm', '-rf', tmp], capture_output=True)",
  ].join("\n")

  return new Promise((resolve, reject) => {
    writeFile(pythonScript, script)
      .then(() => {
        exec(`python3 "${pythonScript}" "${pdfPath}"`, { timeout: 300000, maxBuffer: 50 * 1024 * 1024 }, (error, stdout) => {
          unlink(pythonScript).catch(() => {})
          if (error) {
            reject(new Error(`PDF OCR failed: ${error.message}`))
            return
          }
          resolve(stdout.trim())
        })
      })
      .catch((err) => reject(new Error(`Failed to write Python script: ${err.message}`)))
  })
}

const TXT_TEXT_TYPES = ["text/plain"]
const OFFICE_TEXT_TYPES = [
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]

function runTxtExtraction(txtPath: string): Promise<string> {
  return readFile(txtPath, "utf-8").then((text) => text.trim())
}

function runDocxExtraction(docxPath: string): Promise<string> {
  const pythonScript = join(tmpdir(), `extract-docx-${randomUUID()}.py`)
  const script = [
    "import zipfile, xml.etree.ElementTree as ET, sys",
    "with zipfile.ZipFile(sys.argv[1]) as z:",
    "    tree = ET.parse(z.open('word/document.xml'))",
    "    ns = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'",
    "    texts = [t.text for t in tree.iter('{' + ns + '}t') if t.text]",
    "    print('\\n'.join(texts))",
  ].join("\n")

  return new Promise((resolve, reject) => {
    writeFile(pythonScript, script)
      .then(() => {
        exec(`python3 "${pythonScript}" "${docxPath}"`, { timeout: 120000, maxBuffer: 50 * 1024 * 1024 }, (error, stdout) => {
          unlink(pythonScript).catch(() => {})
          if (error) {
            reject(new Error(`DOCX extraction failed: ${error.message}`))
            return
          }
          resolve(stdout.trim())
        })
      })
      .catch((err) => reject(new Error(`Failed to write Python script: ${err.message}`)))
  })
}

function runXlsxExtraction(xlsxPath: string): Promise<string> {
  const pythonScript = join(tmpdir(), `extract-xlsx-${randomUUID()}.py`)
  const script = [
    "import zipfile, xml.etree.ElementTree as ET, sys",
    "ns = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'",
    "with zipfile.ZipFile(sys.argv[1]) as z:",
    "    strings = []",
    "    if 'xl/sharedStrings.xml' in z.namelist():",
    "        ss = ET.parse(z.open('xl/sharedStrings.xml'))",
    "        strings = [si.find('.//{' + ns + '}t', {}).text for si in ss.findall('.//{' + ns + '}si', {}) if si.find('.//{' + ns + '}t', {}) is not None]",
    "    texts = []",
    "    for fn in z.namelist():",
    "        if fn.startswith('xl/worksheets/') and fn.endswith('.xml'):",
    "            sheet = ET.parse(z.open(fn))",
    "            for c in sheet.iter('{' + ns + '}c'):",
    "                v = c.find('{' + ns + '}v')",
    "                if v is not None and v.text:",
    "                    if c.get('t') == 's':",
    "                        idx = int(v.text)",
    "                        if idx < len(strings):",
    "                            texts.append(strings[idx])",
    "                    else:",
    "                        texts.append(v.text)",
    "    print('\\n'.join(texts))",
  ].join("\n")

  return new Promise((resolve, reject) => {
    writeFile(pythonScript, script)
      .then(() => {
        exec(`python3 "${pythonScript}" "${xlsxPath}"`, { timeout: 120000, maxBuffer: 50 * 1024 * 1024 }, (error, stdout) => {
          unlink(pythonScript).catch(() => {})
          if (error) {
            reject(new Error(`XLSX extraction failed: ${error.message}`))
            return
          }
          resolve(stdout.trim())
        })
      })
      .catch((err) => reject(new Error(`Failed to write Python script: ${err.message}`)))
  })
}

async function processOcrJob(
  jobId: string,
  versionId: string,
  documentId: string,
  filePath: string,
  fileType: string,
) {
  const ext = filePath.split(".").pop()?.toLowerCase() ?? ""
  const tmpPath = join(tmpdir(), `ocr-${randomUUID()}.${ext}`)

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
    await writeFile(tmpPath, new Uint8Array(buffer))

    let ocrText: string

    if (OCR_IMAGE_TYPES.includes(fileType)) {
      ocrText = await runTesseract(tmpPath)
    } else if (fileType === "application/pdf") {
      ocrText = await runPdfOcr(tmpPath)
    } else if (TXT_TEXT_TYPES.includes(fileType)) {
      ocrText = await runTxtExtraction(tmpPath)
    } else if (OFFICE_TEXT_TYPES.includes(fileType)) {
      ocrText = fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ? await runDocxExtraction(tmpPath)
        : await runXlsxExtraction(tmpPath)
    } else {
      throw new Error(`Unsupported file type for OCR: ${fileType}`)
    }

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
        retry_count: await getRetryCount(jobId) + 1,
      })
      .eq("id", jobId)
  } finally {
    await unlink(tmpPath).catch(() => {})
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
        .select("id, version_id, document_id, status, created_at")
        .or(
          `status.eq.pending,and(status.eq.failed,retry_count.lt.${MAX_RETRIES})`
        )
        .order("created_at", { ascending: true })
        .limit(1)

      if (jobs && jobs.length > 0) {
        const job = jobs[0]

        if (job.status === "failed") {
          const retryDelay = RETRY_DELAY_MIN * 60 * 1000
          const createdMs = new Date(job.created_at || "").getTime()
          if (Date.now() - createdMs < retryDelay) {
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
