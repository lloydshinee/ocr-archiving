import { type ComponentPropsWithoutRef, forwardRef } from "react"
import { cn } from "@/lib/utils"

interface ScrollAreaProps extends ComponentPropsWithoutRef<"div"> {
  className?: string
}

export const ScrollArea = forwardRef<HTMLDivElement, ScrollAreaProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("overflow-y-auto", className)}
        {...props}
      >
        {children}
      </div>
    )
  },
)

ScrollArea.displayName = "ScrollArea"
