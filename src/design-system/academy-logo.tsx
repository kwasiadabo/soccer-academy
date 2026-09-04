import { motion, useReducedMotion } from "framer-motion"

import { cn } from "@/lib/utils"

export function AcademyLogo({ className = "size-9", chip = false }: { className?: string; chip?: boolean }) {
  const reduceMotion = useReducedMotion()

  const img = (
    <motion.img
      src="/images/kapikids-logo.png"
      alt="Kapikids Soccer Academy"
      className={cn("object-contain", className)}
      animate={reduceMotion ? undefined : { rotateY: 360 }}
      transition={reduceMotion ? undefined : { duration: 4, repeat: Infinity, ease: "linear" }}
    />
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
