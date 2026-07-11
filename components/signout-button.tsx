"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { LogOutIcon, Loader2Icon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/browser"
import { ConfirmDialog } from "@/components/confirm-dialog"

export function SignoutButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleSignout() {
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signOut()
    if (error) {
      setLoading(false)
      return
    }
    router.push("/login")
    router.refresh()
  }

  return (
    <ConfirmDialog
      title="Sign out"
      description="Are you sure you want to sign out?"
      confirmLabel="Sign out"
      onConfirm={handleSignout}
      loading={loading}
      trigger={
        <Button
          disabled={loading}
          variant="ghost"
          size="icon-sm"
          className="text-white/60 hover:bg-white/10 hover:text-white"
        >
          {loading ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : (
            <LogOutIcon className="size-4" />
          )}
          <span className="sr-only">Sign out</span>
        </Button>
      }
    />
  )
}
