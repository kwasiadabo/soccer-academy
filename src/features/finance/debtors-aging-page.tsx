import { formatDate } from "@/lib/date"
import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { AlertTriangle, Download, Printer, Search, X } from "lucide-react"

import { DashboardLayout } from "@/app/dashboard-layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { EmptyState } from "@/design-system/empty-state"
import { LoadingState } from "@/design-system/loading-state"
import { ErrorState } from "@/design-system/error-state"
import { RECEPTIONIST_NAV_ITEMS } from "@/features/dashboard-receptionist/receptionist-dashboard"
import { downloadCsv, toCsv } from "@/lib/csv"
import { formatCurrency } from "@/lib/currency"
import { useDebtorsAging, type DebtorAgingRow } from "./finance-api"

export function DebtorsAgingPage() {
  const navigate = useNavigate()
  const [minMonths, setMinMonths] = useState("1")
  const parsedMinMonths = Math.max(0, Number(minMonths) || 0)
  const { data, isLoading, isError, refetch } = useDebtorsAging(parsedMinMonths)
  const [search, setSearch] = useState("")

  const hasActiveFilters = search.trim() !== ""
  const clearFilters = () => setSearch("")

  const filteredData = useMemo(() => {
    if (!data) return data
    const query = search.trim().toLowerCase()
    if (query === "") return data
    return data.filter(
      (row) =>
        `${row.player.firstName} ${row.player.lastName}`.toLowerCase().includes(query) ||
        (row.player.playerCode ?? "").toLowerCase().includes(query),
    )
  }, [data, search])

  const onExportCsv = () => {
    if (!data || data.length === 0) return
    const csv = toCsv<DebtorAgingRow>(data, [
      { key: "player", label: "Player", value: (r) => `${r.player.firstName} ${r.player.lastName}` },
      { key: "monthsOwing", label: "Months owing", value: (r) => r.monthsOwing },
      { key: "oldestDueDate", label: "Oldest due date", value: (r) => formatDate(r.oldestDueDate) },
      { key: "totalOwed", label: "Total owed (GHS)", value: (r) => r.totalOwed.toFixed(2) },
      {
        key: "invoices",
        label: "Outstanding invoices",
        value: (r) => r.invoices.map((inv) => `${inv.feeTypeName}: ${formatCurrency(inv.remaining)}`).join("; "),
      },
    ])
    downloadCsv(`debtors-aging_${parsedMinMonths}-months.csv`, csv)
  }

  return (
    <DashboardLayout title="Owing Report" navItems={RECEPTIONIST_NAV_ITEMS}>
      <Card className="print-area">
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Players Owing Over N Months</CardTitle>
            <CardDescription>Players whose oldest unpaid invoice has been due for more than the given number of months</CardDescription>
          </div>
          <div className="flex gap-2 print-hidden">
            <Button size="sm" variant="outline" onClick={() => window.print()}>
              <Printer /> Print
            </Button>
            <Button size="sm" variant="outline" onClick={onExportCsv} disabled={!data || data.length === 0}>
              <Download /> Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="hidden text-sm text-muted-foreground print:block">Owing more than {parsedMinMonths} month(s)</p>
          <div className="flex flex-wrap items-end gap-4 print-hidden">
            <div className="space-y-1.5">
              <Label htmlFor="min-months">Owing more than (months)</Label>
              <Input
                id="min-months"
                type="number"
                min={0}
                step="1"
                className="w-full sm:w-40"
                value={minMonths}
                onChange={(e) => setMinMonths(e.target.value)}
              />
            </div>
            <div className="relative flex-1 space-y-1.5 sm:max-w-xs">
              <Label htmlFor="debtors-aging-search">Search</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="debtors-aging-search"
                  placeholder="Search by name or player ID"
                  className="pl-8"
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
            <LoadingState rows={3} />
          ) : isError ? (
            <ErrorState onRetry={() => void refetch()} />
          ) : !data || data.length === 0 ? (
            <EmptyState
              title="No players match"
              description={`No player owes for more than ${parsedMinMonths} month(s).`}
            />
          ) : !filteredData || filteredData.length === 0 ? (
            <EmptyState title="No matching players" description="Try adjusting your search." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Player</TableHead>
                  <TableHead>Months owing</TableHead>
                  <TableHead>Outstanding invoices</TableHead>
                  <TableHead>Oldest due date</TableHead>
                  <TableHead>Total owed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData!.map((row, index) => (
                  <TableRow
                    key={row.player.id}
                    className="cursor-pointer print:cursor-default"
                    onClick={() => navigate(`/receptionist/players/${row.player.id}`)}
                  >
                    <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                    <TableCell className="font-medium">
                      {row.player.firstName} {row.player.lastName}
                    </TableCell>
                    <TableCell>
                      <Badge variant={row.monthsOwing >= 3 ? "destructive" : "outline"}>
                        {row.monthsOwing >= 3 ? <AlertTriangle className="size-3" /> : null}
                        {row.monthsOwing} {row.monthsOwing === 1 ? "month" : "months"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {row.invoices.map((inv) => (
                          <span key={inv.id} className="rounded-full border border-border px-2 py-0.5 text-xs">
                            {inv.feeTypeName}: {formatCurrency(inv.remaining)}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(row.oldestDueDate)}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(row.totalOwed)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  )
}
