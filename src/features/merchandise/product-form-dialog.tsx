import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
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
import { useCreateProduct, useUpdateProduct, type ProductCategory, type ShopProduct } from "./merchandise-api"

const CATEGORY_OPTIONS: { value: ProductCategory; label: string }[] = [
  { value: "JERSEY", label: "Jersey" },
  { value: "TRACK_SUIT", label: "Track Suit" },
  { value: "BOOTS", label: "Boots" },
  { value: "SOCKS", label: "Socks" },
  { value: "OTHER", label: "Other" },
]

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  category: z.enum(["JERSEY", "TRACK_SUIT", "BOOTS", "SOCKS", "OTHER"]),
  basePrice: z.coerce.number().min(0, "Price must be 0 or more"),
})
type FormValues = z.infer<typeof schema>

export function ProductFormDialog({
  product,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: {
  product?: ShopProduct
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const open = controlledOpen ?? uncontrolledOpen
  const setOpen = controlledOnOpenChange ?? setUncontrolledOpen

  const createProduct = useCreateProduct()
  const updateProduct = useUpdateProduct(product?.id ?? "")
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: product?.name ?? "",
      description: product?.description ?? "",
      category: product?.category ?? "JERSEY",
      basePrice: product ? Number(product.basePrice) : 0,
    },
  })

  useEffect(() => {
    if (open) {
      reset({
        name: product?.name ?? "",
        description: product?.description ?? "",
        category: product?.category ?? "JERSEY",
        basePrice: product ? Number(product.basePrice) : 0,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const onSubmit = async (values: FormValues) => {
    setServerError(null)
    try {
      if (product) {
        await updateProduct.mutateAsync(values)
      } else {
        await createProduct.mutateAsync(values)
      }
      setOpen(false)
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : "Could not save this product.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{product ? "Edit product" : "New product"}</DialogTitle>
          <DialogDescription>
            {product ? "Update this item's catalog details." : "Add a new item to the academy shop."}
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="product-name">Name</Label>
            <Input id="product-name" placeholder="e.g. Home Jersey" {...register("name")} />
            {errors.name ? <p className="text-xs text-destructive">{errors.name.message}</p> : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="product-category">Category</Label>
            <Select id="product-category" {...register("category")}>
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="product-price">Base price (GHS)</Label>
            <Input id="product-price" type="number" step="0.01" min="0" {...register("basePrice")} />
            {errors.basePrice ? <p className="text-xs text-destructive">{errors.basePrice.message}</p> : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="product-description">Description</Label>
            <Textarea id="product-description" rows={3} {...register("description")} />
          </div>
          {serverError ? <p className="text-sm text-destructive">{serverError}</p> : null}
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : product ? "Save changes" : "Create product"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
