import { useState } from "react"
import { Receipt } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { ApiError } from "@/lib/api-client"
import { formatCurrency } from "@/lib/currency"
import { useCreatePayment, type PaymentMethod } from "@/features/finance/finance-api"
import type { ShopOrder } from "./merchandise-api"

export type MerchandiseInvoice = NonNullable<ShopOrder["invoice"]>

export function remainingOnInvoice(invoice: MerchandiseInvoice): number {
  const allocated = invoice.allocations.reduce((sum, a) => sum + Number(a.amount), 0)
  return Number(invoice.amount) - Number(invoice.discountAmount) - allocated
}

// A merchandise order's payment is always a single allocation against its one
// linked invoice — deliberately separate from the generic multi-invoice
// RecordPaymentDialog (player Financial tab) and the subscription-only
// CollectSubscriptionPaymentDialog, so staff record it right where they're
// already managing orders instead of hunting through the player's ledger.
export function RecordMerchandisePaymentDialog({
  playerId,
  invoice,
  trigger,
}: {
  playerId: string
  invoice: MerchandiseInvoice
  trigger?: React.ReactNode
}) {
  const createPayment = useCreatePayment(playerId)
  const remaining = remainingOnInvoice(invoice)
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState("")
  const [method, setMethod] = useState<PaymentMethod>("CASH")
  const [reference, setReference] = useState("")
  const [serverError, setServerError] = useState<string | null>(null)
  const [successReceipt, setSuccessReceipt] = useState<string | null>(null)

  const onOpenChange = (next: boolean) => {
    setOpen(next)
    if (next) {
      setAmount(remaining.toFixed(2))
    } else {
      setAmount("")
      setReference("")
      setMethod("CASH")
      setServerError(null)
      setSuccessReceipt(null)
    }
  }

  const referenceMissing = method === "MOBILE_MONEY" && !reference.trim()

  const onSubmit = async () => {
    setServerError(null)
    const value = Number(amount)
    if (!value || value <= 0 || value > remaining + 0.01) {
      setServerError(`Enter an amount up to ${formatCurrency(remaining)}`)
      return
    }
    try {
      const result = await createPayment.mutateAsync({
        method,
        reference: reference || undefined,
        allocations: [{ invoiceId: invoice.id, amount: value }],
      })
      setSuccessReceipt(result.receiptNumber)
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : "Could not record payment.")
    }
  }

  if (remaining <= 0.01 && !open) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm">
            <Receipt /> Record merchandise payment
          </Button>
        )}
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
              <DialogTitle>Record merchandise payment</DialogTitle>
              <DialogDescription>
                {invoice.description ?? invoice.invoiceNumber} · Remaining {formatCurrency(remaining)}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="merch-amount">Amount</Label>
                <Input
                  id="merch-amount"
                  type="number"
                  min={0}
                  max={remaining}
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="merch-method">Payment method</Label>
                <Select id="merch-method" value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
                  <option value="CASH">Cash</option>
                  <option value="BANK_TRANSFER">Bank transfer</option>
                  <option value="MOBILE_MONEY">Mobile money</option>
                  <option value="CARD">Card</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="merch-reference">
                  {method === "MOBILE_MONEY" ? "Transaction reference (required)" : "Receipt / reference (optional)"}
                </Label>
                <Input id="merch-reference" value={reference} onChange={(e) => setReference(e.target.value)} />
              </div>
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
