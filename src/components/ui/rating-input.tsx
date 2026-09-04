import { Star } from "lucide-react"

import { cn } from "@/lib/utils"
import { Select } from "./select"

export type RatingScaleType = "SCALE_1_5" | "SCALE_1_10" | "QUALITATIVE"

const QUALITATIVE_LABELS = ["Needs Improvement", "Developing", "Proficient", "Excellent"]

interface RatingInputProps {
  scale: RatingScaleType
  value: number | undefined
  onChange: (value: number, label?: string) => void
  className?: string
}

export function RatingInput({ scale, value, onChange, className }: RatingInputProps) {
  if (scale === "QUALITATIVE") {
    return (
      <Select
        className={className}
        value={value ?? ""}
        onChange={(e) => {
          const index = Number(e.target.value)
          onChange(index, QUALITATIVE_LABELS[index - 1])
        }}
      >
        <option value="" disabled>
          Select a rating
        </option>
        {QUALITATIVE_LABELS.map((label, i) => (
          <option key={label} value={i + 1}>
            {label}
          </option>
        ))}
      </Select>
    )
  }

  const max = scale === "SCALE_1_10" ? 10 : 5
  return (
    <div className={cn("flex flex-wrap items-center gap-1", className)}>
      {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          aria-label={`Rate ${n} out of ${max}`}
          aria-pressed={value === n}
          className="rounded-sm p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <Star
            className={cn(
              "size-5 transition-colors",
              value !== undefined && n <= value
                ? "fill-warning text-warning"
                : "fill-none text-muted-foreground/40",
            )}
          />
        </button>
      ))}
    </div>
  )
}
