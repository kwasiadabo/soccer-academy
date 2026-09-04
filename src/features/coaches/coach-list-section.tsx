import { useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Plus, KeyRound, ChevronRight, Search, X } from "lucide-react"
import { useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
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
import { StatusBadge } from "@/design-system/status-badge"
import { ApiError } from "@/lib/api-client"
import {
  useCoaches,
  useCreateCoach,
  useGrantCoachPortalAccess,
  STAFF_ROLE_LABELS,
  type Coach,
  type StaffRole,
} from "./coaches-api"

const STAFF_ROLES = Object.keys(STAFF_ROLE_LABELS) as StaffRole[]

const createSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  middleName: z.string().optional(),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().optional(),
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  bio: z.string().optional(),
  role: z.enum(["COACH", "KITMAN", "RECEPTIONIST_CASHIER", "MEDIA"]),
})
type CreateFormValues = z.infer<typeof createSchema>

const grantSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  coach: z.boolean(),
  headCoach: z.boolean(),
})
type GrantFormValues = z.infer<typeof grantSchema>

function GrantAccessDialog({ coach, onClose }: { coach: Coach; onClose: () => void }) {
  const grantAccess = useGrantCoachPortalAccess(coach.id)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<GrantFormValues>({
    resolver: zodResolver(grantSchema),
    defaultValues: { email: coach.email ?? "", coach: true, headCoach: false },
  })

  const onSubmit = async (values: GrantFormValues) => {
    setServerError(null)
    const roleNames = [values.coach && "Coach", values.headCoach && "Head Coach"].filter(
      (v): v is string => !!v,
    )
    if (roleNames.length === 0) {
      setServerError("Select at least one role")
      return
    }
    try {
      await grantAccess.mutateAsync({ email: values.email, roleNames })
      onClose()
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : "Could not grant portal access.")
    }
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Grant portal access</DialogTitle>
        <DialogDescription>
          Creates a login for {coach.firstName} {coach.lastName} and sends a password-reset link.
        </DialogDescription>
      </DialogHeader>
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="grant-email">Login email</Label>
          <Input id="grant-email" type="email" {...register("email")} />
          {errors.email ? <p className="text-xs text-destructive">{errors.email.message}</p> : null}
        </div>
        <div className="space-y-2">
          <Label>Roles</Label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...register("coach")} />
            Coach
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...register("headCoach")} />
            Head Coach
          </label>
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

export function CoachListSection({ basePath = "/admin/staff" }: { basePath?: string }) {
  const navigate = useNavigate()
  const { data, isLoading, isError, refetch } = useCoaches()
  const createCoach = useCreateCoach()
  const [open, setOpen] = useState(false)
  const [grantingCoach, setGrantingCoach] = useState<Coach | null>(null)

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [accessFilter, setAccessFilter] = useState("")

  const hasActiveFilters = search.trim() !== "" || statusFilter !== "" || accessFilter !== ""
  const clearFilters = () => {
    setSearch("")
    setStatusFilter("")
    setAccessFilter("")
  }

  const filteredData = useMemo(() => {
    if (!data) return data
    const query = search.trim().toLowerCase()
    return data.filter((coach) => {
      const matchesSearch =
        query === "" ||
        `${coach.firstName} ${coach.lastName}`.toLowerCase().includes(query) ||
        (coach.email ?? "").toLowerCase().includes(query)
      const matchesStatus =
        statusFilter === "" || (statusFilter === "ACTIVE" ? coach.isActive : !coach.isActive)
      const matchesAccess =
        accessFilter === "" || (accessFilter === "HAS_LOGIN" ? !!coach.userId : !coach.userId)
      return matchesSearch && matchesStatus && matchesAccess
    })
  }, [data, search, statusFilter, accessFilter])

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { role: "COACH" },
  })

  const onSubmit = async (values: CreateFormValues) => {
    await createCoach.mutateAsync({
      firstName: values.firstName,
      middleName: values.middleName || undefined,
      lastName: values.lastName,
      phone: values.phone || undefined,
      email: values.email || undefined,
      bio: values.bio || undefined,
      role: values.role,
    })
    reset()
    setOpen(false)
  }

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
        <div>
          <CardTitle>Coaches</CardTitle>
          <CardDescription>Coaching staff profiles and portal access</CardDescription>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus /> New staff
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create staff profile</DialogTitle>
              <DialogDescription>Add a staff member's profile.</DialogDescription>
            </DialogHeader>
            <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="coach-first-name">First name</Label>
                  <Input id="coach-first-name" {...register("firstName")} />
                  {errors.firstName ? (
                    <p className="text-xs text-destructive">{errors.firstName.message}</p>
                  ) : null}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="coach-middle-name">Middle name</Label>
                  <Input id="coach-middle-name" {...register("middleName")} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="coach-last-name">Last name</Label>
                  <Input id="coach-last-name" {...register("lastName")} />
                  {errors.lastName ? (
                    <p className="text-xs text-destructive">{errors.lastName.message}</p>
                  ) : null}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="coach-phone">Phone</Label>
                  <Input id="coach-phone" {...register("phone")} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="coach-email">Email</Label>
                  <Input id="coach-email" type="email" {...register("email")} />
                  {errors.email ? <p className="text-xs text-destructive">{errors.email.message}</p> : null}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="coach-role">Role</Label>
                  <Select id="coach-role" {...register("role")}>
                    {STAFF_ROLES.map((role) => (
                      <option key={role} value={role}>
                        {STAFF_ROLE_LABELS[role]}
                      </option>
                    ))}
                  </Select>
                  {errors.role ? <p className="text-xs text-destructive">{errors.role.message}</p> : null}
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Creating…" : "Create staff"}
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
              placeholder="Search by name or email…"
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select
            className="sm:w-40"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by status"
          >
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
          </Select>
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
          <EmptyState title="No coaches yet" description="Create a coach profile to get started." />
        ) : !filteredData || filteredData.length === 0 ? (
          <EmptyState title="No matching coaches" description="Try adjusting your search or filters." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Portal access</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((coach, index) => (
                <TableRow key={coach.id}>
                  <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                  <TableCell className="font-medium">
                    {[coach.firstName, coach.middleName, coach.lastName].filter(Boolean).join(" ")}
                  </TableCell>
                  <TableCell>{STAFF_ROLE_LABELS[coach.role]}</TableCell>
                  <TableCell>{coach.email ?? "—"}</TableCell>
                  <TableCell>
                    {coach.userId ? (
                      <span className="text-xs text-success">
                        Active ({coach.user?.roles.map((r) => r.role.name).join(", ")})
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">No login</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={coach.isActive ? "ACTIVE" : "SUSPENDED"} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      {!coach.userId ? (
                        <Button variant="outline" size="sm" onClick={() => setGrantingCoach(coach)}>
                          <KeyRound /> Grant access
                        </Button>
                      ) : null}
                      <Button variant="ghost" size="sm" onClick={() => navigate(`${basePath}/${coach.id}`)}>
                        Profile <ChevronRight />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={!!grantingCoach} onOpenChange={(o) => !o && setGrantingCoach(null)}>
        {grantingCoach ? (
          <GrantAccessDialog coach={grantingCoach} onClose={() => setGrantingCoach(null)} />
        ) : null}
      </Dialog>
    </Card>
  )
}
