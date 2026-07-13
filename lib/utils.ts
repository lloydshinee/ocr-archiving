import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const MAX_BASE_LENGTH = 50

export function truncateFilename(name: string): string {
  const dot = name.lastIndexOf(".")
  if (dot === -1) {
    return name.length > MAX_BASE_LENGTH ? name.slice(0, MAX_BASE_LENGTH) + "...." : name
  }
  const base = name.slice(0, dot)
  const ext = name.slice(dot)
  if (base.length <= MAX_BASE_LENGTH) return name
  return base.slice(0, MAX_BASE_LENGTH) + "...." + ext
}
