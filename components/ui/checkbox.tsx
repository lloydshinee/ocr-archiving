"use client"

import { type ComponentPropsWithoutRef } from "react"
import { cn } from "@/lib/utils"

interface CheckboxProps extends ComponentPropsWithoutRef<"input"> {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
}

export function Checkbox({
  checked = false,
  onCheckedChange,
  className,
  disabled,
  ...props
}: CheckboxProps) {
  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      disabled={disabled}
      className={cn(
        "size-4 shrink-0 rounded border border-input accent-primary",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className,
      )}
      {...props}
    />
  )
}
