import { formatDate } from "@/lib/date"
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
import { RECEPTIONIST_NAV_ITEMS } from "@/features/dashboard-receptionist/receptionist-dashboard"
import { downloadCsv, toCsv } from "@/lib/csv"
import { formatCurrency } from "@/lib/currency"
import { useFeeTypes, usePaymentsReport, type PaymentReportRow } from "./finance-api"

const METHOD_LABEL: Record<string, string> = {
  CASH: "Cash",
  BANK_TRANSFER: "Bank transfer",
  MOBILE_MONEY: "Mobile money",
  CARD: "Card",
  ONLINE_GATEWAY: "Online gateway",
  OTHER: "Other",
}

function startOfMonth(): string {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export function PaymentsReportPage() {
  const [from, setFrom] = useState(startOfMonth())
  const [to, setTo] = useState(today())
  const [feeTypeId, setFeeTypeId] = useState("")
  const [search, setSearch] = useState("")

  const { data: feeTypes } = useFeeTypes()
  const { data, isLoading, isError, refetch } = usePaymentsReport({
    from: from || undefined,
    to: to || undefined,
    feeTypeId: feeTypeId || undefined,
  })

  const hasActiveFilters = search.trim() !== ""
  const clearFilters = () => setSearch("")

  const filteredRows = useMemo(() => {
    if (!data) return data?.rows
    const query = search.trim().toLowerCase()
    if (query === "") return data.rows
    return data.rows.filter(
      (row) =>
        `${row.player.firstName} ${row.player.lastName}`.toLowerCase().includes(query) ||
        row.receiptNumber.toLowerCase().includes(query) ||
        row.invoiceNumber.toLowerCase().includes(query),
    )
  }, [data, search])

  const onExportCsv = () => {
    if (!data || data.rows.length === 0) return
    const csv = toCsv<PaymentReportRow>(data.rows, [
      { key: "paidAt", label: "Date", value: (r) => formatDate(r.paidAt) },
      { key: "receiptNumber", label: "Receipt #", value: (r) => r.receiptNumber },
      { key: "player", label: "Player", value: (r) => `${r.player.firstName} ${r.player.lastName}` },
      { key: "feeTypeName", label: "Fee type", value: (r) => r.feeTypeName },
      { key: "invoiceNumber", label: "Invoice #", value: (r) => r.invoiceNumber },
      { key: "method", label: "Method", value: (r) => METHOD_LABEL[r.method] ?? r.method },
      { key: "amount", label: "Amount (GHS)", value: (r) => r.amount.toFixed(2) },
    ])
    downloadCsv(`payments-report_${from || "all"}_${to || "all"}.csv`, csv)
  }

  return (
    <DashboardLayout title="Payments Report" navItems={RECEPTIONIST_NAV_ITEMS}>
      <Card className="print-area">
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Payments Report</CardTitle>
            <CardDescription>All completed payments for a date range, optionally filtered by fee type</CardDescription>
          </div>
          <div className="flex gap-2 print-hidden">
            <Button size="sm" variant="outline" onClick={() => window.print()}>
              <Printer /> Print
            </Button>
            <Button size="sm" variant="outline" onClick={onExportCsv} disabled={!data || data.rows.length === 0}>
              <Download /> Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="hidden text-sm text-muted-foreground print:block">
            {from || "Start"} to {to || "Today"}
            {feeTypeId ? ` · ${feeTypes?.find((f) => f.id === feeTypeId)?.name ?? ""}` : ""}
          </p>
          <div className="flex flex-wrap items-end gap-4 print-hidden">
            <div className="space-y-1.5">
              <Label htmlFor="report-from">From</Label>
              <Input id="report-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="report-to">To</Label>
              <Input id="report-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="report-fee-type">Fee type</Label>
              <Select id="report-fee-type" value={feeTypeId} onChange={(e) => setFeeTypeId(e.target.value)}>
                <option value="">All fee types</option>
                {feeTypes?.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
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
                  placeholder="Search by player, receipt #, or invoice #"
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
            <EmptyState title="No payments found" description="No completed payments match this date range and filter." />
          ) : !filteredRows || filteredRows.length === 0 ? (
            <EmptyState title="No matching payments" description="Try a different search." />
          ) : (
            <>
              <div className="flex flex-wrap gap-6 rounded-lg border border-border bg-muted/30 p-4">
                <div>
                  <p className="text-xs text-muted-foreground">Total collected</p>
                  <p className="text-lg font-semibold">{formatCurrency(data.summary.totalAmount)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Payments</p>
                  <p className="text-lg font-semibold">{data.summary.count}</p>
                </div>
                {data.summary.byFeeType.map((f) => (
                  <div key={f.feeTypeId}>
                    <p className="text-xs text-muted-foreground">{f.feeTypeName}</p>
                    <p className="text-lg font-semibold">{formatCurrency(f.total)}</p>
                  </div>
                ))}
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Receipt #</TableHead>
                    <TableHead>Player</TableHead>
                    <TableHead>Fee type</TableHead>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.map((row, index) => (
                    <TableRow key={`${row.paymentId}-${row.invoiceId}`}>
                      <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                      <TableCell>{formatDate(row.paidAt)}</TableCell>
                      <TableCell className="font-mono text-xs">{row.receiptNumber}</TableCell>
                      <TableCell className="font-medium">
                        {row.player.firstName} {row.player.lastName}
                      </TableCell>
                      <TableCell>{row.feeTypeName}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{row.invoiceNumber}</TableCell>
                      <TableCell>{METHOD_LABEL[row.method] ?? row.method}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(row.amount)}</TableCell>
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
