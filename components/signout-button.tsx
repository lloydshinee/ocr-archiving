"use client"

import { useRouter } from "next/navigation"
import { LogOutIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/browser"

export function SignoutButton() {
  const router = useRouter()

  async function handleSignout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  return (
    <Button
      onClick={handleSignout}
      variant="ghost"
      size="icon-sm"
      className="text-white/60 hover:bg-white/10 hover:text-white"
    >
      <LogOutIcon className="size-4" />
      <span className="sr-only">Sign out</span>
    </Button>
  )
}
