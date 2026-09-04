import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ChevronLeft, ChevronRight, Footprints, Package, Shirt } from "lucide-react"

import { cn } from "@/lib/utils"
import { fetchAuthorizedBlob } from "@/lib/api-client"
import type { ProductCategory, ShopProductImage } from "./shop-api"

const CATEGORY_ICON: Record<ProductCategory, typeof Shirt> = {
  JERSEY: Shirt,
  TRACK_SUIT: Shirt,
  BOOTS: Footprints,
  SOCKS: Footprints,
  OTHER: Package,
}

function EmptyMedia({ category, className }: { category: ProductCategory; className?: string }) {
  const Icon = CATEGORY_ICON[category]
  return (
    <div
      className={cn(
        "flex items-center justify-center bg-gradient-to-br from-muted to-muted/50",
        className,
      )}
    >
      <Icon className="size-1/4 text-muted-foreground/50" strokeWidth={1.25} aria-hidden />
    </div>
  )
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

/**
 * Fetches every gallery image for a product as authenticated data: URIs, all at once.
 * Uses data: URIs rather than blob: object URLs — Safari has a known issue where an
 * <img> fails to paint a blob: URL created from a fetched Blob (request succeeds, no
 * console error, nothing renders) even outside Private Browsing; data: URIs render
 * reliably everywhere and, as a bonus, need no revoke-on-cleanup bookkeeping.
 */
export function useProductImageUrls(basePath: string, productId: string, images: ShopProductImage[]) {
  const [urls, setUrls] = useState<string[]>([])
  const imageIds = images.map((i) => i.id).join(",")

  useEffect(() => {
    if (!imageIds) {
      setUrls([])
      return
    }

    let cancelled = false

    void (async () => {
      // Settle rather than reject-on-first-failure: one image failing to load (e.g. a
      // transient storage hiccup) shouldn't blank out every other image in the gallery.
      const results = await Promise.allSettled(
        imageIds.split(",").map(async (imageId) => {
          const blob = await fetchAuthorizedBlob(`${basePath}/${productId}/images/${imageId}`)
          return blobToDataUrl(blob)
        }),
      )
      const loaded = results.filter((r): r is PromiseFulfilledResult<string> => r.status === "fulfilled").map((r) => r.value)
      if (!cancelled) setUrls(loaded)
    })()

    return () => {
      cancelled = true
    }
  }, [basePath, productId, imageIds])

  return urls
}

const HOVER_CYCLE_MS = 1100

/**
 * Catalog-grid card media: shows the cover image at rest, and on hover cycles through
 * the rest of the gallery (crossfade) so a shopper can preview different angles of the
 * merchandise without opening the product.
 */
export function ProductCardMedia({
  basePath,
  productId,
  category,
  images,
  className,
}: {
  basePath: string
  productId: string
  category: ProductCategory
  images: ShopProductImage[]
  className?: string
}) {
  const urls = useProductImageUrls(basePath, productId, images)
  const [index, setIndex] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const startCycle = () => {
    if (urls.length <= 1) return
    timerRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % urls.length)
    }, HOVER_CYCLE_MS)
  }

  const stopCycle = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = null
    setIndex(0)
  }

  useEffect(() => () => stopCycle(), [])

  if (urls.length === 0) {
    return <EmptyMedia category={category} className={className} />
  }

  return (
    <div
      className={cn("relative overflow-hidden bg-muted", className)}
      onMouseEnter={startCycle}
      onMouseLeave={stopCycle}
    >
      <AnimatePresence mode="sync">
        <motion.img
          key={urls[index]}
          src={urls[index]}
          alt=""
          className="absolute inset-0 size-full object-cover"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: "easeInOut" }}
        />
      </AnimatePresence>
      {urls.length > 1 ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center gap-1">
          {urls.map((u, i) => (
            <span
              key={u}
              className={cn(
                "h-1 rounded-full bg-white/70 shadow-sm transition-all duration-300",
                i === index ? "w-4 bg-white" : "w-1",
              )}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

/**
 * Product-detail gallery: a large primary image with directional slide transitions
 * plus a thumbnail rail, so a shopper can deliberately step through every angle of
 * the merchandise.
 */
export function ProductGallery({
  basePath,
  productId,
  category,
  images,
  className,
}: {
  basePath: string
  productId: string
  category: ProductCategory
  images: ShopProductImage[]
  className?: string
}) {
  const urls = useProductImageUrls(basePath, productId, images)
  const [[index, direction], setState] = useState<[number, number]>([0, 0])

  const go = (next: number) => {
    if (urls.length === 0) return
    const wrapped = (next + urls.length) % urls.length
    setState([wrapped, next > index ? 1 : -1])
  }

  if (urls.length === 0) {
    return <EmptyMedia category={category} className={className} />
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="relative overflow-hidden rounded-2xl bg-muted">
        <div className="aspect-square w-full">
          <AnimatePresence initial={false} custom={direction} mode="popLayout">
            <motion.img
              key={urls[index]}
              src={urls[index]}
              alt=""
              className="absolute inset-0 size-full object-cover"
              custom={direction}
              initial={{ opacity: 0, x: direction * 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -40 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            />
          </AnimatePresence>
        </div>

        {urls.length > 1 ? (
          <>
            <button
              type="button"
              aria-label="Previous photo"
              onClick={() => go(index - 1)}
              className="absolute top-1/2 left-2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-background/80 text-foreground shadow-md backdrop-blur transition-transform hover:scale-105"
            >
              <ChevronLeft className="size-4.5" />
            </button>
            <button
              type="button"
              aria-label="Next photo"
              onClick={() => go(index + 1)}
              className="absolute top-1/2 right-2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-background/80 text-foreground shadow-md backdrop-blur transition-transform hover:scale-105"
            >
              <ChevronRight className="size-4.5" />
            </button>
          </>
        ) : null}
      </div>

      {urls.length > 1 ? (
        <div className="flex gap-2">
          {urls.map((u, i) => (
            <button
              key={u}
              type="button"
              onClick={() => setState([i, i > index ? 1 : -1])}
              className={cn(
                "size-16 shrink-0 overflow-hidden rounded-lg border-2 transition-colors",
                i === index ? "border-primary" : "border-transparent opacity-70 hover:opacity-100",
              )}
            >
              <img src={u} alt="" className="size-full object-cover" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
