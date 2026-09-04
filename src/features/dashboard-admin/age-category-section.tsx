import { useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Plus, Search, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { useAgeCategories, useCreateAgeCategory } from "./academy-config-api"

const schema = z
  .object({
    name: z.string().min(2, "Name is required"),
    code: z.string().min(1, "Code is required").max(10),
    minAge: z.number().int().min(0),
    maxAge: z.number().int().min(0),
  })
  .refine((v) => v.maxAge >= v.minAge, {
    message: "Max age must be at least the min age",
    path: ["maxAge"],
  })

type FormValues = z.infer<typeof schema>

export function AgeCategorySection() {
  const { data, isLoading, isError, refetch } = useAgeCategories()
  const createAgeCategory = useCreateAgeCategory()
  const [open, setOpen] = useState(false)

  const [search, setSearch] = useState("")
  const hasActiveFilters = search.trim() !== ""
  const clearFilters = () => setSearch("")

  const filteredData = useMemo(() => {
    if (!data) return data
    const query = search.trim().toLowerCase()
    return data.filter(
      (category) =>
        query === "" ||
        category.name.toLowerCase().includes(query) ||
        category.code.toLowerCase().includes(query),
    )
  }, [data, search])

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const onSubmit = async (values: FormValues) => {
    await createAgeCategory.mutateAsync(values)
    reset()
    setOpen(false)
  }

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
        <div>
          <CardTitle>Age Categories</CardTitle>
          <CardDescription>Configurable age groups, e.g. Under 12</CardDescription>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus /> New category
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create age category</DialogTitle>
              <DialogDescription>Define a new age group for player grouping.</DialogDescription>
            </DialogHeader>
            <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="ac-name">Name</Label>
                  <Input id="ac-name" placeholder="Under 14" {...register("name")} />
                  {errors.name ? <p className="text-xs text-destructive">{errors.name.message}</p> : null}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ac-code">Code</Label>
                  <Input id="ac-code" placeholder="U14" {...register("code")} />
                  {errors.code ? <p className="text-xs text-destructive">{errors.code.message}</p> : null}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="ac-min">Min age</Label>
                  <Input
                    id="ac-min"
                    type="number"
                    min={0}
                    {...register("minAge", { valueAsNumber: true })}
                  />
                  {errors.minAge ? <p className="text-xs text-destructive">{errors.minAge.message}</p> : null}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ac-max">Max age</Label>
                  <Input
                    id="ac-max"
                    type="number"
                    min={0}
                    {...register("maxAge", { valueAsNumber: true })}
                  />
                  {errors.maxAge ? <p className="text-xs text-destructive">{errors.maxAge.message}</p> : null}
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Creating…" : "Create category"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name or code…"
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

        {isLoading ? (
          <LoadingState rows={3} />
        ) : isError ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : !data || data.length === 0 ? (
          <EmptyState
            title="No age categories yet"
            description="Add categories like Under 10, Under 12, Under 14 to start grouping players."
          />
        ) : !filteredData || filteredData.length === 0 ? (
          <EmptyState title="No matching categories" description="Try adjusting your search." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Age range</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((category, index) => (
                <TableRow key={category.id}>
                  <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                  <TableCell className="font-medium">{category.name}</TableCell>
                  <TableCell>{category.code}</TableCell>
                  <TableCell>
                    {category.minAge}–{category.maxAge}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
