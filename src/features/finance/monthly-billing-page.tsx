import { formatDate } from "@/lib/date"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
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
import { StatusBadge } from "@/design-system/status-badge"
import { RECEPTIONIST_NAV_ITEMS } from "@/features/dashboard-receptionist/receptionist-dashboard"
import { downloadCsv, toCsv } from "@/lib/csv"
import { formatCurrency } from "@/lib/currency"
import { useMonthlyBilling, type MonthlyBillingRow } from "./finance-api"

function currentMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

export function MonthlyBillingPage() {
  const navigate = useNavigate()
  const [month, setMonth] = useState(currentMonth())
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const { data, isLoading, isError, refetch } = useMonthlyBilling(month)

  const hasActiveFilters = search.trim() !== "" || statusFilter !== ""
  const clearFilters = () => {
    setSearch("")
    setStatusFilter("")
  }

  const rows = (data?.rows ?? [])
    .filter((r) => !statusFilter || r.status === statusFilter)
    .filter((r) => {
      const q = search.trim().toLowerCase()
      if (!q) return true
      return (
        `${r.player.firstName} ${r.player.lastName}`.toLowerCase().includes(q) ||
        (r.player.playerCode ?? "").toLowerCase().includes(q)
      )
    })

  const onExportCsv = () => {
    if (rows.length === 0) return
    const csv = toCsv<MonthlyBillingRow>(rows, [
      { key: "player", label: "Player", value: (r) => `${r.player.firstName} ${r.player.lastName}` },
      { key: "playerCode", label: "Player ID", value: (r) => r.player.playerCode ?? "" },
      { key: "feeTypeName", label: "Fee", value: (r) => r.feeTypeName },
      { key: "amount", label: "Amount (GHS)", value: (r) => r.amount.toFixed(2) },
      { key: "remaining", label: "Remaining (GHS)", value: (r) => r.remaining.toFixed(2) },
      { key: "dueDate", label: "Due date", value: (r) => formatDate(r.dueDate) },
      { key: "status", label: "Status", value: (r) => r.status },
    ])
    downloadCsv(`monthly-billing_${month}.csv`, csv)
  }

  return (
    <DashboardLayout title="Monthly Billing" navItems={RECEPTIONIST_NAV_ITEMS}>
      <Card className="print-area">
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Monthly Billing</CardTitle>
            <CardDescription>
              Subscription invoices generated automatically on the 1st of each month, one per active player.
            </CardDescription>
          </div>
          <div className="flex gap-2 print-hidden">
            <Button size="sm" variant="outline" onClick={() => window.print()}>
              <Printer /> Print
            </Button>
            <Button size="sm" variant="outline" onClick={onExportCsv} disabled={rows.length === 0}>
              <Download /> Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="hidden text-sm text-muted-foreground print:block">{month}</p>
          <div className="flex flex-wrap items-end gap-4 print-hidden">
            <div className="space-y-1.5">
              <Label htmlFor="billing-month">Month</Label>
              <Input
                id="billing-month"
                type="month"
                className="w-full sm:w-40"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              />
            </div>
            <div className="relative flex-1 space-y-1.5">
              <Label htmlFor="billing-search">Search</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="billing-search"
                  placeholder="Search by name or player ID"
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="billing-status">Status</Label>
              <Select
                id="billing-status"
                className="w-full sm:w-44"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All statuses</option>
                <option value="PENDING">Pending</option>
                <option value="PARTIALLY_PAID">Partially paid</option>
                <option value="PAID">Paid</option>
                <option value="OVERDUE">Overdue</option>
                <option value="WAIVED">Waived</option>
                <option value="CANCELLED">Cancelled</option>
              </Select>
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
              title="No billing for this month yet"
              description="Invoices are created automatically for every active player on the 1st of the month."
            />
          ) : rows.length === 0 ? (
            <EmptyState title="No players match" description="Try a different search or filter." />
          ) : (
            <>
              <div className="flex flex-wrap gap-6 rounded-lg border border-border bg-muted/30 p-4 print-hidden">
                <div>
                  <p className="text-xs text-muted-foreground">Total billed</p>
                  <p className="text-lg font-semibold">{formatCurrency(data.summary.totalBilled)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Collected</p>
                  <p className="text-lg font-semibold">{formatCurrency(data.summary.totalCollected)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Outstanding</p>
                  <p className="text-lg font-semibold">{formatCurrency(data.summary.totalOutstanding)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Invoices</p>
                  <p className="text-lg font-semibold">{data.summary.count}</p>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Player</TableHead>
                    <TableHead>Player ID</TableHead>
                    <TableHead>Fee</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Remaining</TableHead>
                    <TableHead>Due date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, index) => (
                    <TableRow
                      key={row.id}
                      className="cursor-pointer print:cursor-default"
                      onClick={() => navigate(`/receptionist/players/${row.player.id}`)}
                    >
                      <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                      <TableCell className="font-medium">
                        {row.player.firstName} {row.player.lastName}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {row.player.playerCode ?? "—"}
                      </TableCell>
                      <TableCell>{row.feeTypeName}</TableCell>
                      <TableCell className="tabular-nums">{formatCurrency(row.amount)}</TableCell>
                      <TableCell className="tabular-nums">{formatCurrency(row.remaining)}</TableCell>
                      <TableCell>{formatDate(row.dueDate)}</TableCell>
                      <TableCell>
                        <StatusBadge status={row.status} />
                      </TableCell>
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
