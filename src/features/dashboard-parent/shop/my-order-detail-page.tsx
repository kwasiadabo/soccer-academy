import { useNavigate, useParams } from "react-router-dom"
import { motion } from "framer-motion"
import { ArrowLeft } from "lucide-react"

import { DashboardLayout } from "@/app/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { StatusBadge } from "@/design-system/status-badge"
import { LoadingState } from "@/design-system/loading-state"
import { ErrorState } from "@/design-system/error-state"
import { formatCurrency } from "@/lib/currency"
import { formatDate } from "@/lib/date"
import { useParentNavItems } from "../children-list-page"
import { useMyOrder } from "./shop-api"
import { ProductCardMedia } from "./product-image"

export function MyOrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>()
  const navigate = useNavigate()
  const navItems = useParentNavItems()
  const { data: order, isLoading, isError, refetch } = useMyOrder(orderId)

  return (
    <DashboardLayout title="Shop" navItems={navItems}>
      <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate("/parent/shop/orders")}>
        <ArrowLeft /> Back to my orders
      </Button>

      {isLoading ? (
        <LoadingState rows={5} />
      ) : isError || !order ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
          <Card>
            <CardHeader className="flex-row flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>
                  Order for {order.player.firstName} {order.player.lastName}
                </CardTitle>
                <CardDescription>Placed {formatDate(order.createdAt)}</CardDescription>
              </div>
              <StatusBadge status={order.status} />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="divide-y divide-border rounded-xl border border-border">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-4 p-3">
                    <ProductCardMedia
                      basePath="/parent-portal/shop/products"
                      productId={item.productVariant.product.id}
                      category={item.productVariant.product.category}
                      images={item.productVariant.product.images}
                      className="size-14 shrink-0 rounded-lg"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{item.productVariant.product.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Size {item.productVariant.sizeLabel} · Qty {item.quantity} ·{" "}
                        {formatCurrency(Number(item.unitPriceAtOrder))} each
                      </p>
                    </div>
                    <span className="font-medium tabular-nums">{formatCurrency(Number(item.lineTotal))}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 p-4">
                <span className="text-sm font-medium">Order total</span>
                <span className="text-lg font-semibold tabular-nums">{formatCurrency(Number(order.totalAmount))}</span>
              </div>

              {order.invoice ? (
                <div className="rounded-xl border border-border p-4 text-sm">
                  <p className="font-medium">Invoice {order.invoice.invoiceNumber}</p>
                  <p className="text-muted-foreground">
                    {formatCurrency(Number(order.invoice.amount))} · Due {formatDate(order.invoice.dueDate)} ·{" "}
                    <StatusBadge status={order.invoice.status} />
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    View payment details from your child's Financial tab.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  An invoice will be generated once the academy approves this order.
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </DashboardLayout>
  )
}
