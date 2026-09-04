import { useMemo, useState } from "react"
import { Plus, Search, X } from "lucide-react"

import { DashboardLayout } from "@/app/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { EmptyState } from "@/design-system/empty-state"
import { LoadingState } from "@/design-system/loading-state"
import { ErrorState } from "@/design-system/error-state"
import { formatCurrency } from "@/lib/currency"
import { useStaffNavItems } from "@/features/issues/staff-issues-page"
import { useAllProducts, type ShopProduct } from "./merchandise-api"
import { ProductFormDialog } from "./product-form-dialog"
import { ProductVariantsPanel } from "./product-variants-panel"
import { ProductImagesPanel } from "./product-images-panel"

const CATEGORY_LABELS: Record<ShopProduct["category"], string> = {
  JERSEY: "Jersey",
  TRACK_SUIT: "Track Suit",
  BOOTS: "Boots",
  SOCKS: "Socks",
  OTHER: "Other",
}

export function StaffProductsPage() {
  const navItems = useStaffNavItems()
  const { data, isLoading, isError, refetch } = useAllProducts()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState("")

  const selected = data?.find((p) => p.id === selectedId) ?? null

  const filteredData = useMemo(() => {
    if (!data) return data
    const query = search.trim().toLowerCase()
    return data.filter((product) => query === "" || product.name.toLowerCase().includes(query))
  }, [data, search])

  return (
    <DashboardLayout title="Products" navItems={navItems}>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Products</CardTitle>
              <CardDescription>Catalog of items available in the academy shop</CardDescription>
            </div>
            <ProductFormDialog trigger={<Button size="sm"><Plus /> New product</Button>} />
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative flex-1 sm:max-w-xs">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by product name…"
                  className="pl-8"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              {search.trim() !== "" ? (
                <Button variant="ghost" size="sm" onClick={() => setSearch("")}>
                  <X /> Clear
                </Button>
              ) : null}
            </div>

            {isLoading ? (
              <LoadingState rows={4} />
            ) : isError ? (
              <ErrorState onRetry={() => void refetch()} />
            ) : !data || data.length === 0 ? (
              <EmptyState title="No products yet" description="Create your first item to start the shop." />
            ) : !filteredData || filteredData.length === 0 ? (
              <EmptyState title="No matching products" description="Try adjusting your search." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Sizes</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((product) => (
                    <TableRow
                      key={product.id}
                      className="cursor-pointer"
                      onClick={() => setSelectedId(product.id)}
                      data-state={selectedId === product.id ? "selected" : undefined}
                    >
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>{CATEGORY_LABELS[product.category]}</TableCell>
                      <TableCell className="tabular-nums">{formatCurrency(Number(product.basePrice))}</TableCell>
                      <TableCell className="tabular-nums">{product.variants.length}</TableCell>
                      <TableCell className="tabular-nums">
                        {product.variants.reduce((sum, v) => sum + v.stockQuantity, 0)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={product.isActive ? "success" : "outline"}>
                          {product.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{selected ? selected.name : "Select a product"}</CardTitle>
            <CardDescription>{selected ? "Manage sizes, stock, and image" : "Click a product to manage it"}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selected ? (
              <>
                <ProductFormDialog
                  product={selected}
                  trigger={
                    <Button variant="outline" size="sm">
                      Edit details
                    </Button>
                  }
                />
                <ProductImagesPanel product={selected} />
                <ProductVariantsPanel product={selected} />
              </>
            ) : (
              <EmptyState title="No product selected" description="Choose a product from the list to manage it." />
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
