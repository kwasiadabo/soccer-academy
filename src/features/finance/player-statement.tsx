import { formatDate } from "@/lib/date"
import { Printer } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { EmptyState } from "@/design-system/empty-state"
import { LoadingState } from "@/design-system/loading-state"
import { formatCurrency } from "@/lib/currency"
import { usePlayerInvoices, usePlayerPayments } from "./finance-api"

interface LedgerRow {
  key: string
  date: string
  description: string
  reference: string
  debit: number
  credit: number
}

export function PlayerStatement({
  playerId,
  playerName,
  playerCode,
}: {
  playerId: string
  playerName: string
  playerCode: string | null
}) {
  const { data: invoices, isLoading: invoicesLoading } = usePlayerInvoices(playerId)
  const { data: payments, isLoading: paymentsLoading } = usePlayerPayments(playerId)
  const isLoading = invoicesLoading || paymentsLoading

  const totalBilled = (invoices ?? []).reduce((sum, inv) => sum + Number(inv.amount) - Number(inv.discountAmount), 0)
  const totalPaid = payments?.summary.totalAmount ?? 0
  const balance = totalBilled - totalPaid

  const currentYear = new Date().getFullYear()
  const yearStart = new Date(currentYear, 0, 1).getTime()

  const rows: LedgerRow[] = [
    ...(invoices ?? []).map((inv) => ({
      key: `inv-${inv.id}`,
      date: inv.issuedAt,
      description: inv.description ?? inv.feeType.name,
      reference: inv.invoiceNumber,
      debit: Number(inv.amount) - Number(inv.discountAmount),
      credit: 0,
    })),
    ...(payments?.rows ?? []).map((p) => ({
      key: `pay-${p.paymentId}-${p.invoiceId}`,
      date: p.paidAt,
      description: p.feeTypeName,
      reference: p.receiptNumber,
      debit: 0,
      credit: p.amount,
    })),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  // Activity from before the current calendar year is rolled up into a single
  // "balance brought forward" figure — only the current year is itemized below.
  const priorRows = rows.filter((row) => new Date(row.date).getTime() < yearStart)
  const currentYearRows = rows.filter((row) => new Date(row.date).getTime() >= yearStart)
  const broughtForward = priorRows.reduce((sum, row) => sum + row.debit - row.credit, 0)
  const billedThisYear = currentYearRows.reduce((sum, row) => sum + row.debit, 0)
  const paidThisYear = currentYearRows.reduce((sum, row) => sum + row.credit, 0)

  let running = broughtForward
  const rowsWithBalance = currentYearRows.map((row) => {
    running += row.debit - row.credit
    return { ...row, balance: running }
  })

  return (
    <Card className="print-area">
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
        <div>
          <CardTitle>Statement of Account</CardTitle>
          <CardDescription>
            {playerName}
            {playerCode ? ` · ${playerCode}` : ""} · Generated {formatDate(new Date())}
          </CardDescription>
          <p className="mt-1 text-xs text-muted-foreground">
            Showing {currentYear} activity only — invoices and payments from before {currentYear} are carried
            forward as a single opening balance.
          </p>
        </div>
        <Button size="sm" variant="outline" className="print-hidden" onClick={() => window.print()}>
          <Printer /> Print
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap gap-6 rounded-lg border border-border bg-muted/30 p-4">
          <div>
            <p className="text-xs text-muted-foreground">Balance brought forward</p>
            <p className="text-lg font-semibold">{formatCurrency(broughtForward)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Billed in {currentYear}</p>
            <p className="text-lg font-semibold">{formatCurrency(billedThisYear)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Paid in {currentYear}</p>
            <p className="text-lg font-semibold">{formatCurrency(paidThisYear)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Balance due</p>
            <p className={`text-lg font-semibold ${balance > 0.01 ? "text-destructive" : ""}`}>
              {formatCurrency(Math.max(balance, 0))}
            </p>
          </div>
        </div>

        {isLoading ? (
          <LoadingState rows={4} />
        ) : rows.length === 0 ? (
          <EmptyState title="No activity yet" description="Invoices and payments for this player will appear here." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Invoice (debit)</TableHead>
                <TableHead>Payment (credit)</TableHead>
                <TableHead>Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {priorRows.length > 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground">
                    Balance brought forward (activity before {currentYear})
                  </TableCell>
                  <TableCell className="font-medium tabular-nums">{formatCurrency(broughtForward)}</TableCell>
                </TableRow>
              ) : null}
              {rowsWithBalance.map((row, index) => (
                <TableRow key={row.key}>
                  <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                  <TableCell>{formatDate(row.date)}</TableCell>
                  <TableCell>{row.description}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{row.reference}</TableCell>
                  <TableCell className="tabular-nums">{row.debit > 0 ? formatCurrency(row.debit) : "—"}</TableCell>
                  <TableCell className="tabular-nums">{row.credit > 0 ? formatCurrency(row.credit) : "—"}</TableCell>
                  <TableCell className="font-medium tabular-nums">{formatCurrency(row.balance)}</TableCell>
                </TableRow>
              ))}
              {rowsWithBalance.length === 0 && priorRows.length > 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No activity in {currentYear} yet.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
