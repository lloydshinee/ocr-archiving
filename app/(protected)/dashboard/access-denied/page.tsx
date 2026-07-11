import { ShieldXIcon } from "lucide-react"

export default function AccessDeniedPage() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24">
      <ShieldXIcon className="size-12 text-muted-foreground/30" />
      <h1
        className="text-xl"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Access Denied
      </h1>
      <p className="text-sm text-muted-foreground text-center max-w-sm">
        You do not have permission to view this folder. Contact the Dean or
        Program Head if you believe this is a mistake.
      </p>
    </div>
  )
}
