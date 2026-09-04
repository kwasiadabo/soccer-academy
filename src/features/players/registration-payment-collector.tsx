import { useState } from "react"
import { Printer, Receipt } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { AcademyLogo } from "@/design-system/academy-logo"
import { usePlayerInvoices } from "@/features/finance/finance-api"
import { ApiError } from "@/lib/api-client"
import { formatCurrency } from "@/lib/currency"
import { formatDate, formatTime } from "@/lib/date"
import { useConfirmRegistrationPayment, type MomoProvider, type RegistrationPayment } from "./players-api"

type PaymentMethod = "CASH" | "MOBILE_MONEY"

const MOMO_PROVIDER_LABELS: Record<MomoProvider, string> = {
  mtn: "MTN",
  vod: "Vodafone/Telecel",
  tgo: "AirtelTigo",
}

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: "Cash",
  MOBILE_MONEY: "Mobile money",
}

interface ReceiptLine {
  label: string
  amount: number
}

// Shared by the new-registration wizard's Payment step and the player profile's
// Financial tab — both need the exact same "collect the registration fee" UI.
export function RegistrationPaymentCollector({
  playerId,
  playerName,
  onPaymentRecorded,
}: {
  playerId: string
  playerName: string
  onPaymentRecorded?: () => void
}) {
  const [method, setMethod] = useState<PaymentMethod>("CASH")
  const [phone, setPhone] = useState("")
  const [provider, setProvider] = useState<MomoProvider>("mtn")
  const [error, setError] = useState<string | null>(null)
  const [receipt, setReceipt] = useState<{ payment: RegistrationPayment; lines: ReceiptLine[] } | null>(null)

  const { data: invoices } = usePlayerInvoices(playerId)
  const dueInvoice = invoices?.find((inv) => inv.status === "PENDING" || inv.status === "PARTIALLY_PAID")
  const breakdownItems = dueInvoice?.feeType.items ?? []
  // Sum the fee items actually shown in the breakdown below, rather than trusting the
  // invoice's stored `amount` on its own — keeps "Amount due" always consistent with
  // what's itemized on screen instead of two independently-computed numbers.
  const itemsTotal =
    breakdownItems.length > 0
      ? breakdownItems.reduce((sum, link) => sum + Number(link.feeItem.defaultAmount), 0)
      : Number(dueInvoice?.amount ?? 0)
  const allocated = dueInvoice?.allocations.reduce((sum, a) => sum + Number(a.amount), 0) ?? 0
  const amountDue = dueInvoice ? itemsTotal - Number(dueInvoice.discountAmount) - allocated : null

  const confirmPayment = useConfirmRegistrationPayment(playerId)

  const phoneMissing = method === "MOBILE_MONEY" && !phone.trim()

  const onRecordPayment = async () => {
    setError(null)
    const lines: ReceiptLine[] =
      breakdownItems.length > 0
        ? breakdownItems.map((link) => ({ label: link.feeItem.name, amount: Number(link.feeItem.defaultAmount) }))
        : [{ label: dueInvoice?.feeType.name ?? "Registration fee", amount: amountDue ?? 0 }]
    try {
      const result = await confirmPayment.mutateAsync({
        method,
        reference: method === "MOBILE_MONEY" ? `${MOMO_PROVIDER_LABELS[provider]} · ${phone.trim()}` : undefined,
      })
      setReceipt({ payment: result.payment, lines })
      onPaymentRecorded?.()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not record the payment.")
    }
  }

  if (receipt) {
    return <PaymentReceipt playerName={playerName} payment={receipt.payment} lines={receipt.lines} />
  }

  return (
    <div className="space-y-4">
      {dueInvoice ? (
        <div className="rounded-lg border border-border p-3">
          <ul className="space-y-1">
            {breakdownItems.length > 0 ? (
              breakdownItems.map((link) => (
                <li key={link.feeItemId} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{link.feeItem.name}</span>
                  <span>{formatCurrency(Number(link.feeItem.defaultAmount))}</span>
                </li>
              ))
            ) : (
              <li className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{dueInvoice.feeType.name}</span>
                <span>{formatCurrency(amountDue ?? 0)}</span>
              </li>
            )}
          </ul>
          <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-sm">
            <span className="font-medium">Amount due</span>
            <span className="font-semibold">{formatCurrency(amountDue ?? 0)}</span>
          </div>
        </div>
      ) : null}

      <div className="space-y-3 rounded-lg border border-border p-4">
        <div className="space-y-1.5">
          <Label htmlFor="payment-method">Payment method</Label>
          <Select
            id="payment-method"
            value={method}
            onChange={(e) => setMethod(e.target.value as PaymentMethod)}
            className="w-full sm:w-48"
          >
            <option value="CASH">Cash</option>
            <option value="MOBILE_MONEY">Mobile money</option>
          </Select>
        </div>

        {method === "MOBILE_MONEY" ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="momo-phone">Mobile money number</Label>
              <Input
                id="momo-phone"
                placeholder="e.g. 0244123456"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="momo-provider">Telecom company</Label>
              <Select
                id="momo-provider"
                value={provider}
                onChange={(e) => setProvider(e.target.value as MomoProvider)}
              >
                <option value="mtn">MTN</option>
                <option value="vod">Vodafone/Telecel</option>
                <option value="tgo">AirtelTigo</option>
              </Select>
            </div>
          </div>
        ) : null}

        <div className="space-y-1.5">
          <Label htmlFor="payment-amount">Amount paying</Label>
          <Input id="payment-amount" value={formatCurrency(amountDue ?? 0)} readOnly disabled className="w-40" />
        </div>

        <Button disabled={confirmPayment.isPending || phoneMissing || !dueInvoice} onClick={() => void onRecordPayment()}>
          <Receipt /> {confirmPayment.isPending ? "Recording…" : "Record payment"}
        </Button>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>
    </div>
  )
}

function PaymentReceipt({
  playerName,
  payment,
  lines,
}: {
  playerName: string
  payment: RegistrationPayment
  lines: ReceiptLine[]
}) {
  const total = lines.reduce((sum, line) => sum + line.amount, 0)

  return (
    <div className="print-area space-y-4 rounded-lg border border-border p-5">
      <div className="flex items-center justify-between print-hidden">
        <p className="text-sm font-medium text-success">Payment recorded</p>
        <Button size="sm" variant="outline" onClick={() => window.print()}>
          <Printer /> Print receipt
        </Button>
      </div>

      <div className="flex items-center gap-3 border-b border-border pb-4">
        <AcademyLogo className="size-10" />
        <div>
          <p className="text-sm font-semibold">Kapikids Soccer Academy</p>
          <p className="text-xs text-muted-foreground">Payment Receipt</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <span className="text-muted-foreground">Receipt No.</span>
        <span className="text-right font-medium">{payment.receiptNumber}</span>
        <span className="text-muted-foreground">Player</span>
        <span className="text-right font-medium">{playerName}</span>
        <span className="text-muted-foreground">Date</span>
        <span className="text-right font-medium">
          {formatDate(payment.paidAt)} · {formatTime(payment.paidAt)}
        </span>
        <span className="text-muted-foreground">Method</span>
        <span className="text-right font-medium">
          {PAYMENT_METHOD_LABELS[payment.method]}
          {payment.reference ? ` (${payment.reference})` : ""}
        </span>
      </div>

      <ul className="space-y-1 border-t border-border pt-3">
        {lines.map((line) => (
          <li key={line.label} className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{line.label}</span>
            <span>{formatCurrency(line.amount)}</span>
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
        <span className="font-medium">Total paid</span>
        <span className="font-semibold">{formatCurrency(total)}</span>
      </div>

      <p className="text-center text-xs text-muted-foreground">Thank you for your payment.</p>
    </div>
  )
}
