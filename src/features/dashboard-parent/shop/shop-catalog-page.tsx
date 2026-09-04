import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { ShoppingBag, ShoppingCart, Sparkles } from "lucide-react"

import { DashboardLayout } from "@/app/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/design-system/empty-state"
import { LoadingState } from "@/design-system/loading-state"
import { ErrorState } from "@/design-system/error-state"
import { formatCurrency } from "@/lib/currency"
import { useParentNavItems } from "../children-list-page"
import { useShopProducts, type ProductCategory, type ShopProduct } from "./shop-api"
import { ProductCardMedia } from "./product-image"
import { useCart } from "./shop-cart-context"

const CATEGORY_LABELS: Record<ProductCategory, string> = {
  JERSEY: "Jerseys",
  TRACK_SUIT: "Track Suits",
  BOOTS: "Boots",
  SOCKS: "Socks",
  OTHER: "Other",
}

const CATEGORY_ORDER: (ProductCategory | "ALL")[] = ["ALL", "JERSEY", "TRACK_SUIT", "BOOTS", "SOCKS", "OTHER"]

function priceLabel(product: ShopProduct): string {
  const prices = product.variants.map((v) => Number(v.priceOverride ?? product.basePrice))
  if (prices.length === 0) return formatCurrency(Number(product.basePrice))
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  return min === max ? formatCurrency(min) : `From ${formatCurrency(min)}`
}

function totalStock(product: ShopProduct): number {
  return product.variants.reduce((sum, v) => sum + (v.isActive ? v.stockQuantity : 0), 0)
}

function CategoryPills({
  active,
  onChange,
}: {
  active: ProductCategory | "ALL"
  onChange: (c: ProductCategory | "ALL") => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {CATEGORY_ORDER.map((c) => {
        const isActive = active === c
        return (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            className={`relative rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              isActive ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {isActive ? (
              <motion.span
                layoutId="shop-category-pill"
                className="absolute inset-0 rounded-full bg-primary"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            ) : (
              <span className="absolute inset-0 rounded-full border border-border" />
            )}
            <span className="relative">{c === "ALL" ? "All items" : CATEGORY_LABELS[c]}</span>
          </button>
        )
      })}
    </div>
  )
}

function ProductCard({
  product,
  index,
  onSelect,
}: {
  product: ShopProduct
  index: number
  onSelect: () => void
}) {
  const outOfStock = totalStock(product) === 0

  return (
    <motion.button
      onClick={onSelect}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, delay: Math.min(index, 6) * 0.05, ease: "easeOut" }}
      whileHover={{ y: -4 }}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card text-left shadow-sm transition-shadow duration-200 hover:shadow-lg"
    >
      <div className="relative">
        <ProductCardMedia
          basePath="/parent-portal/shop/products"
          productId={product.id}
          category={product.category}
          images={product.images}
          className="aspect-square w-full"
        />
        {outOfStock ? (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-[1px]">
            <Badge variant="destructive">Out of stock</Badge>
          </div>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {CATEGORY_LABELS[product.category]}
        </span>
        <span className="font-semibold text-foreground transition-colors group-hover:text-primary">
          {product.name}
        </span>
        <span className="text-sm font-medium tabular-nums text-muted-foreground">{priceLabel(product)}</span>
      </div>
    </motion.button>
  )
}

export function ShopCatalogPage() {
  const navigate = useNavigate()
  const navItems = useParentNavItems()
  const { data, isLoading, isError, refetch } = useShopProducts()
  const { totalItems } = useCart()
  const [category, setCategory] = useState<ProductCategory | "ALL">("ALL")

  const products = (data ?? []).filter((p) => category === "ALL" || p.category === category)

  return (
    <DashboardLayout title="Shop" navItems={navItems}>
      <div className="space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative overflow-hidden rounded-3xl bg-sidebar px-6 py-10 sm:px-10 sm:py-12"
        >
          <div
            className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-primary/25 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-32 -left-16 size-64 rounded-full bg-primary/10 blur-3xl"
            aria-hidden
          />
          <div className="relative flex flex-col gap-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-lg space-y-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-sidebar-foreground/80">
                  <Sparkles className="size-3.5" /> Official academy gear
                </span>
                <h1 className="text-2xl font-bold tracking-tight text-sidebar-foreground sm:text-3xl">
                  Kit out your player
                </h1>
                <p className="text-sm text-sidebar-foreground/70 sm:text-base">
                  Jerseys, boots, and training wear — order online, pay at pickup.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/15 bg-white/5 text-sidebar-foreground hover:bg-white/10 hover:text-sidebar-foreground"
                  onClick={() => navigate("/parent/shop/orders")}
                >
                  My Orders
                </Button>
                <Button size="sm" onClick={() => navigate("/parent/shop/cart")} disabled={totalItems === 0}>
                  <ShoppingCart /> Cart{totalItems > 0 ? ` · ${totalItems}` : ""}
                </Button>
              </div>
            </div>
            <CategoryPills active={category} onChange={setCategory} />
          </div>
        </motion.div>

        {isLoading ? (
          <LoadingState rows={3} />
        ) : isError ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : products.length === 0 ? (
          <EmptyState
            icon={ShoppingBag}
            title="No items available"
            description="Check back soon — the academy shop is being stocked."
          />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product, i) => (
              <ProductCard
                key={product.id}
                product={product}
                index={i}
                onSelect={() => navigate(`/parent/shop/products/${product.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
