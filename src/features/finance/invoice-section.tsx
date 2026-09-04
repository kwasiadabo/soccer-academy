import { formatDate } from "@/lib/date"
import { useState } from "react"
import { Receipt, BellRing } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { StatusBadge } from "@/design-system/status-badge"
import { LoadingState } from "@/design-system/loading-state"
import { EmptyState } from "@/design-system/empty-state"
import { ApiError } from "@/lib/api-client"
import { formatCurrency } from "@/lib/currency"
import {
  useCreatePayment,
  usePlayerInvoices,
  useSendPaymentReminder,
  describeReminderResult,
  amountPaid,
  remainingBalance,
  invoiceDisplayLabel,
  type PaymentMethod,
} from "./finance-api"

function RecordPaymentDialog({
  playerId,
  invoices,
}: {
  playerId: string
  invoices: { id: string; invoiceNumber: string; label: string; remaining: number }[]
}) {
  const createPayment = useCreatePayment(playerId)
  const [open, setOpen] = useState(false)
  const [method, setMethod] = useState<PaymentMethod>("CASH")
  const [reference, setReference] = useState("")
  const [amounts, setAmounts] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [successReceipt, setSuccessReceipt] = useState<string | null>(null)

  const resetForm = () => {
    setAmounts({})
    setReference("")
    setMethod("CASH")
    setServerError(null)
    setSuccessReceipt(null)
  }

  const onOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) resetForm()
  }

  const onMethodChange = (next: PaymentMethod) => {
    setMethod(next)
    setReference("")
  }

  const onSubmit = async () => {
    setServerError(null)
    const allocations = Object.entries(amounts)
      .filter(([, amount]) => Number(amount) > 0)
      .map(([invoiceId, amount]) => ({ invoiceId, amount: Number(amount) }))
    if (allocations.length === 0) {
      setServerError("Enter an amount for at least one invoice")
      return
    }
    try {
      const result = await createPayment.mutateAsync({ method, reference: reference || undefined, allocations })
      setSuccessReceipt(result.receiptNumber)
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : "Could not record payment.")
    }
  }

  // Once a payment succeeds, the invoice list refetches and can go empty (fully paid) —
  // don't let that unmount the dialog mid-success-view; only hide the trigger when closed.
  if (invoices.length === 0 && !open) return null

  const referenceMissing = method === "MOBILE_MONEY" && !reference.trim()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Receipt /> Record payment
        </Button>
      </DialogTrigger>
      <DialogContent>
        {successReceipt ? (
          <>
            <DialogHeader>
              <DialogTitle>Payment recorded</DialogTitle>
              <DialogDescription>Receipt {successReceipt} — a copy has been sent to the guardian.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Record payment</DialogTitle>
              <DialogDescription>Enter an amount for each invoice being paid. Partial amounts are allowed.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Payment method</Label>
                <Select value={method} onChange={(e) => onMethodChange(e.target.value as PaymentMethod)}>
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
                  <p className="text-xs text-muted-foreground">
                    This is the proof that money actually moved — a receipt can't be issued without it.
                  </p>
                </div>
              ) : method !== "CASH" ? (
                <div className="space-y-1.5">
                  <Label>Receipt / reference (optional)</Label>
                  <Input value={reference} onChange={(e) => setReference(e.target.value)} />
                </div>
              ) : null}
              {invoices.map((invoice) => (
                <div key={invoice.id} className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{invoice.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {invoice.invoiceNumber} · Remaining: {formatCurrency(invoice.remaining)}
                    </p>
                  </div>
                  <Input
                    type="number"
                    min={0}
                    max={invoice.remaining}
                    step="0.01"
                    className="w-28"
                    placeholder="0.00"
                    value={amounts[invoice.id] ?? ""}
                    onChange={(e) => setAmounts((prev) => ({ ...prev, [invoice.id]: e.target.value }))}
                  />
                </div>
              ))}
              {serverError ? <p className="text-sm text-destructive">{serverError}</p> : null}
              <DialogFooter>
                <Button onClick={() => void onSubmit()} disabled={createPayment.isPending || referenceMissing}>
                  {createPayment.isPending ? "Saving…" : "Record payment"}
                </Button>
              </DialogFooter>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function ReminderButton({ playerId, invoiceId }: { playerId: string; invoiceId: string }) {
  const sendReminder = useSendPaymentReminder(playerId)
  const [result, setResult] = useState<string | null>(null)

  const onClick = async () => {
    const res = await sendReminder.mutateAsync(invoiceId)
    setResult(describeReminderResult(res))
  }

  if (result) {
    return <span className="text-xs text-muted-foreground">{result}</span>
  }

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={() => void onClick()}
      disabled={sendReminder.isPending}
      title="Send payment reminder"
      aria-label="Send payment reminder"
    >
      <BellRing />
    </Button>
  )
}

export function InvoiceSection({ playerId }: { playerId: string }) {
  const { data: invoices, isLoading } = usePlayerInvoices(playerId)

  const openInvoices = (invoices ?? [])
    .filter((inv) => inv.status !== "PAID" && inv.status !== "CANCELLED" && inv.status !== "WAIVED")
    .map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      label: invoiceDisplayLabel(inv),
      remaining: remainingBalance(inv),
    }))
    .filter((inv) => inv.remaining > 0.01)

  const totalOwed = openInvoices.reduce((sum, inv) => sum + inv.remaining, 0)

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
        <div>
          <CardTitle className="text-base">Invoices & Payments</CardTitle>
          {totalOwed > 0.01 ? (
            <p className="mt-0.5 text-xs text-muted-foreground">
              Total owed: <span className="font-medium text-destructive">{formatCurrency(totalOwed)}</span>
            </p>
          ) : null}
        </div>
        <RecordPaymentDialog playerId={playerId} invoices={openInvoices} />
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <LoadingState rows={2} />
        ) : !invoices || invoices.length === 0 ? (
          <EmptyState title="No invoices yet" description="Invoices are generated automatically." />
        ) : (
          invoices.map((invoice) => {
            const paid = amountPaid(invoice)
            return (
            <div key={invoice.id} className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium">{invoiceDisplayLabel(invoice)}</p>
                <p className="text-xs text-muted-foreground">
                  {invoice.invoiceNumber} · Due {formatDate(invoice.dueDate)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm">{formatCurrency(Number(invoice.amount))}</p>
                  {paid > 0.009 ? (
                    <p className="text-xs text-muted-foreground">Paid {formatCurrency(paid)}</p>
                  ) : null}
                </div>
                <StatusBadge status={invoice.status} />
                {invoice.status !== "PAID" && invoice.status !== "CANCELLED" && invoice.status !== "WAIVED" ? (
                  <ReminderButton playerId={playerId} invoiceId={invoice.id} />
                ) : null}
              </div>
            </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}
