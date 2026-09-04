import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowLeft, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react"

import { DashboardLayout } from "@/app/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { EmptyState } from "@/design-system/empty-state"
import { formatCurrency } from "@/lib/currency"
import { ApiError } from "@/lib/api-client"
import { useParentNavItems } from "../children-list-page"
import { useChildren } from "../parent-portal-api"
import { useCart, type CartLine } from "./shop-cart-context"
import { ProductCardMedia } from "./product-image"
import { useSubmitOrder } from "./shop-api"

function CartRow({ line }: { line: CartLine }) {
  const { removeLine, setQuantity } = useCart()

  return (
    <motion.div
      layout
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="flex items-center gap-4 border-b border-border py-4 last:border-0"
    >
      <ProductCardMedia
        basePath="/parent-portal/shop/products"
        productId={line.productId}
        category={line.category}
        images={line.images}
        className="size-16 shrink-0 rounded-lg"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{line.productName}</p>
        <p className="text-sm text-muted-foreground">
          Size {line.sizeLabel} · {formatCurrency(line.unitPrice)}
        </p>
      </div>
      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="icon"
          className="size-8"
          onClick={() => setQuantity(line.variantId, line.quantity - 1)}
        >
          <Minus className="size-3.5" />
        </Button>
        <span className="w-6 text-center text-sm tabular-nums">{line.quantity}</span>
        <Button
          variant="outline"
          size="icon"
          className="size-8"
          onClick={() => setQuantity(line.variantId, line.quantity + 1)}
          disabled={line.quantity >= line.stockQuantity}
        >
          <Plus className="size-3.5" />
        </Button>
      </div>
      <span className="w-20 text-right font-medium tabular-nums">
        {formatCurrency(line.unitPrice * line.quantity)}
      </span>
      <Button variant="ghost" size="icon" onClick={() => removeLine(line.variantId)}>
        <Trash2 className="size-4 text-destructive" />
      </Button>
    </motion.div>
  )
}

export function CartReviewPage() {
  const navigate = useNavigate()
  const navItems = useParentNavItems()
  const { data: children } = useChildren()
  const { lines, clear, totalAmount } = useCart()
  const submitOrder = useSubmitOrder()
  const [playerId, setPlayerId] = useState("")
  const [serverError, setServerError] = useState<string | null>(null)

  const onSubmit = async () => {
    setServerError(null)
    if (!playerId) {
      setServerError("Select which child this order is for")
      return
    }
    try {
      const order = await submitOrder.mutateAsync({
        playerId,
        items: lines.map((l) => ({ productVariantId: l.variantId, quantity: l.quantity })),
      })
      clear()
      navigate(`/parent/shop/orders/${order.id}`)
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : "Could not submit this order.")
    }
  }

  return (
    <DashboardLayout title="Shop" navItems={navItems}>
      <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate("/parent/shop")}>
        <ArrowLeft /> Back to shop
      </Button>

      {lines.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <EmptyState
              icon={ShoppingBag}
              title="Your cart is empty"
              description="Browse the shop to add items."
              action={
                <Button size="sm" onClick={() => navigate("/parent/shop")}>
                  Browse shop
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Your Cart</CardTitle>
              <CardDescription>
                {lines.length} {lines.length === 1 ? "item" : "items"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AnimatePresence initial={false}>
                {lines.map((line) => (
                  <CartRow key={line.variantId} line={line} />
                ))}
              </AnimatePresence>
            </CardContent>
          </Card>

          <Card className="h-fit lg:sticky lg:top-6">
            <CardHeader>
              <CardTitle className="text-base">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total</span>
                <span className="text-2xl font-bold tabular-nums">{formatCurrency(totalAmount)}</span>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cart-player">Who is this order for?</Label>
                <Select id="cart-player" value={playerId} onChange={(e) => setPlayerId(e.target.value)}>
                  <option value="" disabled>
                    Select a child
                  </option>
                  {(children ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.firstName} {c.lastName}
                    </option>
                  ))}
                </Select>
              </div>

              {serverError ? <p className="text-sm text-destructive">{serverError}</p> : null}

              <Button className="w-full" size="lg" onClick={() => void onSubmit()} disabled={submitOrder.isPending}>
                {submitOrder.isPending ? "Submitting…" : "Submit order"}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                The academy will review your order and invoice you for pickup.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </DashboardLayout>
  )
}
