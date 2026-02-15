import * as React from "react"

import { cn } from "@/shared/lib/cn"

export interface SwitchProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  onCheckedChange?: (checked: boolean) => void
}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, onCheckedChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onCheckedChange?.(e.target.checked)
      props.onChange?.(e)
    }

    return (
      <label className="inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          className="sr-only peer"
          ref={ref}
          onChange={handleChange}
          {...props}
        />
        <div className={cn(
          "relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600",
          className
        )}></div>
      </label>
    )
  }
)
Switch.displayName = "Switch"

export { Switch }
