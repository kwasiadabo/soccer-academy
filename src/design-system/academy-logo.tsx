import { motion, useReducedMotion } from "framer-motion"
import { Shield } from "lucide-react"

import { useAcademyBranding } from "@/app/academy-branding-context"
import { cn } from "@/lib/utils"

export function AcademyLogo({ className = "size-9", chip = false }: { className?: string; chip?: boolean }) {
  const reduceMotion = useReducedMotion()
  const { name, logoUrl } = useAcademyBranding()

  // No logo configured for this academy yet — a generic mark stands in rather
  // than implying every academy shares one specific brand's crest.
  const img = logoUrl ? (
    <motion.img
      src={logoUrl}
      alt={name}
      className={cn("object-contain", className)}
      animate={reduceMotion ? undefined : { rotateY: 360 }}
      transition={reduceMotion ? undefined : { duration: 4, repeat: Infinity, ease: "linear" }}
    />
  ) : (
    <Shield className={cn("text-primary", className)} aria-label={name} strokeWidth={1.5} />
  )

  if (!chip) {
    return (
      <span className="inline-block" style={{ perspective: 400 }}>
        {img}
      </span>
    )
  }
  return (
    <span
      className="inline-flex items-center justify-center rounded-lg bg-white p-1 shadow-sm"
      style={{ perspective: 400 }}
    >
      {img}
    </span>
  )
}
