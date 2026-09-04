import { useState } from "react"
import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/design-system/empty-state"
import { formatCurrency } from "@/lib/currency"
import { useAddVariant, useUpdateVariant, type ShopProduct } from "./merchandise-api"

export function ProductVariantsPanel({ product }: { product: ShopProduct }) {
  const addVariant = useAddVariant(product.id)
  const updateVariant = useUpdateVariant(product.id)
  const [sizeLabel, setSizeLabel] = useState("")
  const [stockQuantity, setStockQuantity] = useState("")

  const onAdd = async () => {
    if (!sizeLabel.trim()) return
    await addVariant.mutateAsync({ sizeLabel: sizeLabel.trim(), stockQuantity: Number(stockQuantity) || 0 })
    setSizeLabel("")
    setStockQuantity("")
  }

  return (
    <div className="space-y-3">
      {product.variants.length === 0 ? (
        <EmptyState title="No sizes yet" description="Add a size below so parents can order this item." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Size</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {product.variants.map((variant) => (
              <TableRow key={variant.id}>
                <TableCell className="font-medium">
                  {variant.sizeLabel}
                  {variant.priceOverride ? (
                    <span className="ml-2 text-xs text-muted-foreground">
                      {formatCurrency(Number(variant.priceOverride))}
                    </span>
                  ) : null}
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min={0}
                    defaultValue={variant.stockQuantity}
                    className="w-20"
                    onBlur={(e) => {
                      const next = Number(e.target.value)
                      if (next !== variant.stockQuantity) {
                        updateVariant.mutate({ variantId: variant.id, stockQuantity: next })
                      }
                    }}
                  />
                </TableCell>
                <TableCell>
                  <button
                    type="button"
                    onClick={() => updateVariant.mutate({ variantId: variant.id, isActive: !variant.isActive })}
                  >
                    <Badge variant={variant.isActive ? "success" : "outline"}>
                      {variant.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <div className="flex flex-wrap items-end gap-2 rounded-lg border border-border p-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Size label</label>
          <Input value={sizeLabel} onChange={(e) => setSizeLabel(e.target.value)} placeholder="e.g. M" className="w-28" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Initial stock</label>
          <Input
            type="number"
            min={0}
            value={stockQuantity}
            onChange={(e) => setStockQuantity(e.target.value)}
            placeholder="0"
            className="w-24"
          />
        </div>
        <Button size="sm" onClick={() => void onAdd()} disabled={!sizeLabel.trim() || addVariant.isPending}>
          <Plus /> Add size
        </Button>
      </div>
    </div>
  )
}
