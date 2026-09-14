import { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useSearchParams } from "react-router-dom"
import { AlertTriangle, Boxes, CreditCard, ExternalLink, Pencil, Plus, Save, Search, X } from "lucide-react"

import { DashboardLayout } from "@/app/dashboard-layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { EmptyState } from "@/design-system/empty-state"
import { LoadingState } from "@/design-system/loading-state"
import { ErrorState } from "@/design-system/error-state"
import { ApiError } from "@/lib/api-client"
import { formatCurrency } from "@/lib/currency"
import { formatDate } from "@/lib/date"
import {
  useAddFeeTypeItem,
  useAllFeeItems,
  useAllFeeTypes,
  useCreateFeeType,
  useFeeTypes,
  useRemoveFeeTypeItem,
  useUpdateFeeType,
  type FeeItem,
  type FeeType,
} from "@/features/finance/finance-api"
import { useInitializePayment, useSubscriptionStatus, useVerifyPayment } from "./billing-api"

function InvoiceStatusBadge({ status }: { status: string }) {
  if (status === "PAID") return <Badge variant="success">Paid</Badge>
  if (status === "FAILED") return <Badge variant="destructive">Failed</Badge>
  return <Badge variant="secondary">Pending</Badge>
}

// ---------- What THIS academy charges ITS OWN players (Fees) ----------
// Its own business decision — set here on Billing, not on the SAMS-side
// subscription section below. Deliberately separate: that section is what
// this academy pays SAMS, a fixed platform-wide rate the system admin sets.

const feeTypeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  isRecurring: z.boolean(),
})
type FeeTypeFormValues = z.infer<typeof feeTypeSchema>

// Creating a fee picks from the fee items you've already captured on the Fee
// Items page, rather than typing a new name — the fee is named after
// whichever item you pick, and its amount is set here, attaching that item
// in one step (the same composition the Items dialog manages afterward for
// anything more than one item).
const createFeeTypeSchema = z.object({
  feeItemId: z.string().min(1, "Select a fee item"),
  description: z.string().optional(),
  isRecurring: z.boolean(),
  isRegistrationFee: z.boolean(),
  amount: z.string().min(1, "Amount is required"),
})
type CreateFeeTypeFormValues = z.infer<typeof createFeeTypeSchema>

function CreateFeeTypeDialog({ feeItems }: { feeItems: FeeItem[] }) {
  const [open, setOpen] = useState(false)
  const createFeeType = useCreateFeeType()
  const addFeeTypeItem = useAddFeeTypeItem()
  const activeFeeItems = feeItems.filter((item) => item.isActive)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateFeeTypeFormValues>({
    resolver: zodResolver(createFeeTypeSchema),
    defaultValues: { isRecurring: false, isRegistrationFee: false },
  })

  const onSubmit = async (values: CreateFeeTypeFormValues) => {
    const feeItem = activeFeeItems.find((item) => item.id === values.feeItemId)
    if (!feeItem) return
    const feeType = await createFeeType.mutateAsync({
      name: feeItem.name,
      description: values.description || undefined,
      isRecurring: values.isRecurring,
      isRegistrationFee: values.isRegistrationFee,
    })
    await addFeeTypeItem.mutateAsync({ feeTypeId: feeType.id, feeItemId: feeItem.id, amount: Number(values.amount) })
    reset({ isRecurring: false, isRegistrationFee: false, feeItemId: "", description: "", amount: "" })
    setOpen(false)
  }

  const isPending = isSubmitting || createFeeType.isPending || addFeeTypeItem.isPending

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" disabled={activeFeeItems.length === 0}>
          <Plus /> New fee
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a fee</DialogTitle>
          <DialogDescription>
            The fee is named after the item you pick. Add more items (or change this one's amount) afterward from
            the Items button.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="fee-item">Fee item</Label>
            <Select id="fee-item" {...register("feeItemId")}>
              <option value="">Select a fee item…</option>
              {activeFeeItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
            {errors.feeItemId ? <p className="text-xs text-destructive">{errors.feeItemId.message}</p> : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fee-amount">Amount (GHS)</Label>
            <Input id="fee-amount" type="number" min={0} step="0.01" {...register("amount")} />
            {errors.amount ? <p className="text-xs text-destructive">{errors.amount.message}</p> : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fee-description">Description (optional)</Label>
            <Textarea id="fee-description" rows={2} placeholder="e.g. for returning players" {...register("description")} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...register("isRecurring")} />
            Bill automatically every month
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...register("isRegistrationFee")} />
            This is the registration fee (only one can be active at a time)
          </label>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Creating…" : "Create fee"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// The amount is only directly editable here when the fee has exactly one
// item — with zero or several, which item's amount "the" fee amount means is
// ambiguous, so those cases point at the Items dialog instead.
const editFeeTypeSchema = feeTypeSchema.extend({
  amount: z.string().optional(),
})
type EditFeeTypeFormValues = z.infer<typeof editFeeTypeSchema>

function EditFeeTypeDialog({ feeType }: { feeType: FeeType }) {
  const [open, setOpen] = useState(false)
  const updateFeeType = useUpdateFeeType(feeType.id)
  const addFeeTypeItem = useAddFeeTypeItem()
  const singleItem = feeType.items.length === 1 ? feeType.items[0] : null
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EditFeeTypeFormValues>({
    resolver: zodResolver(editFeeTypeSchema),
    defaultValues: {
      name: feeType.name,
      description: feeType.description ?? "",
      isRecurring: feeType.isRecurring,
      amount: singleItem?.amount ?? "",
    },
  })

  const onSubmit = async (values: EditFeeTypeFormValues) => {
    await updateFeeType.mutateAsync({
      name: values.name,
      description: values.description || undefined,
      isRecurring: values.isRecurring,
    })
    if (singleItem && values.amount !== undefined && values.amount !== "") {
      const amount = Number(values.amount)
      if (Number.isFinite(amount) && amount >= 0) {
        await addFeeTypeItem.mutateAsync({ feeTypeId: feeType.id, feeItemId: singleItem.feeItemId, amount })
      }
    }
    setOpen(false)
  }

  const isPending = isSubmitting || updateFeeType.isPending || addFeeTypeItem.isPending

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) {
          reset({
            name: feeType.name,
            description: feeType.description ?? "",
            isRecurring: feeType.isRecurring,
            amount: singleItem?.amount ?? "",
          })
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size="icon-sm" variant="ghost" aria-label="Edit fee">
          <Pencil />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit fee</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="edit-fee-name">Name</Label>
            <Input id="edit-fee-name" {...register("name")} />
            {errors.name ? <p className="text-xs text-destructive">{errors.name.message}</p> : null}
          </div>
          {singleItem ? (
            <div className="space-y-1.5">
              <Label htmlFor="edit-fee-amount">Amount (GHS)</Label>
              <Input id="edit-fee-amount" type="number" min={0} step="0.01" {...register("amount")} />
              <p className="text-xs text-muted-foreground">Last set {formatDate(singleItem.updatedAt)}</p>
            </div>
          ) : (
            <p className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
              {feeType.items.length === 0
                ? "This fee has no items yet — attach one from the Items button to set its amount."
                : "This fee has multiple items — manage each one's amount from the Items button."}
            </p>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="edit-fee-description">Description (optional)</Label>
            <Textarea id="edit-fee-description" rows={2} {...register("description")} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...register("isRecurring")} />
            Bill automatically every month
          </label>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// A fee item has no price of its own — the amount is set here, per Fee it's
// attached to, since the same item (e.g. "Jersey") can be worth a different
// amount on a different Fee. Re-saving the amount for an already-attached
// item reuses the same "add" call — the backend upserts on (feeType, feeItem).
function AttachedFeeItemRow({
  feeTypeId,
  link,
}: {
  feeTypeId: string
  link: { feeItemId: string; amount: string; updatedAt: string; feeItem: FeeItem }
}) {
  const addItem = useAddFeeTypeItem()
  const removeItem = useRemoveFeeTypeItem()
  const [amount, setAmount] = useState(link.amount)
  const [saved, setSaved] = useState(false)

  const onSave = () => {
    const value = Number(amount)
    if (!Number.isFinite(value) || value < 0) return
    addItem.mutate(
      { feeTypeId, feeItemId: link.feeItemId, amount: value },
      {
        onSuccess: () => {
          setSaved(true)
          setTimeout(() => setSaved(false), 2000)
        },
      },
    )
  }

  return (
    <li className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
      <div>
        <p className="text-sm font-medium">{link.feeItem.name}</p>
        <p className="text-xs text-muted-foreground">Set {formatDate(link.updatedAt)}</p>
      </div>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          min={0}
          step="0.01"
          className="w-28"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          aria-label={`Amount for ${link.feeItem.name}`}
        />
        <Button size="sm" variant="outline" disabled={addItem.isPending} onClick={onSave}>
          {addItem.isPending ? "Saving…" : saved ? "Saved" : "Save"}
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label={`Remove ${link.feeItem.name}`}
          disabled={removeItem.isPending}
          onClick={() => removeItem.mutate({ feeTypeId, feeItemId: link.feeItemId })}
        >
          <X />
        </Button>
      </div>
    </li>
  )
}

function ManageFeeTypeItemsDialog({ feeType, feeItems }: { feeType: FeeType; feeItems: FeeItem[] }) {
  const [open, setOpen] = useState(false)
  const [selectedId, setSelectedId] = useState("")
  const [newAmount, setNewAmount] = useState("")
  const addItem = useAddFeeTypeItem()

  const attachedIds = new Set(feeType.items.map((link) => link.feeItemId))
  const candidates = feeItems.filter((item) => item.isActive && !attachedIds.has(item.id))

  const onAdd = () => {
    const amount = Number(newAmount)
    if (!selectedId || !Number.isFinite(amount) || amount < 0) return
    addItem.mutate(
      { feeTypeId: feeType.id, feeItemId: selectedId, amount },
      {
        onSuccess: () => {
          setSelectedId("")
          setNewAmount("")
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Boxes /> Items ({feeType.items.length})
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{feeType.name} — items</DialogTitle>
          <DialogDescription>
            {feeType.name}'s amount is the sum of the items below ({formatCurrency(Number(feeType.defaultAmount))}
            {" "}total).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {feeType.items.length > 0 ? (
            <ul className="space-y-2">
              {feeType.items.map((link) => (
                <AttachedFeeItemRow key={link.feeItemId} feeTypeId={feeType.id} link={link} />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No items attached yet — this fee charges nothing until you add one.</p>
          )}

          <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
            <Select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} className="flex-1">
              <option value="">Add an existing fee item…</option>
              {candidates.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
            <Input
              type="number"
              min={0}
              step="0.01"
              placeholder="Amount"
              className="w-28"
              value={newAmount}
              onChange={(e) => setNewAmount(e.target.value)}
              disabled={!selectedId}
            />
            <Button
              size="sm"
              variant="outline"
              disabled={!selectedId || newAmount.trim() === "" || addItem.isPending}
              onClick={onAdd}
            >
              <Plus /> {addItem.isPending ? "Adding…" : "Add"}
            </Button>
          </div>
          {candidates.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No more fee items available — create one in Fee Items first.
            </p>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function FeeTypeRow({ feeType, feeItems, index }: { feeType: FeeType; feeItems: FeeItem[]; index: number }) {
  const updateFeeType = useUpdateFeeType(feeType.id)

  return (
    <TableRow>
      <TableCell className="text-muted-foreground">{index + 1}</TableCell>
      <TableCell className="font-medium">
        {feeType.name}
        {feeType.description ? (
          <p className="text-xs font-normal text-muted-foreground">{feeType.description}</p>
        ) : null}
      </TableCell>
      <TableCell>{formatCurrency(Number(feeType.defaultAmount))}</TableCell>
      <TableCell>{feeType.isRecurring ? "Monthly" : "—"}</TableCell>
      <TableCell>
        <Badge variant={feeType.isActive ? "success" : "secondary"}>
          {feeType.isActive ? "Active" : "Inactive"}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1">
          <ManageFeeTypeItemsDialog feeType={feeType} feeItems={feeItems} />
          <EditFeeTypeDialog feeType={feeType} />
          <Button
            size="sm"
            variant="outline"
            disabled={updateFeeType.isPending}
            onClick={() => updateFeeType.mutate({ isActive: !feeType.isActive })}
          >
            {updateFeeType.isPending ? "Saving…" : feeType.isActive ? "Deactivate" : "Activate"}
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}

function FeeTypesSection() {
  const { data, isLoading, isError, refetch } = useAllFeeTypes()
  const { data: feeItems } = useAllFeeItems()
  const { data: activeFeeTypes } = useFeeTypes()
  const { data: subscription } = useSubscriptionStatus()
  const [search, setSearch] = useState("")

  const hasMultipleRegistrationFees = (data?.filter((f) => f.isRegistrationFee).length ?? 0) > 1

  // The academy's own expected take from its players — active player count
  // (same headcount SAMS bills against above) times the sum of every active
  // recurring fee's rate, never SAMS's rate.
  const recurringFeeTypes = activeFeeTypes?.filter((ft) => ft.isRecurring) ?? []
  const activePlayerCount = subscription?.activePlayerCount
  const monthlyRate =
    recurringFeeTypes.length > 0 ? recurringFeeTypes.reduce((sum, ft) => sum + Number(ft.defaultAmount), 0) : null
  const expectedMonthlyCollection =
    activePlayerCount != null && monthlyRate != null ? activePlayerCount * monthlyRate : null

  const hasActiveFilters = search.trim() !== ""
  const clearFilters = () => {
    setSearch("")
  }

  const filteredData = useMemo(() => {
    if (!data) return data
    const query = search.trim().toLowerCase()
    if (query === "") return data
    return data.filter((feeType) => feeType.name.toLowerCase().includes(query))
  }, [data, search])

  return (
    <div>
      <h2 className="text-sm font-semibold">What you charge your players</h2>
      <p className="mt-1 mb-3 text-sm text-muted-foreground">
        Registration, monthly subscription, levies and more — set by you, not SAMS, and unrelated to the
        subscription above.
      </p>

      {expectedMonthlyCollection != null ? (
        <Card className="mb-4 max-w-sm">
          <CardHeader>
            <CardDescription>Expected monthly collection</CardDescription>
            <CardTitle className="text-lg tabular-nums">{formatCurrency(expectedMonthlyCollection)}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {activePlayerCount} active players × {formatCurrency(monthlyRate as number)}
            {recurringFeeTypes.length > 1 ? ` (${recurringFeeTypes.length} recurring fees combined)` : ""} — your
            rate, not SAMS's
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Fees</CardTitle>
            <CardDescription>Each fee is made up of one or more fee items you define</CardDescription>
          </div>
          <CreateFeeTypeDialog feeItems={feeItems ?? []} />
        </CardHeader>
        <CardContent className="space-y-4">
          {(feeItems ?? []).filter((item) => item.isActive).length === 0 ? (
            <p className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
              Create at least one fee item in Fee Items before you can set up a fee.
            </p>
          ) : null}
          {hasMultipleRegistrationFees ? (
            <p className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
              Only one Registration fee is used when a player is moved to payment — activating one automatically
              deactivates the others.
            </p>
          ) : null}

          {data && data.length > 0 ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative flex-1 sm:max-w-xs">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name…"
                  className="pl-8"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              {hasActiveFilters ? (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X /> Clear
                </Button>
              ) : null}
            </div>
          ) : null}

          {isLoading ? (
            <LoadingState rows={3} />
          ) : isError ? (
            <ErrorState onRetry={() => void refetch()} />
          ) : !data || data.length === 0 ? (
            <EmptyState title="No fees yet" description="Create one above to start invoicing players." />
          ) : !filteredData || filteredData.length === 0 ? (
            <EmptyState title="No matching fees" description="Try adjusting your search or filters." />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Recurring</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((feeType, index) => (
                    <FeeTypeRow key={feeType.id} feeType={feeType} feeItems={feeItems ?? []} index={index} />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export function BillingPage() {
  const { data: subscription, isLoading, isError, refetch } = useSubscriptionStatus()
  const initializePayment = useInitializePayment()
  const verifyPayment = useVerifyPayment()
  const [searchParams, setSearchParams] = useSearchParams()
  const [verifyMessage, setVerifyMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const reference = searchParams.get("reference")

  useEffect(() => {
    if (!reference) return
    verifyPayment
      .mutateAsync(reference)
      .then(() => setVerifyMessage({ ok: true, text: "Payment received — your subscription is up to date." }))
      .catch((err) =>
        setVerifyMessage({ ok: false, text: err instanceof ApiError ? err.message : "Could not confirm that payment." }),
      )
      .finally(() => {
        searchParams.delete("reference")
        searchParams.delete("trxref")
        setSearchParams(searchParams, { replace: true })
      })
    // Only ever run once per redirect back from Paystack.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reference])

  const onPay = async () => {
    const callbackUrl = window.location.href.split("?")[0]
    const result = await initializePayment.mutateAsync(callbackUrl)
    window.location.href = result.authorizationUrl
  }

  return (
    <DashboardLayout title="Billing">
      <div className="space-y-8">
        {verifyMessage ? (
          <div
            className={`rounded-xl border p-4 text-sm ${
              verifyMessage.ok
                ? "border-success/30 bg-success/10 text-success"
                : "border-destructive/30 bg-destructive/10 text-destructive"
            }`}
          >
            {verifyMessage.text}
          </div>
        ) : null}

        <FeeTypesSection />

        <div className="space-y-6 border-t border-border pt-8">
          <div>
            <h2 className="text-sm font-semibold">Your SAMS subscription</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              What this academy pays SAMS to use the platform — GHS per active player, set platform-wide by SAMS.
            </p>
          </div>

          {isLoading ? (
            <LoadingState rows={3} />
          ) : isError || !subscription ? (
            <ErrorState onRetry={() => void refetch()} />
          ) : (
            <>
              {subscription.status === "PAST_DUE" ? (
                <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4">
                  <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden />
                  <div>
                    <p className="text-sm font-semibold text-destructive">Subscription payment overdue</p>
                    <p className="mt-1 text-sm text-destructive/90">
                      Every account at this academy is blocked until payment is made. Pay now to restore access immediately.
                    </p>
                  </div>
                </div>
              ) : subscription.daysRemaining <= 5 ? (
                <div className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/10 p-4">
                  <AlertTriangle className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden />
                  <div>
                    <p className="text-sm font-semibold text-warning">
                      Renews in {subscription.daysRemaining} day{subscription.daysRemaining === 1 ? "" : "s"}
                    </p>
                    <p className="mt-1 text-sm text-warning/90">
                      Make sure a payment method is on file — if it lapses, every account here gets blocked until paid.
                    </p>
                  </div>
                </div>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardDescription>Status</CardDescription>
                    <CardTitle className="text-lg">
                      {subscription.status === "ACTIVE" ? (
                        <Badge variant="success">Active</Badge>
                      ) : (
                        <Badge variant="destructive">Past due</Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    Renews {formatDate(subscription.currentPeriodEnd)}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardDescription>Next amount you owe SAMS</CardDescription>
                    <CardTitle className="text-lg tabular-nums">{formatCurrency(subscription.estimatedNextAmount)}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    {subscription.hasPaymentMethod
                      ? `Charged automatically to ${subscription.cardType ?? "card"} •••• ${subscription.cardLast4 ?? "----"}`
                      : "No payment method on file yet"}
                  </CardContent>
                </Card>
              </div>

              <div>
                <Button onClick={() => void onPay()} disabled={initializePayment.isPending}>
                  <CreditCard className="size-4" aria-hidden />
                  {subscription.hasPaymentMethod ? "Update payment method" : "Add payment method & pay"}
                  <ExternalLink className="size-4" aria-hidden />
                </Button>
                {initializePayment.isError ? (
                  <p className="mt-2 text-sm text-destructive">Could not start checkout. Please try again.</p>
                ) : null}
              </div>

              <div>
                <h3 className="mb-3 text-sm font-semibold">SAMS invoice history</h3>
                {subscription.invoices.length === 0 ? (
                  <EmptyState title="No invoices yet" description="Your first invoice appears at the end of this billing period." />
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Period</TableHead>
                          <TableHead className="text-right">Players</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Paid</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {subscription.invoices.map((invoice) => (
                          <TableRow key={invoice.id}>
                            <TableCell className="text-sm">
                              {formatDate(invoice.periodStart)} – {formatDate(invoice.periodEnd)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">{invoice.activePlayerCount}</TableCell>
                            <TableCell className="text-right tabular-nums">{formatCurrency(invoice.amount)}</TableCell>
                            <TableCell>
                              <InvoiceStatusBadge status={invoice.status} />
                            </TableCell>
                            <TableCell className="text-right text-sm text-muted-foreground">
                              {invoice.paidAt ? formatDate(invoice.paidAt) : "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
