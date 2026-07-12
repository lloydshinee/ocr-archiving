export const ACCEPTED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/jpeg",
  "image/png",
  "text/plain",
  "application/zip",
]

export const TEXT_EXTRACTABLE_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]

export const MAX_FILE_SIZE = 100 * 1024 * 1024

export const ACCEPTED_EXTENSIONS = ".pdf,.docx,.xlsx,.pptx,.jpg,.jpeg,.png,.txt,.zip"

export const FILE_TYPE_LABELS: Record<string, string> = {
  "application/pdf": "PDF",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "XLSX",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "PPTX",
  "image/jpeg": "JPEG",
  "image/png": "PNG",
  "text/plain": "TXT",
  "application/zip": "ZIP",
}
