import { useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowLeft, Check, Minus, Plus, ShoppingCart } from "lucide-react"

import { DashboardLayout } from "@/app/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { LoadingState } from "@/design-system/loading-state"
import { ErrorState } from "@/design-system/error-state"
import { formatCurrency } from "@/lib/currency"
import { useParentNavItems } from "../children-list-page"
import { useShopProduct } from "./shop-api"
import { ProductGallery } from "./product-image"
import { useCart } from "./shop-cart-context"

const CATEGORY_LABELS: Record<string, string> = {
  JERSEY: "Jerseys",
  TRACK_SUIT: "Track Suits",
  BOOTS: "Boots",
  SOCKS: "Socks",
  OTHER: "Other",
}

export function ProductDetailPage() {
  const { productId } = useParams<{ productId: string }>()
  const navigate = useNavigate()
  const navItems = useParentNavItems()
  const { data: product, isLoading, isError, refetch } = useShopProduct(productId)
  const { addLine } = useCart()
  const [variantId, setVariantId] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [added, setAdded] = useState(false)

  const variant = product?.variants.find((v) => v.id === variantId) ?? null

  return (
    <DashboardLayout title="Shop" navItems={navItems}>
      <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate("/parent/shop")}>
        <ArrowLeft /> Back to shop
      </Button>

      {isLoading ? (
        <LoadingState rows={4} />
      ) : isError || !product ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="grid grid-cols-1 gap-8 lg:grid-cols-2"
        >
          <ProductGallery
            basePath="/parent-portal/shop/products"
            productId={product.id}
            category={product.category}
            images={product.images}
          />

          <div className="space-y-6">
            <div className="space-y-2">
              <span className="text-xs font-medium tracking-wide text-primary uppercase">
                {CATEGORY_LABELS[product.category] ?? product.category}
              </span>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{product.name}</h1>
              {product.description ? (
                <p className="max-w-md text-sm leading-relaxed text-muted-foreground">{product.description}</p>
              ) : null}
            </div>

            <div className="h-px bg-border" />

            <div>
              <p className="mb-1.5 text-sm font-medium">Size</p>
              {product.variants.length === 0 ? (
                <p className="text-sm text-muted-foreground">No sizes available yet.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {product.variants.map((v) => {
                    const outOfStock = !v.isActive || v.stockQuantity === 0
                    const isSelected = variantId === v.id
                    return (
                      <button
                        key={v.id}
                        type="button"
                        disabled={outOfStock}
                        onClick={() => {
                          setVariantId(v.id)
                          setQuantity(1)
                          setAdded(false)
                        }}
                        className={`relative min-w-11 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors ${
                          isSelected ? "text-primary-foreground" : "text-foreground hover:border-primary/40"
                        } ${outOfStock ? "cursor-not-allowed text-muted-foreground/50 line-through" : ""}`}
                      >
                        {isSelected ? (
                          <motion.span
                            layoutId="pdp-size-pill"
                            className="absolute inset-0 rounded-xl bg-primary"
                            transition={{ type: "spring", stiffness: 400, damping: 32 }}
                          />
                        ) : (
                          <span className="absolute inset-0 rounded-xl border border-border" />
                        )}
                        <span className="relative">{v.sizeLabel}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            <AnimatePresence mode="wait">
              {variant ? (
                <motion.div
                  key={variant.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-5"
                >
                  <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 p-4">
                    <span className="text-2xl font-bold tabular-nums tracking-tight">
                      {formatCurrency(Number(variant.priceOverride ?? product.basePrice))}
                    </span>
                    <Badge variant={variant.stockQuantity <= 3 ? "warning" : "outline"}>
                      {variant.stockQuantity} in stock
                    </Badge>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">Quantity</span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        disabled={quantity <= 1}
                      >
                        <Minus />
                      </Button>
                      <span className="w-8 text-center tabular-nums">{quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setQuantity((q) => Math.min(variant.stockQuantity, q + 1))}
                        disabled={quantity >= variant.stockQuantity}
                      >
                        <Plus />
                      </Button>
                    </div>
                  </div>

                  <Button
                    className="w-full"
                    size="lg"
                    onClick={() => {
                      addLine(
                        {
                          productId: product.id,
                          productName: product.name,
                          category: product.category,
                          images: product.images,
                          variantId: variant.id,
                          sizeLabel: variant.sizeLabel,
                          unitPrice: Number(variant.priceOverride ?? product.basePrice),
                          stockQuantity: variant.stockQuantity,
                        },
                        quantity,
                      )
                      setAdded(true)
                    }}
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      {added ? (
                        <motion.span
                          key="added"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="flex items-center gap-2"
                        >
                          <Check className="size-4" /> Added to cart
                        </motion.span>
                      ) : (
                        <motion.span
                          key="add"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="flex items-center gap-2"
                        >
                          <ShoppingCart className="size-4" /> Add to cart
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </Button>
                  {added ? (
                    <Button variant="outline" className="w-full" onClick={() => navigate("/parent/shop/cart")}>
                      View cart
                    </Button>
                  ) : null}
                </motion.div>
              ) : (
                <motion.p
                  key="prompt"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-sm text-muted-foreground"
                >
                  Select a size to continue.
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </DashboardLayout>
  )
}
