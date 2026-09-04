import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import type { LucideIcon } from "lucide-react"

export function StatCard({
  icon: Icon,
  label,
  value,
  highlight = false,
  isLoading = false,
  iconClassName,
}: {
  icon: LucideIcon
  label: string
  value: number | string
  highlight?: boolean
  isLoading?: boolean
  iconClassName?: string
}) {
  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <CardContent className="flex items-center gap-4 py-5">
        <div
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-xl",
            highlight
              ? "bg-primary text-primary-foreground"
              : (iconClassName ?? "bg-primary/15 text-accent-foreground"),
          )}
        >
          <Icon className="size-5" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          {isLoading ? (
            <div className="mt-1.5 h-6 w-16 animate-pulse rounded bg-muted" />
          ) : (
            <p className="text-2xl leading-tight font-extrabold tracking-tight tabular-nums">{value}</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
