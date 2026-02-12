import * as React from "react"
import { cn } from "@/lib/utils"

const Progress = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    value?: number
    max?: number
    getValueLabel?: (value: number, max: number) => string
  }
>(
  (
    {
      value = 0,
      max = 100,
      getValueLabel = (value, max) => `${Math.round((value / max) * 100)}%`,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const valueInRange = Math.min(Math.max(value, 0), max)
    const percentage = (valueInRange / max) * 100

    return (
      <div
        ref={ref}
        className={cn(
          "relative h-4 w-full overflow-hidden rounded-full bg-gray-200",
          className
        )}
        role="progressbar"
        aria-valuenow={Math.round(valueInRange)}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuetext={getValueLabel(valueInRange, max)}
        {...props}
      >
        <div
          className={cn(
            "h-full w-full flex-1 bg-primary transition-all",
            percentage === 0 && "opacity-0"
          )}
          style={{
            transform: `translateX(-${100 - percentage}%)`,
            transitionProperty: "transform",
            transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
            transitionDuration: "1s",
          }}
        />
        {children}
      </div>
    )
  }
)
Progress.displayName = "Progress"

export { Progress }
