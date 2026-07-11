import {
  FileIcon,
  FileImageIcon,
  FileTextIcon,
  FileSpreadsheetIcon,
  FileArchiveIcon,
  FileVideoIcon,
  FileAudioIcon,
  FileCodeIcon,
} from "lucide-react"
import type { ReactNode } from "react"

const typeLabels: Record<string, string> = {
  pdf: "PDF",
  image: "Image",
  spreadsheet: "Spreadsheet",
  presentation: "Presentation",
  video: "Video",
  audio: "Audio",
  zip: "Archive",
  rar: "Archive",
  "7z": "Archive",
  tar: "Archive",
  gz: "Archive",
  text: "Text",
  json: "Code",
  xml: "Code",
}

export function fileTypeLabel(mime: string): string {
  for (const [key, label] of Object.entries(typeLabels)) {
    if (mime.includes(key)) return label
  }
  return "Document"
}

export function fileTypeIcon(mime: string): ReactNode {
  if (mime.includes("pdf")) return <FileTextIcon className="size-4 shrink-0 text-red-500" />
  if (mime.includes("image")) return <FileImageIcon className="size-4 shrink-0 text-orange-400" />
  if (mime.includes("spreadsheet")) return <FileSpreadsheetIcon className="size-4 shrink-0 text-green-500" />
  if (mime.includes("presentation")) return <FileCodeIcon className="size-4 shrink-0 text-red-400" />
  if (mime.includes("video")) return <FileVideoIcon className="size-4 shrink-0 text-blue-500" />
  if (mime.includes("audio")) return <FileAudioIcon className="size-4 shrink-0 text-purple-500" />
  if (mime.includes("zip") || mime.includes("rar") || mime.includes("7z") || mime.includes("tar") || mime.includes("gz"))
    return <FileArchiveIcon className="size-4 shrink-0 text-amber-600" />
  if (mime.includes("text") || mime.includes("json") || mime.includes("xml"))
    return <FileCodeIcon className="size-4 shrink-0 text-blue-400" />
  return <FileIcon className="size-4 shrink-0 text-muted-foreground" />
}
