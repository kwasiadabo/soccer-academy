import { useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { KeyRound, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import {
  Dialog,
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
import { useGuardians, useGrantGuardianPortalAccess, type Guardian } from "./guardians-api"

const grantSchema = z.object({
  email: z.string().email("Enter a valid email address"),
})
type GrantFormValues = z.infer<typeof grantSchema>

function GrantAccessDialog({ guardian, onClose }: { guardian: Guardian; onClose: () => void }) {
  const grantAccess = useGrantGuardianPortalAccess(guardian.id)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<GrantFormValues>({
    resolver: zodResolver(grantSchema),
    defaultValues: { email: guardian.email ?? "" },
  })

  const onSubmit = async (values: GrantFormValues) => {
    setServerError(null)
    try {
      await grantAccess.mutateAsync(values)
      onClose()
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : "Could not grant portal access.")
    }
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Grant parent portal access</DialogTitle>
        <DialogDescription>
          Creates a login for {guardian.firstName} {guardian.lastName} and sends a password-reset link.
        </DialogDescription>
      </DialogHeader>
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="guardian-grant-email">Login email</Label>
          <Input id="guardian-grant-email" type="email" {...register("email")} />
          {errors.email ? <p className="text-xs text-destructive">{errors.email.message}</p> : null}
        </div>
        {serverError ? <p className="text-sm text-destructive">{serverError}</p> : null}
        <DialogFooter>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Granting…" : "Grant access"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}

export function GuardianSearchSection() {
  const [search, setSearch] = useState("")
  const [submittedSearch, setSubmittedSearch] = useState("")
  const { data, isLoading, isError, refetch } = useGuardians(submittedSearch)
  const [grantingGuardian, setGrantingGuardian] = useState<Guardian | null>(null)
  const [accessFilter, setAccessFilter] = useState("")

  const filteredData = useMemo(() => {
    if (!data) return data
    if (accessFilter === "") return data
    return data.filter((guardian) =>
      accessFilter === "HAS_LOGIN" ? !!guardian.userId : !guardian.userId,
    )
  }, [data, accessFilter])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Guardians</CardTitle>
        <CardDescription>Search guardians to grant parent portal access</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            setSubmittedSearch(search.trim())
          }}
        >
          <Input
            placeholder="Search by name, email, or phone"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button type="submit" variant="outline">
            <Search /> Search
          </Button>
        </form>

        {submittedSearch ? (
          <Select
            className="sm:w-44"
            value={accessFilter}
            onChange={(e) => setAccessFilter(e.target.value)}
            aria-label="Filter by portal access"
          >
            <option value="">All portal access</option>
            <option value="HAS_LOGIN">Has login</option>
            <option value="NO_LOGIN">No login</option>
          </Select>
        ) : null}

        {!submittedSearch ? (
          <EmptyState title="Search for a guardian" description="Enter a name, email, or phone number above." />
        ) : isLoading ? (
          <LoadingState rows={3} />
        ) : isError ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : !data || data.length === 0 ? (
          <EmptyState title="No guardians found" description="Try a different search term." />
        ) : !filteredData || filteredData.length === 0 ? (
          <EmptyState title="No matching guardians" description="Try a different filter." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Children</TableHead>
                <TableHead>Portal access</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((guardian, index) => (
                <TableRow key={guardian.id}>
                  <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                  <TableCell className="font-medium">
                    {guardian.firstName} {guardian.lastName}
                  </TableCell>
                  <TableCell>{guardian.email ?? guardian.phone}</TableCell>
                  <TableCell>
                    {guardian.players.map((p) => `${p.player.firstName} ${p.player.lastName}`).join(", ") || "—"}
                  </TableCell>
                  <TableCell>
                    {guardian.userId ? (
                      <span className="text-xs text-success">Active</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">No login</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {!guardian.userId && guardian.email ? (
                      <Button variant="outline" size="sm" onClick={() => setGrantingGuardian(guardian)}>
                        <KeyRound /> Grant access
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={!!grantingGuardian} onOpenChange={(o) => !o && setGrantingGuardian(null)}>
        {grantingGuardian ? (
          <GrantAccessDialog guardian={grantingGuardian} onClose={() => setGrantingGuardian(null)} />
        ) : null}
      </Dialog>
    </Card>
  )
}
