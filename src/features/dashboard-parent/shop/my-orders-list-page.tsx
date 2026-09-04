import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { ArrowLeft, PackageSearch } from "lucide-react"

import { DashboardLayout } from "@/app/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { StatusBadge } from "@/design-system/status-badge"
import { EmptyState } from "@/design-system/empty-state"
import { LoadingState } from "@/design-system/loading-state"
import { ErrorState } from "@/design-system/error-state"
import { formatCurrency } from "@/lib/currency"
import { formatDate } from "@/lib/date"
import { useParentNavItems } from "../children-list-page"
import { useMyOrders } from "./shop-api"
import { ProductCardMedia } from "./product-image"

export function MyOrdersListPage() {
  const navigate = useNavigate()
  const navItems = useParentNavItems()
  const { data, isLoading, isError, refetch } = useMyOrders()

  return (
    <DashboardLayout title="Shop" navItems={navItems}>
      <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate("/parent/shop")}>
        <ArrowLeft /> Back to shop
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>My Orders</CardTitle>
          <CardDescription>Track the status of items you've ordered from the academy shop</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingState rows={3} />
          ) : isError ? (
            <ErrorState onRetry={() => void refetch()} />
          ) : !data || data.length === 0 ? (
            <EmptyState
              icon={PackageSearch}
              title="No orders yet"
              description="Items you order from the shop will appear here."
              action={
                <Button size="sm" onClick={() => navigate("/parent/shop")}>
                  Browse shop
                </Button>
              }
            />
          ) : (
            <div className="space-y-2">
              {data.map((order, i) => {
                const firstItem = order.items[0]
                return (
                  <motion.button
                    key={order.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.04 }}
                    onClick={() => navigate(`/parent/shop/orders/${order.id}`)}
                    className="flex w-full items-center gap-3 rounded-xl border border-border p-3 text-left transition-colors hover:border-primary/30 hover:bg-muted/40"
                  >
                    {firstItem ? (
                      <ProductCardMedia
                        basePath="/parent-portal/shop/products"
                        productId={firstItem.productVariant.product.id}
                        category={firstItem.productVariant.product.category}
                        images={firstItem.productVariant.product.images}
                        className="size-14 shrink-0 rounded-lg"
                      />
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">
                        {order.player.firstName} {order.player.lastName} · {order.items.length}{" "}
                        {order.items.length === 1 ? "item" : "items"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(order.createdAt)} · {formatCurrency(Number(order.totalAmount))}
                      </p>
                    </div>
                    <StatusBadge status={order.status} />
                  </motion.button>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  )
}
