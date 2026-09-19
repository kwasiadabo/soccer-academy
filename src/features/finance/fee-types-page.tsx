import { useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Pencil, Plus, Search, X } from "lucide-react"

import { DashboardLayout } from "@/app/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { useStaffNavItems } from "@/features/issues/staff-issues-page"
import { useAllFeeItems, useCreateFeeItem, useUpdateFeeItem, type FeeItem } from "./finance-api"

// ---------- Fee Items (raw catalog) ----------
// The Fees table itself (categories, recurring monthly fee, etc.) lives on
// the Billing page now — an academy's own fee catalog is a billing decision,
// not a back-office one. This page keeps only the raw building blocks that
// Fees are composed from. A fee item has no price of its own — the amount is
// only decided once it's attached to a specific Fee on the Billing page,
// since the same item (e.g. "Jersey") can be worth a different amount there.

const feeItemSchema = z.object({
  name: z.string().min(1, "Name is required"),
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
      description: values.description || undefined,
    })
    reset({ name: "", description: "" })
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
            A building block (e.g. jersey, training kit, admin processing) with no price of its own — you'll set
            its amount when you attach it to a Fee on the Billing page.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="item-name">Name</Label>
            <Input id="item-name" placeholder="Jersey" {...register("name")} />
            {errors.name ? <p className="text-xs text-destructive">{errors.name.message}</p> : null}
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
      description: feeItem.description ?? "",
    },
  })

  const onSubmit = async (values: FeeItemFormValues) => {
    await updateFeeItem.mutateAsync({
      name: values.name,
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
          reset({ name: feeItem.name, description: feeItem.description ?? "" })
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
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="edit-item-name">Name</Label>
            <Input id="edit-item-name" {...register("name")} />
            {errors.name ? <p className="text-xs text-destructive">{errors.name.message}</p> : null}
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
          <CardDescription>
            The building blocks — set these up first, then price and compose Fees from them on the Billing page
          </CardDescription>
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

export function FeeTypesPage() {
  const navItems = useStaffNavItems()
  return (
    <DashboardLayout title="Fee Items" navItems={navItems}>
      <div className="space-y-6">
        <FeeItemsCard />
      </div>
    </DashboardLayout>
  )
}
