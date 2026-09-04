import { useNavigate, useParams } from "react-router-dom"
import { ArrowLeft } from "lucide-react"

import { DashboardLayout } from "@/app/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { StatusBadge } from "@/design-system/status-badge"
import { LoadingState } from "@/design-system/loading-state"
import { ErrorState } from "@/design-system/error-state"
import { formatCurrency } from "@/lib/currency"
import { formatDate } from "@/lib/date"
import { useStaffNavItems } from "@/features/issues/staff-issues-page"
import { useOrder, useUpdateOrderStatus, type MerchandiseOrderStatus } from "./merchandise-api"
import { RecordMerchandisePaymentDialog } from "./merchandise-payment-dialog"

const STATUS_OPTIONS: { value: MerchandiseOrderStatus; label: string }[] = [
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "READY_FOR_PICKUP", label: "Ready for Pickup" },
  { value: "FULFILLED", label: "Fulfilled" },
  { value: "REJECTED", label: "Rejected" },
  { value: "CANCELLED", label: "Cancelled" },
]

export function StaffOrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>()
  const navigate = useNavigate()
  const navItems = useStaffNavItems()
  const { data: order, isLoading, isError, refetch } = useOrder(orderId)
  const updateStatus = useUpdateOrderStatus(orderId ?? "")

  return (
    <DashboardLayout title="Orders" navItems={navItems}>
      <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate("/merchandise/orders")}>
        <ArrowLeft /> Back to orders
      </Button>

      {isLoading ? (
        <LoadingState rows={6} />
      ) : isError || !order ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : (
        <Card>
          <CardHeader className="flex-row flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>
                {order.player.firstName} {order.player.lastName}
                {order.player.playerCode ? ` · ${order.player.playerCode}` : ""}
              </CardTitle>
              <CardDescription>
                Ordered by {order.guardian.firstName} {order.guardian.lastName} · {formatDate(order.createdAt)}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="order-status" className="sr-only">
                Status
              </Label>
              <Select
                id="order-status"
                value={order.status}
                disabled={updateStatus.isPending}
                onChange={(e) => updateStatus.mutate({ status: e.target.value as MerchandiseOrderStatus })}
                className="w-auto"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
              <StatusBadge status={order.status} />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {updateStatus.isError ? (
              <p className="text-sm text-destructive">
                {updateStatus.error instanceof Error ? updateStatus.error.message : "Could not update this order."}
              </p>
            ) : null}

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Unit price</TableHead>
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.productVariant.product.name}</TableCell>
                    <TableCell>{item.productVariant.sizeLabel}</TableCell>
                    <TableCell className="tabular-nums">{item.quantity}</TableCell>
                    <TableCell className="tabular-nums">{formatCurrency(Number(item.unitPriceAtOrder))}</TableCell>
                    <TableCell className="tabular-nums font-medium">{formatCurrency(Number(item.lineTotal))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-4">
              <span className="text-sm font-medium">Order total</span>
              <span className="text-lg font-semibold tabular-nums">{formatCurrency(Number(order.totalAmount))}</span>
            </div>

            {order.invoice ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-4 text-sm">
                <div>
                  <p className="font-medium">Invoice {order.invoice.invoiceNumber}</p>
                  {order.invoice.description ? (
                    <p className="text-xs text-muted-foreground">{order.invoice.description}</p>
                  ) : null}
                  <p className="text-muted-foreground">
                    {formatCurrency(Number(order.invoice.amount))} · Due {formatDate(order.invoice.dueDate)} ·{" "}
                    <StatusBadge status={order.invoice.status} />
                  </p>
                </div>
                <RecordMerchandisePaymentDialog playerId={order.playerId} invoice={order.invoice} />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Approving this order will generate an invoice for the parent to pay.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </DashboardLayout>
  )
}
