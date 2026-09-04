import { useRef } from "react"
import { motion } from "framer-motion"
import { Plus, X } from "lucide-react"

import { useProductImageUrls } from "@/features/dashboard-parent/shop/product-image"
import { useAddProductImage, useRemoveProductImage, type ShopProduct } from "./merchandise-api"

export function ProductImagesPanel({ product }: { product: ShopProduct }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const urls = useProductImageUrls("/merchandise/products", product.id, product.images)
  const addImage = useAddProductImage(product.id)
  const removeImage = useRemoveProductImage(product.id)

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">
        Photos <span className="font-normal text-muted-foreground">(first is the cover image)</span>
      </p>
      <div className="flex flex-wrap gap-2">
        {product.images.map((img, i) => (
          <motion.div
            key={img.id}
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="group relative size-20 overflow-hidden rounded-lg border border-border bg-muted"
          >
            {urls[i] ? <img src={urls[i]} alt="" className="size-full object-cover" /> : null}
            <button
              type="button"
              onClick={() => removeImage.mutate(img.id)}
              className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-full bg-background/90 text-foreground opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
              aria-label="Remove photo"
            >
              <X className="size-3" />
            </button>
          </motion.div>
        ))}

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ""
            if (file) addImage.mutate(file)
          }}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={addImage.isPending}
          className="flex size-20 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-50"
        >
          <Plus className="size-4" />
          <span className="text-[11px]">{addImage.isPending ? "Uploading…" : "Add"}</span>
        </button>
      </div>
    </div>
  )
}
