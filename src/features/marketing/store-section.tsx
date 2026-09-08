import { useState } from "react"
import { motion } from "framer-motion"
import { ArrowLeft, CheckCircle2, Footprints, Package, Search, Shirt } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { formatCurrency } from "@/lib/currency"
import { ApiError } from "@/lib/api-client"
import { SectionHeading } from "./section-heading"
import {
  useStoreProducts,
  useLookupPlayer,
  useCreateGuestOrder,
  storeProductImageUrl,
  type StoreProduct,
  type StoreProductCategory,
  type StorePlayerLookup,
} from "./store-api"

const CATEGORY_LABELS: Record<StoreProductCategory, string> = {
  JERSEY: "Jerseys",
  TRACK_SUIT: "Track Suits",
  BOOTS: "Boots",
  SOCKS: "Socks",
  OTHER: "Other",
}

const CATEGORY_ICON: Record<StoreProductCategory, typeof Shirt> = {
  JERSEY: Shirt,
  TRACK_SUIT: Shirt,
  BOOTS: Footprints,
  SOCKS: Footprints,
  OTHER: Package,
}

function priceLabel(product: StoreProduct): string {
  const prices = product.variants.map((v) => Number(v.priceOverride ?? product.basePrice))
  if (prices.length === 0) return formatCurrency(Number(product.basePrice))
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  return min === max ? formatCurrency(min) : `From ${formatCurrency(min)}`
}

function totalStock(product: StoreProduct): number {
  return product.variants.reduce((sum, v) => sum + (v.isActive ? v.stockQuantity : 0), 0)
}

function ProductMedia({ product, className }: { product: StoreProduct; className?: string }) {
  const cover = [...product.images].sort((a, b) => a.sortOrder - b.sortOrder)[0]
  const Icon = CATEGORY_ICON[product.category]

  if (!cover) {
    return (
      <div className={`flex items-center justify-center bg-gradient-to-br from-muted to-muted/50 ${className}`}>
        <Icon className="size-1/4 text-muted-foreground/50" strokeWidth={1.25} aria-hidden />
      </div>
    )
  }

  return (
    <div className={`overflow-hidden bg-muted ${className}`}>
      <img
        src={storeProductImageUrl(product.id, cover.id)}
        alt=""
        loading="lazy"
        className="size-full object-cover"
      />
    </div>
  )
}

function CategoryPills({
  categories,
  active,
  onChange,
}: {
  categories: StoreProductCategory[]
  active: StoreProductCategory | "ALL"
  onChange: (c: StoreProductCategory | "ALL") => void
}) {
  const options: (StoreProductCategory | "ALL")[] = ["ALL", ...categories]
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {options.map((c) => {
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
                layoutId="landing-store-category-pill"
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

type CheckoutStep = "view" | "checkout" | "done"

function ProductView({
  product,
  variantId,
  onVariantChange,
  quantity,
  onQuantityChange,
  onCheckout,
}: {
  product: StoreProduct
  variantId: string
  onVariantChange: (id: string) => void
  quantity: number
  onQuantityChange: (n: number) => void
  onCheckout: () => void
}) {
  const outOfStock = totalStock(product) === 0
  const orderable = product.variants.filter((v) => v.isActive && v.stockQuantity > 0)
  const variant = product.variants.find((v) => v.id === variantId)

  return (
    <>
      <ProductMedia product={product} className="-mx-6 -mt-6 mb-2 aspect-square w-[calc(100%+3rem)] sm:-mx-6" />
      <DialogHeader>
        <DialogTitle>{product.name}</DialogTitle>
        <DialogDescription>{CATEGORY_LABELS[product.category]}</DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        {product.description ? <p className="text-sm text-muted-foreground">{product.description}</p> : null}
        <div className="flex items-center justify-between">
          <span className="text-lg font-semibold tabular-nums">{priceLabel(product)}</span>
          {outOfStock ? <Badge variant="destructive">Out of stock</Badge> : null}
        </div>

        {!outOfStock ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="store-variant">Size</Label>
              <Select id="store-variant" value={variantId} onChange={(e) => onVariantChange(e.target.value)}>
                {orderable.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.sizeLabel}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="store-quantity">Quantity</Label>
              <Input
                id="store-quantity"
                type="number"
                min={1}
                max={variant?.stockQuantity ?? 1}
                value={quantity}
                onChange={(e) => onQuantityChange(Math.max(1, Number(e.target.value) || 1))}
              />
            </div>
          </div>
        ) : null}
      </div>
      <DialogFooter>
        <Button onClick={onCheckout} disabled={outOfStock || !variant}>
          Buy now
        </Button>
      </DialogFooter>
    </>
  )
}

function CheckoutView({
  product,
  variant,
  quantity,
  onBack,
  onDone,
}: {
  product: StoreProduct
  variant: { id: string; sizeLabel: string; priceOverride: string | null; stockQuantity: number }
  quantity: number
  onBack: () => void
  onDone: (total: string) => void
}) {
  const [playerCode, setPlayerCode] = useState("")
  const [player, setPlayer] = useState<StorePlayerLookup | null>(null)
  const [guestName, setGuestName] = useState("")
  const [guestPhone, setGuestPhone] = useState("")
  const [guestEmail, setGuestEmail] = useState("")
  const [error, setError] = useState<string | null>(null)

  const lookupPlayer = useLookupPlayer()
  const createOrder = useCreateGuestOrder()

  const unitPrice = Number(variant.priceOverride ?? product.basePrice)
  const total = unitPrice * quantity

  const onFindPlayer = async () => {
    setError(null)
    setPlayer(null)
    try {
      const found = await lookupPlayer.mutateAsync(playerCode.trim())
      setPlayer(found)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not find that player.")
    }
  }

  const onSubmit = async () => {
    if (!player) return
    setError(null)
    try {
      const result = await createOrder.mutateAsync({
        playerCode: playerCode.trim(),
        guestName: guestName.trim(),
        guestPhone: guestPhone.trim(),
        guestEmail: guestEmail.trim() || undefined,
        items: [{ productVariantId: variant.id, quantity }],
      })
      onDone(result.totalAmount)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not place the order.")
    }
  }

  const canSubmit = !!player && guestName.trim().length > 0 && guestPhone.trim().length > 0

  return (
    <>
      <DialogHeader>
        <Button variant="ghost" size="sm" className="-ml-2 w-fit" onClick={onBack}>
          <ArrowLeft /> Back
        </Button>
        <DialogTitle>Checkout</DialogTitle>
        <DialogDescription>
          {product.name} ({variant.sizeLabel}) × {quantity} — {formatCurrency(total)}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="store-player-code">Player code</Label>
          <div className="flex gap-2">
            <Input
              id="store-player-code"
              placeholder="e.g. KP-0231"
              value={playerCode}
              onChange={(e) => {
                setPlayerCode(e.target.value)
                setPlayer(null)
              }}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => void onFindPlayer()}
              disabled={!playerCode.trim() || lookupPlayer.isPending}
            >
              <Search /> {lookupPlayer.isPending ? "Finding…" : "Find"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            The unique code given to your player at registration — this links the order to them.
          </p>
          {player ? (
            <p className="flex items-center gap-1.5 text-sm font-medium text-success">
              <CheckCircle2 className="size-4 shrink-0" /> Ordering for {player.firstName} {player.lastName}
              {player.team ? ` · ${player.team.name}` : ""}
            </p>
          ) : null}
        </div>

        {player ? (
          <div className="space-y-3 border-t border-border pt-4">
            <div className="space-y-1.5">
              <Label htmlFor="store-guest-name">Your name</Label>
              <Input id="store-guest-name" value={guestName} onChange={(e) => setGuestName(e.target.value)} />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="store-guest-phone">Phone</Label>
                <Input id="store-guest-phone" value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="store-guest-email">Email (optional)</Label>
                <Input
                  id="store-guest-email"
                  type="email"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                />
              </div>
            </div>
          </div>
        ) : null}

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>

      <DialogFooter>
        <Button onClick={() => void onSubmit()} disabled={!canSubmit || createOrder.isPending}>
          {createOrder.isPending ? "Placing order…" : `Place order — ${formatCurrency(total)}`}
        </Button>
      </DialogFooter>
    </>
  )
}

function DoneView({ total, onClose }: { total: string; onClose: () => void }) {
  return (
    <>
      <DialogHeader>
        <div className="mb-1 flex size-9 shrink-0 items-center justify-center rounded-lg bg-success/15 text-success">
          <CheckCircle2 className="size-4.5" />
        </div>
        <DialogTitle>Order placed</DialogTitle>
        <DialogDescription>
          Total {formatCurrency(Number(total))}. The academy will contact you to confirm payment and pickup.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button onClick={onClose}>Done</Button>
      </DialogFooter>
    </>
  )
}

function ProductDetailDialog({ product, onClose }: { product: StoreProduct; onClose: () => void }) {
  const [step, setStep] = useState<CheckoutStep>("view")
  const [variantId, setVariantId] = useState(
    product.variants.find((v) => v.isActive && v.stockQuantity > 0)?.id ?? "",
  )
  const [quantity, setQuantity] = useState(1)
  const [orderTotal, setOrderTotal] = useState("0")

  const variant = product.variants.find((v) => v.id === variantId)

  return (
    <DialogContent>
      {step === "view" ? (
        <ProductView
          product={product}
          variantId={variantId}
          onVariantChange={(id) => {
            setVariantId(id)
            setQuantity(1)
          }}
          quantity={quantity}
          onQuantityChange={setQuantity}
          onCheckout={() => setStep("checkout")}
        />
      ) : step === "checkout" && variant ? (
        <CheckoutView
          product={product}
          variant={variant}
          quantity={quantity}
          onBack={() => setStep("view")}
          onDone={(total) => {
            setOrderTotal(total)
            setStep("done")
          }}
        />
      ) : (
        <DoneView total={orderTotal} onClose={onClose} />
      )}
    </DialogContent>
  )
}

function ProductCard({
  product,
  index,
  onSelect,
}: {
  product: StoreProduct
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
        <ProductMedia product={product} className="aspect-square w-full" />
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

export function StoreSection() {
  const { data } = useStoreProducts()
  const [category, setCategory] = useState<StoreProductCategory | "ALL">("ALL")
  const [selected, setSelected] = useState<StoreProduct | null>(null)

  const products = data ?? []
  if (products.length === 0) return null

  const categories = [...new Set(products.map((p) => p.category))]
  const filtered = products.filter((p) => category === "ALL" || p.category === category)

  return (
    <section id="store" className="py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Store"
          title="Official academy gear"
          description="Jerseys, boots, and training wear — order online with your player's code, no account needed."
        />

        <div className="mt-8 flex justify-center">
          <CategoryPills categories={categories} active={category} onChange={setCategory} />
        </div>

        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((product, i) => (
            <ProductCard key={product.id} product={product} index={i} onSelect={() => setSelected(product)} />
          ))}
        </div>
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        {selected ? <ProductDetailDialog product={selected} onClose={() => setSelected(null)} /> : null}
      </Dialog>
    </section>
  )
}
