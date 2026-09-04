import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { useQuery } from "@tanstack/react-query"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { Camera, Loader2, UserRound } from "lucide-react"

import { cn } from "@/lib/utils"
import { fetchAuthorizedBlob } from "@/lib/api-client"
import { useUploadPlayerPhoto } from "./players-api"

const PREVIEW_WIDTH = 160

interface PlayerPhotoProps {
  playerId: string
  photoDocumentId: string | null
  editable?: boolean
  size?: number
  width?: number
  height?: number
  shape?: "circle" | "rectangle"
  photoPath?: string
}

function useServerPhotoUrl(playerId: string, photoDocumentId: string | null, photoPath: string) {
  const { data } = useQuery({
    queryKey: ["players", "photo", playerId, photoDocumentId],
    queryFn: async () => {
      const blob = await fetchAuthorizedBlob(photoPath)
      return URL.createObjectURL(blob)
    },
    enabled: !!photoDocumentId,
    staleTime: Infinity,
    gcTime: 0,
  })

  useEffect(() => {
    return () => {
      if (data) URL.revokeObjectURL(data)
    }
  }, [data])

  return data ?? null
}

export function PlayerPhoto({
  playerId,
  photoDocumentId,
  editable = false,
  size = 224,
  width,
  height,
  shape = "circle",
  photoPath,
}: PlayerPhotoProps) {
  const boxWidth = width ?? size
  const boxHeight = height ?? size
  const isRectangle = shape === "rectangle"
  const shouldReduceMotion = useReducedMotion()
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [localPreview, setLocalPreview] = useState<string | null>(null)
  const [isHovered, setIsHovered] = useState(false)
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null)
  const serverUrl = useServerPhotoUrl(playerId, photoDocumentId, photoPath ?? `/players/${playerId}/photo`)
  const uploadPhoto = useUploadPlayerPhoto(playerId)

  // Reset the optimistic local preview whenever we navigate to a different player.
  useEffect(() => {
    setLocalPreview(null)
  }, [playerId])

  useEffect(() => {
    return () => {
      if (localPreview) URL.revokeObjectURL(localPreview)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const displayUrl = localPreview ?? serverUrl

  const previewHeight = isRectangle ? (PREVIEW_WIDTH * boxHeight) / boxWidth : PREVIEW_WIDTH
  const gap = 12
  const margin = 8
  const openLeft = anchorRect ? anchorRect.right + gap + PREVIEW_WIDTH > window.innerWidth - margin : false
  const previewLeft = anchorRect
    ? openLeft
      ? Math.max(margin, anchorRect.left - gap - PREVIEW_WIDTH)
      : anchorRect.right + gap
    : 0
  const previewTop = anchorRect
    ? Math.min(anchorRect.top, window.innerHeight - previewHeight - margin)
    : 0

  const connector = anchorRect
    ? openLeft
      ? {
          fromX: anchorRect.left,
          toX: previewLeft + PREVIEW_WIDTH,
        }
      : {
          fromX: anchorRect.right,
          toX: previewLeft,
        }
    : null

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return

    const preview = URL.createObjectURL(file)
    setLocalPreview((previous) => {
      if (previous) URL.revokeObjectURL(previous)
      return preview
    })

    await uploadPhoto.mutateAsync(file)
  }

  const imageFade = shouldReduceMotion
    ? { initial: { opacity: 1 }, animate: { opacity: 1 }, exit: { opacity: 1 }, transition: { duration: 0 } }
    : {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 2, ease: "easeInOut" as const },
      }

  const placeholderFade = shouldReduceMotion
    ? { initial: { opacity: 1 }, animate: { opacity: 1 }, exit: { opacity: 1 }, transition: { duration: 0 } }
    : {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.35, ease: "easeOut" as const },
      }

  return (
    <div
      ref={containerRef}
      className="relative shrink-0"
      style={{ width: boxWidth, height: boxHeight }}
      onMouseEnter={() => {
        setAnchorRect(containerRef.current?.getBoundingClientRect() ?? null)
        setIsHovered(true)
      }}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={cn(
          "relative size-full overflow-hidden border-4 border-background bg-muted shadow-lg ring-1 ring-border",
          isRectangle ? "rounded-2xl" : "rounded-full",
        )}
        style={{ width: boxWidth, height: boxHeight }}
      >
        <AnimatePresence mode="wait">
          {displayUrl ? (
            <motion.img
              key={displayUrl}
              src={displayUrl}
              alt="Player"
              className="absolute inset-0 size-full object-cover"
              initial={imageFade.initial}
              animate={imageFade.animate}
              exit={imageFade.exit}
              transition={imageFade.transition}
            />
          ) : (
            <motion.div
              key="placeholder"
              className="absolute inset-0 flex size-full items-center justify-center bg-gradient-to-br from-muted to-muted/60"
              initial={placeholderFade.initial}
              animate={placeholderFade.animate}
              exit={placeholderFade.exit}
              transition={placeholderFade.transition}
            >
              <UserRound className="size-1/3 text-muted-foreground" strokeWidth={1.25} />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {uploadPhoto.isPending ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={cn(
                "absolute inset-0 flex items-center justify-center bg-black/40",
                isRectangle ? "rounded-2xl" : "rounded-full",
              )}
            >
              <Loader2 className="size-8 animate-spin text-white" />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {typeof document !== "undefined"
        ? createPortal(
            <>
              <AnimatePresence>
                {isHovered && displayUrl && anchorRect && connector ? (
                  <motion.svg
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    style={{ position: "fixed", inset: 0, width: "100vw", height: "100vh" }}
                    className="pointer-events-none z-40 text-border"
                  >
                    <line
                      x1={connector.fromX}
                      y1={anchorRect.top + anchorRect.height / 2}
                      x2={connector.toX}
                      y2={previewTop + previewHeight / 2}
                      stroke="currentColor"
                      strokeOpacity={0.35}
                      strokeWidth={1.5}
                    />
                  </motion.svg>
                ) : null}
              </AnimatePresence>

              <AnimatePresence>
                {isHovered && displayUrl && anchorRect ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, x: openLeft ? 6 : -6 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.9, x: openLeft ? 6 : -6 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    style={{
                      position: "fixed",
                      top: previewTop,
                      left: previewLeft,
                      width: PREVIEW_WIDTH,
                      height: isRectangle ? undefined : PREVIEW_WIDTH,
                    }}
                    className={cn(
                      "pointer-events-none z-50 overflow-hidden border border-border bg-popover shadow-2xl",
                      openLeft ? "origin-top-right" : "origin-top-left",
                      isRectangle ? "rounded-xl" : "rounded-full",
                    )}
                  >
                    <img
                      src={displayUrl}
                      alt="Player, enlarged"
                      className={cn("size-full bg-muted", isRectangle ? "object-contain" : "object-cover")}
                      style={isRectangle ? { aspectRatio: `${boxWidth} / ${boxHeight}` } : undefined}
                    />
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </>,
            document.body,
          )
        : null}

      {editable ? (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(e) => void handleFileChange(e)}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            aria-label="Upload player photo"
            className={cn(
              "absolute right-1 bottom-1 flex size-10 items-center justify-center rounded-full",
              "bg-primary text-primary-foreground shadow-md transition-transform hover:scale-105 active:scale-95",
              "ring-4 ring-background",
            )}
          >
            <Camera className="size-5" />
          </button>
        </>
      ) : null}
    </div>
  )
}
