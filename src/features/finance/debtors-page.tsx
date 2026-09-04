import { formatDate } from "@/lib/date"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { AlertTriangle, BellRing, Search } from "lucide-react"
import { ROLE_NAMES } from "@soccer-academy/shared-types"

import { DashboardLayout } from "@/app/dashboard-layout"
import { useAuth } from "@/app/auth-context"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { EmptyState } from "@/design-system/empty-state"
import { LoadingState } from "@/design-system/loading-state"
import { ErrorState } from "@/design-system/error-state"
import { useStaffNavItems } from "@/features/issues/staff-issues-page"
import { cn } from "@/lib/utils"
import { api } from "@/lib/api-client"
import { formatCurrency } from "@/lib/currency"
import { CollectSubscriptionPaymentDialog } from "./collect-subscription-payment-dialog"
import { describeReminderResult, useDebtors, type DebtorRow, type ReminderResult } from "./finance-api"

const QUICK_FILTERS = [
  { value: "all", label: "All" },
  { value: "overdue", label: "Overdue only" },
] as const

type QuickFilter = (typeof QUICK_FILTERS)[number]["value"]

async function remindDebtor(row: DebtorRow): Promise<ReminderResult> {
  const results = await Promise.all(
    row.invoices.map((inv) =>
      api.post<ReminderResult>(`/finance/invoices/${inv.id}/remind`, { playerId: row.player.id }),
    ),
  )
  return {
    delivered: results.some((r) => r.delivered),
    channels: {
      inApp: results.some((r) => r.channels.inApp),
      sms: results.some((r) => r.channels.sms),
      email: results.some((r) => r.channels.email),
    },
  }
}

function RemindRowButton({ row }: { row: DebtorRow }) {
  const [status, setStatus] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const onClick = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setPending(true)
    try {
      const result = await remindDebtor(row)
      setStatus(describeReminderResult(result))
    } finally {
      setPending(false)
    }
  }

  if (status) {
    return <span className="text-xs text-muted-foreground">{status}</span>
  }

  return (
    <Button variant="outline" size="sm" onClick={(e) => void onClick(e)} disabled={pending}>
      <BellRing /> {pending ? "Sending…" : "Remind"}
    </Button>
  )
}

function BulkReminderDialog({ rows }: { rows: DebtorRow[] }) {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [result, setResult] = useState<{ players: number; sms: number; email: number; inApp: number; notDelivered: number } | null>(
    null,
  )

  const onOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) setResult(null)
  }

  const onSend = async () => {
    setPending(true)
    try {
      const perPlayer = await Promise.all(rows.map(remindDebtor))
      setResult({
        players: rows.length,
        sms: perPlayer.filter((r) => r.channels.sms).length,
        email: perPlayer.filter((r) => r.channels.email).length,
        inApp: perPlayer.filter((r) => r.channels.inApp).length,
        notDelivered: perPlayer.filter((r) => !r.delivered).length,
      })
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)} disabled={rows.length === 0}>
        <BellRing /> Send Bulk Reminders
      </Button>
      <DialogContent>
        {result ? (
          <>
            <DialogHeader>
              <DialogTitle>Reminders sent</DialogTitle>
              <DialogDescription>
                {result.players} debtor{result.players === 1 ? "" : "s"} — {result.sms} by SMS, {result.email} by
                email, {result.inApp} in-app
                {result.notDelivered > 0 ? `, ${result.notDelivered} not reachable (no phone/email/portal)` : ""}.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Send bulk reminders?</DialogTitle>
              <DialogDescription>
                This sends a payment reminder for every outstanding invoice to all {rows.length} debtor
                {rows.length === 1 ? "" : "s"} currently shown below.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
                Cancel
              </Button>
              <Button onClick={() => void onSend()} disabled={pending}>
                {pending ? "Sending…" : "Send reminders"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

export function DebtorsPage() {
  const navigate = useNavigate()
  const { hasRole } = useAuth()
  const navItems = useStaffNavItems()
  const { data, isLoading, isError, refetch } = useDebtors()
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<QuickFilter>("all")

  // Head Coach has read-only finance access (FINANCE_VIEW, not FINANCE_MANAGE) — hide
  // actions that record payments or send reminders, which the backend would reject.
  const canManageFinance = hasRole(ROLE_NAMES.RECEPTIONIST) || hasRole(ROLE_NAMES.ADMIN)

  const goToPlayer = (playerId: string) => {
    if (canManageFinance) {
      navigate(`/receptionist/players/${playerId}`)
    } else {
      navigate(`/head-coach/players/${playerId}/ratings`)
    }
  }

  const filteredData = (data ?? [])
    .filter((row) => {
      const q = search.trim().toLowerCase()
      if (!q) return true
      return (
        `${row.player.firstName} ${row.player.lastName}`.toLowerCase().includes(q) ||
        (row.player.playerCode ?? "").toLowerCase().includes(q)
      )
    })
    .filter((row) => (filter === "overdue" ? row.hasOverdue : true))

  return (
    <DashboardLayout title="Payments & Debtors" navItems={navItems}>
      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Debtors</CardTitle>
            <CardDescription>Players with outstanding balances, highest first</CardDescription>
          </div>
          {canManageFinance ? (
            <div className="flex items-center gap-2">
              <BulkReminderDialog rows={filteredData} />
              <CollectSubscriptionPaymentDialog />
            </div>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-4">
          {data && data.length > 0 ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name or player ID"
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {QUICK_FILTERS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFilter(option.value)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                      filter === option.value
                        ? "border-primary bg-primary/15 text-accent-foreground"
                        : "border-border text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {isLoading ? (
            <LoadingState rows={3} />
          ) : isError ? (
            <ErrorState onRetry={() => void refetch()} />
          ) : !data || data.length === 0 ? (
            <EmptyState title="No outstanding balances" description="Every player is paid up." />
          ) : filteredData.length === 0 ? (
            <EmptyState title="No debtors match" description="Try a different search or filter." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Player</TableHead>
                  <TableHead>Outstanding invoices</TableHead>
                  <TableHead>Oldest due date</TableHead>
                  <TableHead>Total owed</TableHead>
                  {canManageFinance ? <TableHead /> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((row, index) => (
                  <TableRow
                    key={row.player.id}
                    className="cursor-pointer"
                    onClick={() => goToPlayer(row.player.id)}
                  >
                    <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                    <TableCell className="font-medium">
                      {row.player.firstName} {row.player.lastName}
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
                    <TableCell>
                      {formatDate(row.invoices[0]?.dueDate)}
                      {row.hasOverdue ? (
                        <Badge variant="destructive" className="ml-2">
                          <AlertTriangle className="size-3" /> Overdue
                        </Badge>
                      ) : null}
                    </TableCell>
                    <TableCell className="font-medium">{formatCurrency(row.totalOwed)}</TableCell>
                    {canManageFinance ? (
                      <TableCell>
                        <RemindRowButton row={row} />
                      </TableCell>
                    ) : null}
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
