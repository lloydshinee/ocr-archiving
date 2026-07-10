const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pending: {
    bg: "bg-amber-50 dark:bg-amber-950/30",
    text: "text-amber-700 dark:text-amber-400",
    label: "OCR pending",
  },
  processing: {
    bg: "bg-sky-50 dark:bg-sky-950/30",
    text: "text-sky-700 dark:text-sky-400",
    label: "OCR processing",
  },
  completed: {
    bg: "bg-transparent",
    text: "text-muted-foreground/50",
    label: "OCR complete",
  },
  failed: {
    bg: "bg-destructive/10",
    text: "text-destructive",
    label: "OCR failed",
  },
}

export function OcrStatusBadge({
  status,
  versionId,
}: {
  status: string
  versionId?: string
}) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.failed

  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${style.bg} ${style.text}`}
      style={{ fontFamily: "var(--font-mono)" }}
      title={
        status === "failed"
          ? "Full-text search will not find this document until OCR is retried"
          : status === "pending"
            ? "OCR is queued for processing"
            : status === "processing"
              ? "OCR is being processed"
              : undefined
      }
    >
      {style.label}
      {status === "failed" && versionId && (
        <form action="/api/ocr" method="POST" className="inline">
          <input type="hidden" name="versionId" value={versionId} />
          <button
            type="submit"
            className="ml-0.5 rounded hover:bg-destructive/20 p-0.5 transition-colors"
            title="Retry OCR"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="lucide lucide-rotate-ccw"
            >
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
          </button>
        </form>
      )}
    </span>
  )
}
