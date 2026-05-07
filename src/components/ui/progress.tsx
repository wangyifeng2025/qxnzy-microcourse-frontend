import * as React from "react"
import { cn } from "@/lib/utils"

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number
  max?: number
  indicatorClassName?: string
}

function Progress({
  className,
  value = 0,
  max = 100,
  indicatorClassName,
  ...props
}: ProgressProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100))

  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      data-slot="progress"
      className={cn(
        "bg-secondary relative h-2 w-full overflow-hidden rounded-full",
        className,
      )}
      {...props}
    >
      <div
        data-slot="progress-indicator"
        className={cn(
          "bg-primary h-full w-full flex-1 transition-all duration-300 ease-in-out",
          indicatorClassName,
        )}
        style={{ transform: `translateX(-${100 - percentage}%)` }}
      />
    </div>
  )
}

export { Progress }
