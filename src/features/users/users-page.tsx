import { useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Plus, KeyRound, Pencil, Trash2, Ban, CheckCircle2, Search, X } from "lucide-react"
import { ROLE_NAMES } from "@/lib/shared-types"

import { DashboardLayout } from "@/app/dashboard-layout"
import { useAuth } from "@/app/auth-context"
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
  useUsers,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  useResetUserPassword,
  type AdminUser,
} from "./users-api"

const ALL_ROLES = Object.values(ROLE_NAMES)
const ALL_STATUSES = ["ACTIVE", "INACTIVE", "SUSPENDED"] as const

const createSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  phone: z.string().optional(),
  roles: z.array(z.string()).min(1, "Select at least one role"),
  mustChangePassword: z.boolean(),
})
type CreateFormValues = z.infer<typeof createSchema>

function RoleCheckboxes({
  selected,
  onToggle,
}: {
  selected: string[]
  onToggle: (role: string) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {ALL_ROLES.map((role) => (
        <label key={role} className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={selected.includes(role)} onChange={() => onToggle(role)} />
          {role}
        </label>
      ))}
    </div>
  )
}

function CreateUserDialog({ onDone }: { onDone: () => void }) {
  const createUser = useCreateUser()
  const [serverError, setServerError] = useState<string | null>(null)
  const [roles, setRoles] = useState<string[]>([])

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { roles: [], mustChangePassword: true },
  })

  const mustChangePassword = watch("mustChangePassword")

  const toggleRole = (role: string) => {
    const next = roles.includes(role) ? roles.filter((r) => r !== role) : [...roles, role]
    setRoles(next)
    setValue("roles", next, { shouldValidate: true })
    // Default to requiring a password change whenever Parent is selected.
    if (role === ROLE_NAMES.PARENT && !roles.includes(role)) {
      setValue("mustChangePassword", true)
    }
  }

  const onSubmit = async (values: CreateFormValues) => {
    setServerError(null)
    try {
      await createUser.mutateAsync({
        email: values.email,
        password: values.password,
        firstName: values.firstName,
        lastName: values.lastName,
        phone: values.phone || undefined,
        roleNames: values.roles,
        mustChangePassword: values.mustChangePassword,
      })
      reset()
      setRoles([])
      onDone()
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : "Could not create user.")
    }
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Create user</DialogTitle>
        <DialogDescription>Add a new account and assign its roles.</DialogDescription>
      </DialogHeader>
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="user-first-name">First name</Label>
            <Input id="user-first-name" {...register("firstName")} />
            {errors.firstName ? <p className="text-xs text-destructive">{errors.firstName.message}</p> : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="user-last-name">Last name</Label>
            <Input id="user-last-name" {...register("lastName")} />
            {errors.lastName ? <p className="text-xs text-destructive">{errors.lastName.message}</p> : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="user-email">Email</Label>
            <Input id="user-email" type="email" {...register("email")} />
            {errors.email ? <p className="text-xs text-destructive">{errors.email.message}</p> : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="user-phone">Phone</Label>
            <Input id="user-phone" {...register("phone")} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="user-password">Temporary password</Label>
            <Input id="user-password" type="text" {...register("password")} />
            {errors.password ? <p className="text-xs text-destructive">{errors.password.message}</p> : null}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Roles</Label>
          <RoleCheckboxes selected={roles} onToggle={toggleRole} />
          {errors.roles ? <p className="text-xs text-destructive">{errors.roles.message}</p> : null}
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={mustChangePassword}
            onChange={(e) => setValue("mustChangePassword", e.target.checked)}
          />
          Require password change at first login
        </label>

        {serverError ? <p className="text-sm text-destructive">{serverError}</p> : null}
        <DialogFooter>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating…" : "Create user"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}

const editSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Enter a valid email address"),
  phone: z.string().optional(),
})
type EditFormValues = z.infer<typeof editSchema>

function EditUserDialog({ user, onDone }: { user: AdminUser; onDone: () => void }) {
  const updateUser = useUpdateUser(user.id)
  const [serverError, setServerError] = useState<string | null>(null)
  const [roles, setRoles] = useState<string[]>(user.roles)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone ?? "",
    },
  })

  const toggleRole = (role: string) => {
    setRoles((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]))
  }

  const onSubmit = async (values: EditFormValues) => {
    setServerError(null)
    if (roles.length === 0) {
      setServerError("Select at least one role")
      return
    }
    try {
      await updateUser.mutateAsync({
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        phone: values.phone || undefined,
        roleNames: roles,
      })
      onDone()
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : "Could not update user.")
    }
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Edit user</DialogTitle>
        <DialogDescription>
          {user.firstName} {user.lastName}
        </DialogDescription>
      </DialogHeader>
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="edit-first-name">First name</Label>
            <Input id="edit-first-name" {...register("firstName")} />
            {errors.firstName ? <p className="text-xs text-destructive">{errors.firstName.message}</p> : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-last-name">Last name</Label>
            <Input id="edit-last-name" {...register("lastName")} />
            {errors.lastName ? <p className="text-xs text-destructive">{errors.lastName.message}</p> : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-email">Email</Label>
            <Input id="edit-email" type="email" {...register("email")} />
            {errors.email ? <p className="text-xs text-destructive">{errors.email.message}</p> : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-phone">Phone</Label>
            <Input id="edit-phone" {...register("phone")} />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Roles</Label>
          <RoleCheckboxes selected={roles} onToggle={toggleRole} />
        </div>

        {serverError ? <p className="text-sm text-destructive">{serverError}</p> : null}
        <DialogFooter>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}

function ResetPasswordDialog({ user, onDone }: { user: AdminUser; onDone: () => void }) {
  const resetPassword = useResetUserPassword(user.id)
  const [mode, setMode] = useState<"link" | "temporary">("link")
  const [password, setPassword] = useState("")
  const [serverError, setServerError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const onSubmit = async () => {
    setServerError(null)
    if (mode === "temporary" && password.length < 8) {
      setServerError("Temporary password must be at least 8 characters")
      return
    }
    setSubmitting(true)
    try {
      await resetPassword.mutateAsync({ password: mode === "temporary" ? password : undefined })
      onDone()
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : "Could not reset password.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Reset password</DialogTitle>
        <DialogDescription>
          {user.firstName} {user.lastName} ({user.email})
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="reset-mode"
              checked={mode === "link"}
              onChange={() => setMode("link")}
            />
            Email a reset link
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="reset-mode"
              checked={mode === "temporary"}
              onChange={() => setMode("temporary")}
            />
            Set a temporary password now
          </label>
        </div>
        {mode === "temporary" ? (
          <div className="space-y-1.5">
            <Label htmlFor="temp-password">Temporary password</Label>
            <Input
              id="temp-password"
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              The user will be required to change this password at their next login.
            </p>
          </div>
        ) : null}
        {serverError ? <p className="text-sm text-destructive">{serverError}</p> : null}
        <DialogFooter>
          <Button onClick={() => void onSubmit()} disabled={submitting}>
            {submitting ? "Working…" : mode === "link" ? "Send reset link" : "Set password"}
          </Button>
        </DialogFooter>
      </div>
    </DialogContent>
  )
}

function DeleteUserDialog({ user, onDone }: { user: AdminUser; onDone: () => void }) {
  const deleteUser = useDeleteUser()
  const [serverError, setServerError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const onConfirm = async () => {
    setServerError(null)
    setSubmitting(true)
    try {
      await deleteUser.mutateAsync(user.id)
      onDone()
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : "Could not delete user.")
      setSubmitting(false)
    }
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Delete user</DialogTitle>
        <DialogDescription>
          {user.firstName} {user.lastName} will lose access immediately. This can't be undone from here.
        </DialogDescription>
      </DialogHeader>
      {serverError ? <p className="text-sm text-destructive">{serverError}</p> : null}
      <DialogFooter>
        <Button variant="destructive" onClick={() => void onConfirm()} disabled={submitting}>
          {submitting ? "Deleting…" : "Delete user"}
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}

function UserRow({
  user: u,
  isSelf,
  onEdit,
  onReset,
  onDelete,
}: {
  user: AdminUser
  isSelf: boolean
  onEdit: () => void
  onReset: () => void
  onDelete: () => void
}) {
  const updateUser = useUpdateUser(u.id)

  const toggleSuspend = () => {
    void updateUser.mutateAsync({ status: u.status === "SUSPENDED" ? "ACTIVE" : "SUSPENDED" })
  }

  return (
    <TableRow>
      <TableCell className="font-medium">
        {u.firstName} {u.lastName}
      </TableCell>
      <TableCell>{u.email}</TableCell>
      <TableCell className="text-sm text-muted-foreground">{u.roles.join(", ")}</TableCell>
      <TableCell>
        <StatusBadge status={u.status} />
      </TableCell>
      <TableCell>
        {u.mustChangePassword ? (
          <span className="text-xs text-warning">Change required</span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell>
        <div className="flex items-center justify-end gap-1.5">
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Pencil /> Edit
          </Button>
          <Button variant="outline" size="sm" onClick={onReset}>
            <KeyRound /> Reset
          </Button>
          {!isSelf ? (
            <Button variant="outline" size="sm" onClick={toggleSuspend} disabled={updateUser.isPending}>
              {u.status === "SUSPENDED" ? (
                <>
                  <CheckCircle2 /> Activate
                </>
              ) : (
                <>
                  <Ban /> Suspend
                </>
              )}
            </Button>
          ) : null}
          {!isSelf ? (
            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={onDelete}>
              <Trash2 />
            </Button>
          ) : null}
        </div>
      </TableCell>
    </TableRow>
  )
}

export function UsersPage() {
  const { user: currentUser } = useAuth()
  const { data, isLoading, isError, refetch } = useUsers()
  const [createOpen, setCreateOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null)
  const [resettingUser, setResettingUser] = useState<AdminUser | null>(null)
  const [deletingUser, setDeletingUser] = useState<AdminUser | null>(null)

  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")

  const hasActiveFilters = search.trim() !== "" || roleFilter !== "" || statusFilter !== ""
  const clearFilters = () => {
    setSearch("")
    setRoleFilter("")
    setStatusFilter("")
  }

  const filteredData = useMemo(() => {
    if (!data) return data
    const query = search.trim().toLowerCase()
    return data.filter((u) => {
      const matchesSearch =
        query === "" ||
        `${u.firstName} ${u.lastName}`.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query)
      const matchesRole = roleFilter === "" || u.roles.includes(roleFilter)
      const matchesStatus = statusFilter === "" || u.status === statusFilter
      return matchesSearch && matchesRole && matchesStatus
    })
  }, [data, search, roleFilter, statusFilter])

  return (
    <DashboardLayout title="Users">
      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>All users</CardTitle>
            <CardDescription>Every account with portal access, across all roles</CardDescription>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus /> New user
              </Button>
            </DialogTrigger>
            <CreateUserDialog onDone={() => setCreateOpen(false)} />
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
              className="sm:w-44"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              aria-label="Filter by role"
            >
              <option value="">All roles</option>
              {ALL_ROLES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </Select>
            <Select
              className="sm:w-40"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by status"
            >
              <option value="">All statuses</option>
              {ALL_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status.charAt(0) + status.slice(1).toLowerCase()}
                </option>
              ))}
            </Select>
            {hasActiveFilters ? (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X /> Clear
              </Button>
            ) : null}
          </div>

          {isLoading ? (
            <LoadingState rows={4} />
          ) : isError ? (
            <ErrorState onRetry={() => void refetch()} />
          ) : !data || data.length === 0 ? (
            <EmptyState title="No users yet" description="Create a user to get started." />
          ) : !filteredData || filteredData.length === 0 ? (
            <EmptyState
              title="No matching users"
              description="Try adjusting your search or filters."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Password</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((u) => (
                  <UserRow
                    key={u.id}
                    user={u}
                    isSelf={u.id === currentUser?.id}
                    onEdit={() => setEditingUser(u)}
                    onReset={() => setResettingUser(u)}
                    onDelete={() => setDeletingUser(u)}
                  />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editingUser} onOpenChange={(o) => !o && setEditingUser(null)}>
        {editingUser ? <EditUserDialog user={editingUser} onDone={() => setEditingUser(null)} /> : null}
      </Dialog>

      <Dialog open={!!resettingUser} onOpenChange={(o) => !o && setResettingUser(null)}>
        {resettingUser ? (
          <ResetPasswordDialog user={resettingUser} onDone={() => setResettingUser(null)} />
        ) : null}
      </Dialog>

      <Dialog open={!!deletingUser} onOpenChange={(o) => !o && setDeletingUser(null)}>
        {deletingUser ? <DeleteUserDialog user={deletingUser} onDone={() => setDeletingUser(null)} /> : null}
      </Dialog>
    </DashboardLayout>
  )
}
