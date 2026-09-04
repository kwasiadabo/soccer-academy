import { useState } from "react"
import { ArrowLeft, Receipt, Search, Wallet } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { LoadingState } from "@/design-system/loading-state"
import { ApiError } from "@/lib/api-client"
import { calculateAge, formatDate } from "@/lib/date"
import { formatCurrency } from "@/lib/currency"
import { usePlayer, usePlayers, type Player } from "@/features/players/players-api"
import { PlayerPhoto } from "@/features/players/player-photo"
import {
  useCreatePayment,
  usePlayerInvoices,
  remainingBalance,
  type PaymentMethod,
} from "./finance-api"

function monthLabel(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "long", year: "numeric" })
}

function PlayerSearchRow({ player, onSelect }: { player: Player; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
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
  )
}

function PlayerSearchStep({ onSelect }: { onSelect: (playerId: string) => void }) {
  const [search, setSearch] = useState("")
  const { data: players, isLoading } = usePlayers({ status: "ACTIVE", search })

  return (
    <>
      <DialogHeader>
        <DialogTitle>Collect Monthly Subscription</DialogTitle>
        <DialogDescription>Search for a player to see their bio-details and amount owed.</DialogDescription>
      </DialogHeader>
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
      <div className="max-h-96 space-y-2 overflow-y-auto">
        {search.trim().length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Start typing to find a player.</p>
        ) : isLoading ? (
          <LoadingState rows={2} />
        ) : !players || players.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No active players match "{search}".</p>
        ) : (
          players.map((player) => <PlayerSearchRow key={player.id} player={player} onSelect={() => onSelect(player.id)} />)
        )}
      </div>
    </>
  )
}

function BioSummary({ player }: { player: Player }) {
  const primaryGuardian = player.guardians.find((g) => g.isPrimary) ?? player.guardians[0]

  return (
    <div className="flex items-center gap-4 rounded-lg border border-border p-3">
      <PlayerPhoto playerId={player.id} photoDocumentId={player.photoDocumentId} size={64} />
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-medium">
          {player.firstName} {player.lastName}
        </p>
        <p className="text-xs text-muted-foreground">
          {calculateAge(player.dateOfBirth)} yrs · {player.gender} · {player.team?.name ?? "No team"}
        </p>
        <p className="text-xs text-muted-foreground">
          {player.playerCode ?? "No player ID"}
          {primaryGuardian ? ` · ${primaryGuardian.guardian.firstName} ${primaryGuardian.guardian.lastName} (${primaryGuardian.guardian.phone})` : ""}
        </p>
      </div>
    </div>
  )
}

function PaymentStep({ playerId, onBack, onDone }: { playerId: string; onBack: () => void; onDone: () => void }) {
  const { data: player, isLoading: playerLoading } = usePlayer(playerId)
  const { data: invoices, isLoading: invoicesLoading } = usePlayerInvoices(playerId)
  const createPayment = useCreatePayment(playerId)
  const [method, setMethod] = useState<PaymentMethod>("CASH")
  const [reference, setReference] = useState("")
  const [amountReceived, setAmountReceived] = useState("")
  const [serverError, setServerError] = useState<string | null>(null)
  const [successReceipt, setSuccessReceipt] = useState<string | null>(null)

  const subscriptionInvoices = (invoices ?? [])
    .filter(
      (inv) =>
        inv.feeType.category === "MONTHLY_SUBSCRIPTION" &&
        inv.status !== "PAID" &&
        inv.status !== "CANCELLED" &&
        inv.status !== "WAIVED",
    )
    .map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      month: monthLabel(inv.issuedAt),
      issuedAt: inv.issuedAt,
      dueDate: inv.dueDate,
      remaining: remainingBalance(inv),
    }))
    .filter((inv) => inv.remaining > 0.01)
    .sort((a, b) => new Date(a.issuedAt).getTime() - new Date(b.issuedAt).getTime())

  const totalOwed = subscriptionInvoices.reduce((sum, inv) => sum + inv.remaining, 0)
  const referenceMissing = method === "MOBILE_MONEY" && !reference.trim()
  const amountValue = Number(amountReceived)

  // Bulk amount is applied to the oldest owed months first, so partial payments always
  // settle the longest-overdue subscription before touching more recent ones.
  const allocationPreview: { id: string; month: string; amount: number }[] = []
  let unallocated = amountValue > 0 ? amountValue : 0
  for (const invoice of subscriptionInvoices) {
    if (unallocated <= 0.009) break
    const portion = Math.min(unallocated, invoice.remaining)
    allocationPreview.push({ id: invoice.id, month: invoice.month, amount: Math.round(portion * 100) / 100 })
    unallocated -= portion
  }

  const onSubmit = async () => {
    setServerError(null)
    if (!amountReceived || amountValue <= 0) {
      setServerError("Enter the amount received")
      return
    }
    if (amountValue > totalOwed + 0.01) {
      setServerError(`Amount can't exceed the total owed of ${formatCurrency(totalOwed)}`)
      return
    }
    const allocations = allocationPreview.map((row) => ({ invoiceId: row.id, amount: row.amount }))
    try {
      const result = await createPayment.mutateAsync({ method, reference: reference || undefined, allocations })
      setSuccessReceipt(result.receiptNumber)
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : "Could not record payment.")
    }
  }

  if (successReceipt) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>Payment recorded</DialogTitle>
          <DialogDescription>Receipt {successReceipt} — a copy has been sent to the guardian.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={onDone}>Done</Button>
        </DialogFooter>
      </>
    )
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Collect Monthly Subscription</DialogTitle>
        <DialogDescription>Confirm the player's bio-details and amount owed before recording payment.</DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <Button type="button" variant="ghost" size="sm" className="-ml-2" onClick={onBack}>
          <ArrowLeft /> Search another player
        </Button>

        {playerLoading || !player ? (
          <LoadingState rows={2} />
        ) : (
          <BioSummary player={player} />
        )}

        {invoicesLoading ? (
          <LoadingState rows={2} />
        ) : subscriptionInvoices.length === 0 ? (
          <p className="rounded-lg border border-border bg-muted/30 p-4 text-center text-sm text-muted-foreground">
            No monthly subscription is currently owed for this player.
          </p>
        ) : (
          <>
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3">
              <span className="text-sm font-medium">
                {subscriptionInvoices.length} month{subscriptionInvoices.length === 1 ? "" : "s"} owed
              </span>
              <span className="text-base font-semibold">{formatCurrency(totalOwed)}</span>
            </div>

            <div className="space-y-1.5">
              <Label>Payment method</Label>
              <Select
                value={method}
                onChange={(e) => {
                  setMethod(e.target.value as PaymentMethod)
                  setReference("")
                }}
              >
                <option value="CASH">Cash</option>
                <option value="BANK_TRANSFER">Bank transfer</option>
                <option value="MOBILE_MONEY">Mobile money</option>
                <option value="CARD">Card</option>
              </Select>
            </div>
            {method === "MOBILE_MONEY" ? (
              <div className="space-y-1.5">
                <Label>Transaction reference (required)</Label>
                <Input
                  placeholder="From the customer's mobile money confirmation SMS"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                />
              </div>
            ) : method !== "CASH" ? (
              <div className="space-y-1.5">
                <Label>Receipt / reference (optional)</Label>
                <Input value={reference} onChange={(e) => setReference(e.target.value)} />
              </div>
            ) : null}

            <div className="space-y-2">
              <Label>Months owed</Label>
              {subscriptionInvoices.map((invoice) => (
                <div key={invoice.id} className="flex items-center justify-between gap-3 text-sm">
                  <div>
                    <p className="font-medium">{invoice.month}</p>
                    <p className="text-xs text-muted-foreground">
                      {invoice.invoiceNumber} · Due {formatDate(invoice.dueDate)}
                    </p>
                  </div>
                  <span className="text-muted-foreground">{formatCurrency(invoice.remaining)}</span>
                </div>
              ))}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Amount received</Label>
                <button
                  type="button"
                  className="text-xs font-medium text-accent-foreground hover:underline"
                  onClick={() => setAmountReceived(totalOwed.toFixed(2))}
                >
                  Pay in full ({formatCurrency(totalOwed)})
                </button>
              </div>
              <Input
                type="number"
                min={0}
                max={totalOwed}
                step="0.01"
                placeholder="0.00"
                value={amountReceived}
                onChange={(e) => setAmountReceived(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Paid as one bulk amount — applied to the oldest owed months first. Partial amounts are allowed.
              </p>
            </div>

            {allocationPreview.length > 0 ? (
              <div className="space-y-1 rounded-lg border border-border bg-muted/30 p-3 text-xs">
                <p className="mb-1 font-medium text-foreground">This payment will cover:</p>
                {allocationPreview.map((row) => (
                  <div key={row.id} className="flex items-center justify-between text-muted-foreground">
                    <span>{row.month}</span>
                    <span>{formatCurrency(row.amount)}</span>
                  </div>
                ))}
              </div>
            ) : null}

            {serverError ? <p className="text-sm text-destructive">{serverError}</p> : null}
            <DialogFooter>
              <Button onClick={() => void onSubmit()} disabled={createPayment.isPending || referenceMissing}>
                <Receipt /> {createPayment.isPending ? "Saving…" : "Collect payment"}
              </Button>
            </DialogFooter>
          </>
        )}
      </div>
    </>
  )
}

export function CollectSubscriptionPaymentDialog() {
  const [open, setOpen] = useState(false)
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)

  const onOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) setSelectedPlayerId(null)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Wallet /> Collect Subscription Payment
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        {selectedPlayerId ? (
          <PaymentStep
            playerId={selectedPlayerId}
            onBack={() => setSelectedPlayerId(null)}
            onDone={() => onOpenChange(false)}
          />
        ) : (
          <PlayerSearchStep onSelect={setSelectedPlayerId} />
        )}
      </DialogContent>
    </Dialog>
  )
}
