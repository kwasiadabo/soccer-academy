import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Search, X } from "lucide-react"

import { DashboardLayout } from "@/app/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { Select } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { StatusBadge } from "@/design-system/status-badge"
import { EmptyState } from "@/design-system/empty-state"
import { LoadingState } from "@/design-system/loading-state"
import { ErrorState } from "@/design-system/error-state"
import { formatCurrency } from "@/lib/currency"
import { formatDate } from "@/lib/date"
import { useStaffNavItems } from "@/features/issues/staff-issues-page"
import { useAllOrders, type MerchandiseOrderStatus } from "./merchandise-api"
import { RecordMerchandisePaymentDialog, remainingOnInvoice } from "./merchandise-payment-dialog"

const STATUS_OPTIONS: { value: MerchandiseOrderStatus | ""; label: string }[] = [
  { value: "", label: "All statuses" },
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "READY_FOR_PICKUP", label: "Ready for Pickup" },
  { value: "FULFILLED", label: "Fulfilled" },
  { value: "REJECTED", label: "Rejected" },
  { value: "CANCELLED", label: "Cancelled" },
]

function AllOrdersTab() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<MerchandiseOrderStatus | "">("")
  const [search, setSearch] = useState("")
  const { data, isLoading, isError, refetch } = useAllOrders(status || undefined)

  const hasActiveFilters = search.trim() !== "" || status !== ""
  const clearFilters = () => {
    setSearch("")
    setStatus("")
  }

  const filteredData = useMemo(() => {
    if (!data) return data
    const query = search.trim().toLowerCase()
    return data.filter((order) => {
      const matchesSearch =
        query === "" ||
        `${order.player.firstName} ${order.player.lastName}`.toLowerCase().includes(query) ||
        `${order.guardian.firstName} ${order.guardian.lastName}`.toLowerCase().includes(query) ||
        (order.invoice?.invoiceNumber ?? "").toLowerCase().includes(query)
      return matchesSearch
    })
  }, [data, search])

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
        <div>
          <CardTitle>Merchandise Orders</CardTitle>
          <CardDescription>Requests logged by parents from the academy shop</CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-auto">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by customer or invoice…"
              className="w-full pl-8 sm:w-64"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Label htmlFor="order-status-filter" className="sr-only">
            Filter by status
          </Label>
          <Select
            id="order-status-filter"
            value={status}
            onChange={(e) => setStatus(e.target.value as MerchandiseOrderStatus | "")}
            className="w-auto"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
          {hasActiveFilters ? (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X /> Clear
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <LoadingState rows={4} />
        ) : isError ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : !data || data.length === 0 ? (
          <EmptyState title="No orders" description="Nothing has been ordered from the shop yet." />
        ) : !filteredData || filteredData.length === 0 ? (
          <EmptyState title="No matching orders" description="Try adjusting your search or filters." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Player</TableHead>
                <TableHead>Guardian</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((order) => (
                <TableRow
                  key={order.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/merchandise/orders/${order.id}`)}
                >
                  <TableCell className="font-medium">
                    {order.player.firstName} {order.player.lastName}
                  </TableCell>
                  <TableCell>
                    {order.guardian.firstName} {order.guardian.lastName}
                  </TableCell>
                  <TableCell className="tabular-nums">{order.items.length}</TableCell>
                  <TableCell className="tabular-nums">{formatCurrency(Number(order.totalAmount))}</TableCell>
                  <TableCell>{formatDate(order.updatedAt)}</TableCell>
                  <TableCell>
                    <StatusBadge status={order.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

// Approved orders awaiting payment — a merchandise-only queue, deliberately
// separate from the receptionist's monthly-subscription debtors/collection
// flow (Payments & Debtors screen), so staff working the shop don't have to
// go hunting through the general fee ledger to collect for an order.
function CollectPaymentTab() {
  const navigate = useNavigate()
  const { data, isLoading, isError, refetch } = useAllOrders("APPROVED")
  const dueOrders = (data ?? []).filter((order) => order.invoice && remainingOnInvoice(order.invoice) > 0.01)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Awaiting Payment</CardTitle>
        <CardDescription>Approved orders with an outstanding balance</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <LoadingState rows={4} />
        ) : isError ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : dueOrders.length === 0 ? (
          <EmptyState title="All caught up" description="No approved orders are awaiting payment." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Player</TableHead>
                <TableHead>Guardian</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Amount due</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {dueOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell
                    className="cursor-pointer font-medium"
                    onClick={() => navigate(`/merchandise/orders/${order.id}`)}
                  >
                    {order.player.firstName} {order.player.lastName}
                  </TableCell>
                  <TableCell>
                    {order.guardian.firstName} {order.guardian.lastName}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {order.invoice?.description ?? `${order.items.length} item(s)`}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {formatCurrency(remainingOnInvoice(order.invoice!))}
                  </TableCell>
                  <TableCell>
                    <RecordMerchandisePaymentDialog playerId={order.playerId} invoice={order.invoice!} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

export function StaffOrdersPage() {
  const navItems = useStaffNavItems()

  return (
    <DashboardLayout title="Orders" navItems={navItems}>
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All Orders</TabsTrigger>
          <TabsTrigger value="payments">Collect Payment</TabsTrigger>
        </TabsList>
        <TabsContent value="all">
          <AllOrdersTab />
        </TabsContent>
        <TabsContent value="payments">
          <CollectPaymentTab />
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  )
}
