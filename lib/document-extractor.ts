import path from "path"
import mammoth from "mammoth"
import * as XLSX from "xlsx"
import AdmZip from "adm-zip"
import { PDFParse } from "pdf-parse"
import Tesseract from "tesseract.js"

const OCR_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/tiff",
  "image/bmp",
  "image/gif",
])

async function runOcr(buffer: Buffer): Promise<string> {
  const { data } = await Tesseract.recognize(buffer, "eng", {
    workerPath: path.join(process.cwd(), "node_modules/tesseract.js/src/worker-script/node/index.js"),
    logger: () => {},
  })
  return data.text.trim()
}

async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const doc = new PDFParse({ data: buffer })
  const result = await doc.getText({
    pageJoiner: "\n",
    lineEnforce: false,
  })
  await doc.destroy()
  return result.text?.trim() ?? ""
}

async function runPdfOcr(buffer: Buffer): Promise<string> {
  const doc = new PDFParse({ data: buffer })
  const screenshots = await doc.getScreenshot({
    imageDataUrl: true,
    imageBuffer: false,
    scale: 2,
  })

  const textParts: string[] = []
  for (const page of screenshots.pages) {
    const imgBuffer = Buffer.from(
      page.dataUrl.replace(/^data:image\/\w+;base64,/, ""),
      "base64",
    )
    const text = await runOcr(imgBuffer)
    if (text) textParts.push(text)
  }

  await doc.destroy()
  return textParts.join("\n")
}

async function extractDocxText(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer })
  return result.value.trim()
}

async function extractDocxImages(buffer: Buffer): Promise<string> {
  const zip = new AdmZip(buffer)
  const entries = zip.getEntries()
  const imgExts = new Set([
    ".png", ".jpg", ".jpeg", ".tif", ".tiff", ".bmp", ".gif",
  ])

  const mediaEntries = entries.filter(
    (e) =>
      e.entryName.startsWith("word/media/") &&
      imgExts.has(
        e.entryName.substring(e.entryName.lastIndexOf(".")).toLowerCase(),
      ),
  )

  if (mediaEntries.length === 0) return ""

  const textParts: string[] = []
  for (const entry of mediaEntries) {
    const text = await runOcr(entry.getData())
    if (text) textParts.push(text)
  }

  return textParts.join("\n")
}

async function extractXlsxText(buffer: Buffer): Promise<string> {
  const workbook = XLSX.read(buffer, { type: "buffer" })
  const texts: string[] = []

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName]
    if (!sheet) continue
    const rows = XLSX.utils.sheet_to_json<string[]>(sheet, {
      header: 1,
    }) as string[][]
    for (const row of rows) {
      for (const cell of row) {
        if (cell != null && String(cell).trim()) {
          texts.push(String(cell).trim())
        }
      }
    }
  }

  return texts.join("\n")
}

async function extractPptxText(buffer: Buffer): Promise<string> {
  const zip = new AdmZip(buffer)
  const entries = zip.getEntries()
  const slideEntries = entries
    .filter((e) => /^ppt\/slides\/slide\d+\.xml$/.test(e.entryName))
    .sort(
      (a, b) =>
        parseInt(a.entryName.match(/\d+/)?.[0] ?? "0") -
        parseInt(b.entryName.match(/\d+/)?.[0] ?? "0"),
    )

  const texts: string[] = []
  for (const entry of slideEntries) {
    const content = entry.getData().toString("utf-8")
    const textMatches = content.match(/<a:t[^>]*>([^<]+)<\/a:t>/g)
    if (!textMatches) continue
    for (const match of textMatches) {
      const inner = match.replace(/<[^>]+>/g, "")
      if (inner.trim()) texts.push(inner.trim())
    }
  }

  return texts.join("\n")
}

export async function extractText(
  buffer: Buffer,
  fileType: string,
): Promise<string> {
  if (OCR_IMAGE_TYPES.has(fileType)) {
    return runOcr(buffer)
  }

  if (fileType === "application/pdf") {
    const text = await extractTextFromPdf(buffer)
    if (text && text.length > 20) return text
    return runPdfOcr(buffer)
  }

  if (fileType === "text/plain") {
    return buffer.toString("utf-8").trim()
  }

  if (
    fileType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const text = await extractDocxText(buffer)
    if (text) return text
    return extractDocxImages(buffer)
  }

  if (
    fileType ===
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  ) {
    return extractXlsxText(buffer)
  }

  if (
    fileType === "application/vnd.ms-powerpoint" ||
    fileType ===
      "application/vnd.openxmlformats-officedocument.presentationml.presentation"
  ) {
    return extractPptxText(buffer)
  }

  throw new Error(`Unsupported file type: ${fileType}`)
}
