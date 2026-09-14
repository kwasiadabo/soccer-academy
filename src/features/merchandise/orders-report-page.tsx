import { useMemo, useState } from "react"
import { Download, Printer, Search, X } from "lucide-react"

import { DashboardLayout } from "@/app/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { EmptyState } from "@/design-system/empty-state"
import { LoadingState } from "@/design-system/loading-state"
import { ErrorState } from "@/design-system/error-state"
import { useStaffNavItems } from "@/features/issues/staff-issues-page"
import { downloadCsv, toCsv } from "@/lib/csv"
import { formatCurrency } from "@/lib/currency"
import { formatDate } from "@/lib/date"
import { useOrdersReport, type OrdersReportRow, type OrdersReportStatus } from "./merchandise-api"

const CATEGORY_LABELS: Record<string, string> = {
  JERSEY: "Jersey",
  TRACK_SUIT: "Track Suit",
  BOOTS: "Boots",
  SOCKS: "Socks",
  OTHER: "Other",
}

const STATUS_OPTIONS: { value: OrdersReportStatus; label: string }[] = [
  { value: "SOLD", label: "Sold (paid)" },
  { value: "PENDING", label: "Pending (awaiting payment)" },
]

function startOfMonth(): string {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export function OrdersReportPage() {
  const navItems = useStaffNavItems()
  const [from, setFrom] = useState(startOfMonth())
  const [to, setTo] = useState(today())
  const [status, setStatus] = useState<OrdersReportStatus>("SOLD")
  const [search, setSearch] = useState("")
  const [productName, setProductName] = useState("")

  const { data, isLoading, isError, refetch } = useOrdersReport({
    from: from || undefined,
    to: to || undefined,
    status,
  })

  const isSold = status === "SOLD"

  const productOptions = useMemo(() => {
    if (!data) return []
    return Array.from(new Set(data.rows.map((r) => r.productName))).sort()
  }, [data])

  const hasActiveFilters = search.trim() !== "" || productName !== ""
  const clearFilters = () => {
    setSearch("")
    setProductName("")
  }

  const filteredRows = useMemo(() => {
    if (!data) return undefined
    const query = search.trim().toLowerCase()
    return data.rows.filter((row) => {
      if (productName && row.productName !== productName) return false
      if (query === "") return true
      return (
        `${row.player.firstName} ${row.player.lastName}`.toLowerCase().includes(query) ||
        row.productName.toLowerCase().includes(query) ||
        (row.invoiceNumber ?? "").toLowerCase().includes(query)
      )
    })
  }, [data, search, productName])

  const onExportCsv = () => {
    if (!filteredRows || filteredRows.length === 0) return
    const csv = toCsv<OrdersReportRow>(filteredRows, [
      { key: "date", label: isSold ? "Date paid" : "Date ordered", value: (r) => formatDate(r.date) },
      { key: "invoiceNumber", label: "Invoice #", value: (r) => r.invoiceNumber ?? "—" },
      { key: "player", label: "Player", value: (r) => `${r.player.firstName} ${r.player.lastName}` },
      { key: "productName", label: "Item", value: (r) => r.productName },
      { key: "category", label: "Category", value: (r) => CATEGORY_LABELS[r.category] ?? r.category },
      { key: "sizeLabel", label: "Size", value: (r) => r.sizeLabel },
      { key: "quantity", label: "Qty", value: (r) => String(r.quantity) },
      { key: "unitPriceAtOrder", label: "Unit price (GHS)", value: (r) => r.unitPriceAtOrder.toFixed(2) },
      { key: "lineTotal", label: "Line total (GHS)", value: (r) => r.lineTotal.toFixed(2) },
    ])
    downloadCsv(`orders-report_${status.toLowerCase()}_${from || "all"}_${to || "all"}.csv`, csv)
  }

  return (
    <DashboardLayout title="Orders Report" navItems={navItems}>
      <Card className="print-area">
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Orders Report</CardTitle>
            <CardDescription>
              {isSold
                ? "Items ordered and paid for within a date range, and revenue realised"
                : "Items ordered but still awaiting payment within a date range"}
            </CardDescription>
          </div>
          <div className="flex gap-2 print-hidden">
            <Button size="sm" variant="outline" onClick={() => window.print()}>
              <Printer /> Print / Save PDF
            </Button>
            <Button size="sm" variant="outline" onClick={onExportCsv} disabled={!filteredRows || filteredRows.length === 0}>
              <Download /> Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="hidden text-sm text-muted-foreground print:block">
            {STATUS_OPTIONS.find((o) => o.value === status)?.label} · {from || "Start"} to {to || "Today"}
          </p>
          <div className="flex flex-wrap items-end gap-4 print-hidden">
            <div className="space-y-1.5">
              <Label htmlFor="report-status">Status</Label>
              <Select id="report-status" value={status} onChange={(e) => setStatus(e.target.value as OrdersReportStatus)}>
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="report-from">From</Label>
              <Input id="report-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="report-to">To</Label>
              <Input id="report-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="report-product">Product</Label>
              <Select id="report-product" value={productName} onChange={(e) => setProductName(e.target.value)}>
                <option value="">All products</option>
                {productOptions.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="relative flex-1 space-y-1.5">
              <Label htmlFor="report-search">Search</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="report-search"
                  placeholder="Search by player, item, or invoice #"
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            {hasActiveFilters ? (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X /> Clear
              </Button>
            ) : null}
          </div>

          {isLoading ? (
            <LoadingState rows={4} />
          ) : isError ? (
            <ErrorState onRetry={() => void refetch()} />
          ) : !data || data.rows.length === 0 ? (
            <EmptyState
              title={isSold ? "No paid orders found" : "No pending orders found"}
              description={
                isSold
                  ? "No orders were fully paid within this date range."
                  : "No orders are awaiting payment within this date range."
              }
            />
          ) : !filteredRows || filteredRows.length === 0 ? (
            <EmptyState title="No matching orders" description="Try a different search or product filter." />
          ) : (
            <>
              <div className="flex flex-wrap gap-6 rounded-lg border border-border bg-muted/30 p-4">
                <div>
                  <p className="text-xs text-muted-foreground">{isSold ? "Revenue realised" : "Amount pending"}</p>
                  <p className="text-lg font-semibold">{formatCurrency(data.summary.totalAmount)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Orders</p>
                  <p className="text-lg font-semibold">{data.summary.orderCount}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{isSold ? "Items sold" : "Items pending"}</p>
                  <p className="text-lg font-semibold">{data.summary.itemCount}</p>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>{isSold ? "Date paid" : "Date ordered"}</TableHead>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Player</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Unit price</TableHead>
                    <TableHead>Line total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.map((row, index) => (
                    <TableRow key={`${row.orderId}-${row.productName}-${row.sizeLabel}-${index}`}>
                      <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                      <TableCell>{formatDate(row.date)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{row.invoiceNumber ?? "—"}</TableCell>
                      <TableCell className="font-medium">
                        {row.player.firstName} {row.player.lastName}
                      </TableCell>
                      <TableCell>{row.productName}</TableCell>
                      <TableCell>{row.sizeLabel}</TableCell>
                      <TableCell>{row.quantity}</TableCell>
                      <TableCell>{formatCurrency(row.unitPriceAtOrder)}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(row.lineTotal)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  )
}
