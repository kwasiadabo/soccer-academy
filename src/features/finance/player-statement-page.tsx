import { formatDate } from "@/lib/date"
import { useState } from "react"
import { Printer, Search } from "lucide-react"

import { DashboardLayout } from "@/app/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { LoadingState } from "@/design-system/loading-state"
import { formatCurrency } from "@/lib/currency"
import { calculateAge } from "@/lib/date"
import { usePlayers, type Player } from "@/features/players/players-api"
import { PlayerPhoto } from "@/features/players/player-photo"
import { RECEPTIONIST_NAV_ITEMS } from "@/features/dashboard-receptionist/receptionist-dashboard"
import { usePlayerInvoices, usePlayerPayments } from "./finance-api"

function startOfMonth(): string {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

interface LedgerRow {
  key: string
  date: string
  type: "Invoice" | "Payment"
  description: string
  reference: string
  debit: number
  credit: number
}

function PlayerPicker({ onSelect }: { onSelect: (player: Player) => void }) {
  const [search, setSearch] = useState("")
  const { data: players, isLoading } = usePlayers({ search })

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name or player ID"
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />
      </div>
      <div className="space-y-2">
        {search.trim().length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Search for a player to view their statement of account.</p>
        ) : isLoading ? (
          <LoadingState rows={2} />
        ) : !players || players.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No players match "{search}".</p>
        ) : (
          players.map((player) => (
            <button
              key={player.id}
              type="button"
              onClick={() => onSelect(player)}
              className="flex w-full items-center gap-3 rounded-lg border border-border p-3 text-left transition-colors hover:border-primary/30 hover:bg-muted/40"
            >
              <PlayerPhoto playerId={player.id} photoDocumentId={player.photoDocumentId} size={40} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  {player.firstName} {player.lastName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {calculateAge(player.dateOfBirth)} yrs · {player.team?.name ?? "No team"}
                  {player.playerCode ? ` · ${player.playerCode}` : ""}
                </p>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}

function StatementView({ player, onChangePlayer }: { player: Player; onChangePlayer: () => void }) {
  const [from, setFrom] = useState(startOfMonth())
  const [to, setTo] = useState(today())
  const { data: invoices, isLoading: invoicesLoading } = usePlayerInvoices(player.id)
  const { data: payments, isLoading: paymentsLoading } = usePlayerPayments(player.id)

  const isLoading = invoicesLoading || paymentsLoading

  const allRows: LedgerRow[] = [
    ...(invoices ?? []).map((inv) => ({
      key: `inv-${inv.id}`,
      date: inv.issuedAt,
      type: "Invoice" as const,
      description: inv.description ?? inv.feeType.name,
      reference: inv.invoiceNumber,
      debit: Number(inv.amount) - Number(inv.discountAmount),
      credit: 0,
    })),
    ...(payments?.rows ?? []).map((p) => ({
      key: `pay-${p.paymentId}-${p.invoiceId}`,
      date: p.paidAt,
      type: "Payment" as const,
      description: p.feeTypeName,
      reference: p.receiptNumber,
      debit: 0,
      credit: p.amount,
    })),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  const fromTime = from ? new Date(from).getTime() : -Infinity
  const toTime = to ? new Date(`${to}T23:59:59.999`).getTime() : Infinity

  const openingBalance = allRows
    .filter((r) => new Date(r.date).getTime() < fromTime)
    .reduce((sum, r) => sum + r.debit - r.credit, 0)

  const inRangeRows = allRows.filter((r) => {
    const t = new Date(r.date).getTime()
    return t >= fromTime && t <= toTime
  })

  let running = openingBalance
  const rowsWithBalance = inRangeRows.map((row) => {
    running += row.debit - row.credit
    return { ...row, balance: running }
  })
  const closingBalance = running

  return (
    <Card className="print-area">
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <PlayerPhoto playerId={player.id} photoDocumentId={player.photoDocumentId} size={44} />
          <div>
            <CardTitle>
              {player.firstName} {player.lastName}
            </CardTitle>
            <CardDescription>
              {player.playerCode ?? "No player ID"} · {player.team?.name ?? "No team"}
            </CardDescription>
          </div>
        </div>
        <div className="flex gap-2 print-hidden">
          <Button size="sm" variant="outline" onClick={onChangePlayer}>
            Change player
          </Button>
          <Button size="sm" variant="outline" onClick={() => window.print()}>
            <Printer /> Print
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap items-end gap-4 print-hidden">
          <div className="space-y-1.5">
            <Label htmlFor="stmt-from">From</Label>
            <Input id="stmt-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="stmt-to">To</Label>
            <Input id="stmt-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
        <p className="hidden text-sm text-muted-foreground print:block">
          Statement for {from || "Start"} to {to || "Today"}
        </p>

        <div className="flex flex-wrap gap-6 rounded-lg border border-border bg-muted/30 p-4">
          <div>
            <p className="text-xs text-muted-foreground">Opening balance</p>
            <p className="text-lg font-semibold">{formatCurrency(openingBalance)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Billed in range</p>
            <p className="text-lg font-semibold">{formatCurrency(inRangeRows.reduce((s, r) => s + r.debit, 0))}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Paid in range</p>
            <p className="text-lg font-semibold">{formatCurrency(inRangeRows.reduce((s, r) => s + r.credit, 0))}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Closing balance</p>
            <p className={`text-lg font-semibold ${closingBalance > 0.01 ? "text-destructive" : ""}`}>
              {formatCurrency(closingBalance)}
            </p>
          </div>
        </div>

        {isLoading ? (
          <LoadingState rows={4} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Invoice (debit)</TableHead>
                <TableHead>Payment (credit)</TableHead>
                <TableHead>Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground">
                  Opening balance
                </TableCell>
                <TableCell className="font-medium tabular-nums">{formatCurrency(openingBalance)}</TableCell>
              </TableRow>
              {rowsWithBalance.map((row) => (
                <TableRow key={row.key}>
                  <TableCell>{formatDate(row.date)}</TableCell>
                  <TableCell>{row.description}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{row.reference}</TableCell>
                  <TableCell className="tabular-nums">{row.debit > 0 ? formatCurrency(row.debit) : "—"}</TableCell>
                  <TableCell className="tabular-nums">{row.credit > 0 ? formatCurrency(row.credit) : "—"}</TableCell>
                  <TableCell className="font-medium tabular-nums">{formatCurrency(row.balance)}</TableCell>
                </TableRow>
              ))}
              {rowsWithBalance.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No invoices or payments in this range.
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

export function PlayerStatementPage() {
  const [player, setPlayer] = useState<Player | null>(null)

  return (
    <DashboardLayout title="Player Statement" navItems={RECEPTIONIST_NAV_ITEMS}>
      {player ? (
        <StatementView player={player} onChangePlayer={() => setPlayer(null)} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Player Statement</CardTitle>
            <CardDescription>Search for a player to view their statement of account.</CardDescription>
          </CardHeader>
          <CardContent>
            <PlayerPicker onSelect={setPlayer} />
          </CardContent>
        </Card>
      )}
    </DashboardLayout>
  )
}
