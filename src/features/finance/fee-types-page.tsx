import { useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Boxes, Pencil, Plus, Search, X } from "lucide-react"

import { DashboardLayout } from "@/app/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
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
import { RECEPTIONIST_NAV_ITEMS } from "@/features/dashboard-receptionist/receptionist-dashboard"
import { formatCurrency } from "@/lib/currency"
import {
  useAddFeeTypeItem,
  useAllFeeItems,
  useAllFeeTypes,
  useCreateFeeItem,
  useCreateFeeType,
  useRemoveFeeTypeItem,
  useUpdateFeeItem,
  useUpdateFeeType,
  type FeeCategory,
  type FeeItem,
  type FeeType,
} from "./finance-api"

const CATEGORY_LABEL: Record<FeeCategory, string> = {
  REGISTRATION: "Registration",
  MONTHLY_SUBSCRIPTION: "Monthly Subscription",
  LEVY: "Levy",
  TOURNAMENT: "Tournament",
  UNIFORM_EQUIPMENT: "Uniform / Equipment",
  SPECIAL_ACTIVITY: "Special Activity",
  DONATION: "Donation",
  OTHER: "Other",
}

// ---------- Fee Items (raw catalog) ----------

const feeItemSchema = z.object({
  name: z.string().min(1, "Name is required"),
  defaultAmount: z.string().min(1, "Amount is required"),
  description: z.string().optional(),
})
type FeeItemFormValues = z.infer<typeof feeItemSchema>

function CreateFeeItemDialog() {
  const [open, setOpen] = useState(false)
  const createFeeItem = useCreateFeeItem()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FeeItemFormValues>({ resolver: zodResolver(feeItemSchema) })

  const onSubmit = async (values: FeeItemFormValues) => {
    await createFeeItem.mutateAsync({
      name: values.name,
      defaultAmount: Number(values.defaultAmount),
      description: values.description || undefined,
    })
    reset({ name: "", defaultAmount: "", description: "" })
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus /> New fee item
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create fee item</DialogTitle>
          <DialogDescription>
            A single priced building block (e.g. jersey, training kit, admin processing). Attach it to a Fee
            below to make it chargeable.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="item-name">Name</Label>
            <Input id="item-name" placeholder="Jersey" {...register("name")} />
            {errors.name ? <p className="text-xs text-destructive">{errors.name.message}</p> : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="item-amount">Amount (GHS)</Label>
            <Input id="item-amount" type="number" min={0} step="0.01" {...register("defaultAmount")} />
            {errors.defaultAmount ? (
              <p className="text-xs text-destructive">{errors.defaultAmount.message}</p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="item-description">Description (optional)</Label>
            <Textarea id="item-description" rows={2} {...register("description")} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating…" : "Create fee item"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function EditFeeItemDialog({ feeItem }: { feeItem: FeeItem }) {
  const [open, setOpen] = useState(false)
  const updateFeeItem = useUpdateFeeItem(feeItem.id)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FeeItemFormValues>({
    resolver: zodResolver(feeItemSchema),
    defaultValues: {
      name: feeItem.name,
      defaultAmount: feeItem.defaultAmount,
      description: feeItem.description ?? "",
    },
  })

  const onSubmit = async (values: FeeItemFormValues) => {
    await updateFeeItem.mutateAsync({
      name: values.name,
      defaultAmount: Number(values.defaultAmount),
      description: values.description || undefined,
    })
    setOpen(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) {
          reset({ name: feeItem.name, defaultAmount: feeItem.defaultAmount, description: feeItem.description ?? "" })
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size="icon-sm" variant="ghost" aria-label="Edit fee item">
          <Pencil />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit fee item</DialogTitle>
          <DialogDescription>Changing the amount updates every Fee this item is attached to.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="edit-item-name">Name</Label>
            <Input id="edit-item-name" {...register("name")} />
            {errors.name ? <p className="text-xs text-destructive">{errors.name.message}</p> : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-item-amount">Amount (GHS)</Label>
            <Input id="edit-item-amount" type="number" min={0} step="0.01" {...register("defaultAmount")} />
            {errors.defaultAmount ? (
              <p className="text-xs text-destructive">{errors.defaultAmount.message}</p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-item-description">Description (optional)</Label>
            <Textarea id="edit-item-description" rows={2} {...register("description")} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function FeeItemRow({ feeItem, index }: { feeItem: FeeItem; index: number }) {
  const updateFeeItem = useUpdateFeeItem(feeItem.id)

  return (
    <TableRow>
      <TableCell className="text-muted-foreground">{index + 1}</TableCell>
      <TableCell className="font-medium">
        {feeItem.name}
        {feeItem.description ? (
          <p className="text-xs font-normal text-muted-foreground">{feeItem.description}</p>
        ) : null}
      </TableCell>
      <TableCell>{formatCurrency(Number(feeItem.defaultAmount))}</TableCell>
      <TableCell>
        <Badge variant={feeItem.isActive ? "success" : "secondary"}>{feeItem.isActive ? "Active" : "Inactive"}</Badge>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1">
          <EditFeeItemDialog feeItem={feeItem} />
          <Button
            size="sm"
            variant="outline"
            disabled={updateFeeItem.isPending}
            onClick={() => updateFeeItem.mutate({ isActive: !feeItem.isActive })}
          >
            {updateFeeItem.isPending ? "Saving…" : feeItem.isActive ? "Deactivate" : "Activate"}
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}

function FeeItemsCard() {
  const { data, isLoading, isError, refetch } = useAllFeeItems()
  const [search, setSearch] = useState("")

  const hasActiveFilters = search.trim() !== ""
  const clearFilters = () => setSearch("")

  const filteredData = useMemo(() => {
    if (!data) return data
    const query = search.trim().toLowerCase()
    if (query === "") return data
    return data.filter((feeItem) => feeItem.name.toLowerCase().includes(query))
  }, [data, search])

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
        <div>
          <CardTitle>Fee Items</CardTitle>
          <CardDescription>The priced building blocks — set these up first, then compose Fees from them below</CardDescription>
        </div>
        <CreateFeeItemDialog />
      </CardHeader>
      <CardContent>
        {data && data.length > 0 ? (
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
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
          <EmptyState
            title="No fee items yet"
            description="Create your first one (e.g. jersey, training kit, admin processing) before setting up the Registration fee or any other fee."
          />
        ) : !filteredData || filteredData.length === 0 ? (
          <EmptyState title="No matching fee items" description="Try a different search." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((feeItem, index) => (
                <FeeItemRow key={feeItem.id} feeItem={feeItem} index={index} />
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

// ---------- Fees (composed of Fee Items) ----------

const feeTypeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: z.enum([
    "REGISTRATION",
    "MONTHLY_SUBSCRIPTION",
    "LEVY",
    "TOURNAMENT",
    "UNIFORM_EQUIPMENT",
    "SPECIAL_ACTIVITY",
    "DONATION",
    "OTHER",
  ]),
  description: z.string().optional(),
  isRecurring: z.boolean(),
})
type FeeTypeFormValues = z.infer<typeof feeTypeSchema>

function CreateFeeTypeDialog({ disabled }: { disabled: boolean }) {
  const [open, setOpen] = useState(false)
  const createFeeType = useCreateFeeType()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FeeTypeFormValues>({
    resolver: zodResolver(feeTypeSchema),
    defaultValues: { category: "REGISTRATION", isRecurring: false },
  })

  const onSubmit = async (values: FeeTypeFormValues) => {
    await createFeeType.mutateAsync({
      name: values.name,
      category: values.category,
      description: values.description || undefined,
      isRecurring: values.isRecurring,
    })
    reset({ category: values.category, isRecurring: false, name: "", description: "" })
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" disabled={disabled}>
          <Plus /> New fee
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a fee</DialogTitle>
          <DialogDescription>
            Its amount comes from the fee items you attach to it afterward — nothing is charged until at least
            one item is attached. Creating a new active Registration fee automatically deactivates any other one.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="fee-name">Name</Label>
            <Input id="fee-name" placeholder="Standard Registration" {...register("name")} />
            {errors.name ? <p className="text-xs text-destructive">{errors.name.message}</p> : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fee-category">Category</Label>
            <Select id="fee-category" {...register("category")}>
              {Object.entries(CATEGORY_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fee-description">Description (optional)</Label>
            <Textarea id="fee-description" rows={2} placeholder="e.g. for returning players" {...register("description")} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...register("isRecurring")} />
            Bill automatically every month
          </label>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating…" : "Create fee"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function EditFeeTypeDialog({ feeType }: { feeType: FeeType }) {
  const [open, setOpen] = useState(false)
  const updateFeeType = useUpdateFeeType(feeType.id)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FeeTypeFormValues>({
    resolver: zodResolver(feeTypeSchema),
    defaultValues: {
      name: feeType.name,
      category: feeType.category,
      description: feeType.description ?? "",
      isRecurring: feeType.isRecurring,
    },
  })

  const onSubmit = async (values: FeeTypeFormValues) => {
    await updateFeeType.mutateAsync({
      name: values.name,
      description: values.description || undefined,
      isRecurring: values.isRecurring,
    })
    setOpen(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) {
          reset({
            name: feeType.name,
            category: feeType.category,
            description: feeType.description ?? "",
            isRecurring: feeType.isRecurring,
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
          <DialogDescription>Category can't be changed after creation — create a new fee instead.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="edit-fee-name">Name</Label>
            <Input id="edit-fee-name" {...register("name")} />
            {errors.name ? <p className="text-xs text-destructive">{errors.name.message}</p> : null}
          </div>
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Input value={CATEGORY_LABEL[feeType.category]} disabled />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-fee-description">Description (optional)</Label>
            <Textarea id="edit-fee-description" rows={2} {...register("description")} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...register("isRecurring")} />
            Bill automatically every month
          </label>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ManageFeeTypeItemsDialog({ feeType, feeItems }: { feeType: FeeType; feeItems: FeeItem[] }) {
  const [open, setOpen] = useState(false)
  const [selectedId, setSelectedId] = useState("")
  const addItem = useAddFeeTypeItem()
  const removeItem = useRemoveFeeTypeItem()

  const attachedIds = new Set(feeType.items.map((link) => link.feeItemId))
  const candidates = feeItems.filter((item) => item.isActive && !attachedIds.has(item.id))

  const onAdd = () => {
    if (!selectedId) return
    addItem.mutate({ feeTypeId: feeType.id, feeItemId: selectedId }, { onSuccess: () => setSelectedId("") })
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
                <li
                  key={link.feeItemId}
                  className="flex items-center justify-between rounded-lg border border-border p-3"
                >
                  <p className="text-sm font-medium">{link.feeItem.name}</p>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">{formatCurrency(Number(link.feeItem.defaultAmount))}</span>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label={`Remove ${link.feeItem.name}`}
                      disabled={removeItem.isPending}
                      onClick={() => removeItem.mutate({ feeTypeId: feeType.id, feeItemId: link.feeItemId })}
                    >
                      <X />
                    </Button>
                  </div>
                </li>
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
                  {item.name} ({formatCurrency(Number(item.defaultAmount))})
                </option>
              ))}
            </Select>
            <Button size="sm" variant="outline" disabled={!selectedId || addItem.isPending} onClick={onAdd}>
              <Plus /> {addItem.isPending ? "Adding…" : "Add"}
            </Button>
          </div>
          {candidates.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No more fee items available — create one above in Fee Items first.
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
      <TableCell>{CATEGORY_LABEL[feeType.category]}</TableCell>
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

function FeeTypesCard({ feeItems }: { feeItems: FeeItem[] }) {
  const { data, isLoading, isError, refetch } = useAllFeeTypes()
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("")

  const hasMultipleRegistrationFees = (data?.filter((f) => f.category === "REGISTRATION").length ?? 0) > 1
  const noItemsYet = feeItems.length === 0

  const hasActiveFilters = search.trim() !== "" || categoryFilter !== ""
  const clearFilters = () => {
    setSearch("")
    setCategoryFilter("")
  }

  const filteredData = useMemo(() => {
    if (!data) return data
    const query = search.trim().toLowerCase()
    return data.filter((feeType) => {
      const matchesSearch = query === "" || feeType.name.toLowerCase().includes(query)
      const matchesCategory = categoryFilter === "" || feeType.category === categoryFilter
      return matchesSearch && matchesCategory
    })
  }, [data, search, categoryFilter])

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
        <div>
          <CardTitle>Fees</CardTitle>
          <CardDescription>Registration, monthly subscription, levies — each made up of fee items above</CardDescription>
        </div>
        <CreateFeeTypeDialog disabled={noItemsYet} />
      </CardHeader>
      <CardContent className="space-y-4">
        {noItemsYet ? (
          <p className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            Create at least one fee item above before you can set up the Registration fee or any other fee.
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
            <Select
              className="sm:w-52"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              aria-label="Filter by category"
            >
              <option value="">All categories</option>
              {Object.entries(CATEGORY_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Recurring</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((feeType, index) => (
                <FeeTypeRow key={feeType.id} feeType={feeType} feeItems={feeItems} index={index} />
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

export function FeeTypesPage() {
  const { data: feeItems } = useAllFeeItems()

  return (
    <DashboardLayout title="Fee Types" navItems={RECEPTIONIST_NAV_ITEMS}>
      <div className="space-y-6">
        <FeeItemsCard />
        <FeeTypesCard feeItems={feeItems ?? []} />
      </div>
    </DashboardLayout>
  )
}
