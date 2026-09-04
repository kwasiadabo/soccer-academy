import { motion, useReducedMotion } from "framer-motion"

import { cn } from "@/lib/utils"

export function ProgressBar({
  label,
  value,
  className,
  barClassName,
}: {
  label?: string
  value: number
  className?: string
  barClassName?: string
}) {
  const reduceMotion = useReducedMotion()
  const clamped = Math.max(0, Math.min(100, value))

  return (
    <div className={cn("space-y-1.5", className)}>
      {label ? (
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-foreground">{label}</span>
          <span className="text-xs text-muted-foreground tabular-nums">{Math.round(clamped)}%</span>
        </div>
      ) : null}
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <motion.div
          className={cn("h-full rounded-full", barClassName ?? "bg-primary")}
          initial={{ width: reduceMotion ? `${clamped}%` : 0 }}
          animate={{ width: `${clamped}%` }}
          transition={{ duration: reduceMotion ? 0 : 0.7, ease: "easeOut" }}
        />
      </div>
    </div>
  )
}
