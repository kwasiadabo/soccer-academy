import { formatDate } from "@/lib/date"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useNavigate } from "react-router-dom"
import { CalendarPlus, CalendarRange, ClipboardCheck, Pencil } from "lucide-react"

import { DashboardLayout } from "@/app/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { EmptyState } from "@/design-system/empty-state"
import { LoadingState } from "@/design-system/loading-state"
import { ErrorState } from "@/design-system/error-state"
import { StatusBadge } from "@/design-system/status-badge"
import { ApiError } from "@/lib/api-client"
import {
  useCreateTrainingSession,
  useTrainingSessions,
  useTrainingTeams,
  useUpdateTrainingSession,
  type TrainingSession,
  type TrainingSessionStatus,
} from "./training-api"
import { HEAD_COACH_NAV_ITEMS } from "@/features/dashboard-head-coach/head-coach-dashboard"

const SESSION_STATUS_OPTIONS: TrainingSessionStatus[] = ["SCHEDULED", "COMPLETED", "CANCELLED"]

const createSessionSchema = z.object({
  teamId: z.string().min(1, "Select a team"),
  date: z.string().min(1, "Date is required"),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  location: z.string().optional(),
})
type CreateSessionFormValues = z.infer<typeof createSessionSchema>

function CreateSessionDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { data: teams } = useTrainingTeams(open)
  const createSession = useCreateTrainingSession()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateSessionFormValues>({
    resolver: zodResolver(createSessionSchema),
    defaultValues: { location: "Makers House Astroturf" },
  })

  const onSubmit = async (values: CreateSessionFormValues) => {
    setServerError(null)
    try {
      await createSession.mutateAsync({
        teamId: values.teamId,
        date: values.date,
        startTime: values.startTime || undefined,
        endTime: values.endTime || undefined,
        location: values.location || undefined,
      })
      reset()
      onOpenChange(false)
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : "Could not create session.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="mb-1 flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <CalendarPlus className="size-4.5" />
          </div>
          <DialogTitle>Create a training session</DialogTitle>
          <DialogDescription>
            For a makeup session, or any date outside the usual weekly fixture — for any team/coach.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="create-session-team">Team</Label>
            <Select id="create-session-team" defaultValue="" {...register("teamId")}>
              <option value="" disabled>
                Select a team
              </option>
              {teams?.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
            {errors.teamId ? <p className="text-xs text-destructive">{errors.teamId.message}</p> : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="create-session-date">Date</Label>
            <Input id="create-session-date" type="date" {...register("date")} />
            {errors.date ? <p className="text-xs text-destructive">{errors.date.message}</p> : null}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="create-session-start">Start time</Label>
              <Input id="create-session-start" type="time" {...register("startTime")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="create-session-end">End time</Label>
              <Input id="create-session-end" type="time" {...register("endTime")} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="create-session-location">Location</Label>
            <Input id="create-session-location" {...register("location")} />
          </div>
          {serverError ? <p className="text-sm text-destructive">{serverError}</p> : null}
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating…" : "Create session"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

const editSessionSchema = z.object({
  date: z.string().min(1, "Date is required"),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  location: z.string().optional(),
  status: z.enum(["SCHEDULED", "COMPLETED", "CANCELLED"]),
})
type EditSessionFormValues = z.infer<typeof editSessionSchema>

function EditSessionDialog({ session, onOpenChange }: { session: TrainingSession | null; onOpenChange: (open: boolean) => void }) {
  const updateSession = useUpdateTrainingSession(session?.id ?? "")
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EditSessionFormValues>({ resolver: zodResolver(editSessionSchema) })

  useEffect(() => {
    if (session) {
      reset({
        date: session.date.slice(0, 10),
        startTime: session.startTime ?? "",
        endTime: session.endTime ?? "",
        location: session.location ?? "",
        status: session.status,
      })
      setServerError(null)
    }
  }, [session, reset])

  const onSubmit = async (values: EditSessionFormValues) => {
    setServerError(null)
    try {
      await updateSession.mutateAsync({
        date: values.date,
        startTime: values.startTime || undefined,
        endTime: values.endTime || undefined,
        location: values.location || undefined,
        status: values.status,
      })
      onOpenChange(false)
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : "Could not update session.")
    }
  }

  return (
    <Dialog open={!!session} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="mb-1 flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Pencil className="size-4.5" />
          </div>
          <DialogTitle>Edit training session</DialogTitle>
          <DialogDescription>
            {session ? `${session.trainingGroup?.name ?? session.team.name} — reschedule, relocate, or cancel it.` : null}
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="edit-session-date">Date</Label>
            <Input id="edit-session-date" type="date" {...register("date")} />
            {errors.date ? <p className="text-xs text-destructive">{errors.date.message}</p> : null}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-session-start">Start time</Label>
              <Input id="edit-session-start" type="time" {...register("startTime")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-session-end">End time</Label>
              <Input id="edit-session-end" type="time" {...register("endTime")} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-session-location">Location</Label>
            <Input id="edit-session-location" {...register("location")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-session-status">Status</Label>
            <Select id="edit-session-status" {...register("status")}>
              {SESSION_STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </Select>
          </div>
          {serverError ? <p className="text-sm text-destructive">{serverError}</p> : null}
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

export function SessionManagementPage() {
  const navigate = useNavigate()
  const { data: sessions, isLoading, isError, refetch } = useTrainingSessions()
  const { data: teams } = useTrainingTeams()
  const [createOpen, setCreateOpen] = useState(false)
  const [editingSession, setEditingSession] = useState<TrainingSession | null>(null)
  const [teamFilter, setTeamFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")

  const filteredSessions = (sessions ?? [])
    .filter((s) => !teamFilter || s.teamId === teamFilter)
    .filter((s) => !statusFilter || s.status === statusFilter)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return (
    <DashboardLayout title="Session Management" navItems={HEAD_COACH_NAV_ITEMS}>
      <div className="space-y-4">
        <Card>
          <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-accent-foreground">
                <CalendarRange className="size-4.5" aria-hidden />
              </div>
              <div>
                <CardTitle>Sessions</CardTitle>
                <CardDescription>Create and manage training sessions across every team and coach.</CardDescription>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)}>
              <CalendarPlus /> Create Session
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <Select value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)} className="sm:w-48">
                <option value="">All teams</option>
                {teams?.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
              <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="sm:w-44">
                <option value="">All statuses</option>
                {SESSION_STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </Select>
            </div>

            {isLoading ? (
              <LoadingState rows={4} />
            ) : isError ? (
              <ErrorState onRetry={() => void refetch()} />
            ) : filteredSessions.length === 0 ? (
              <EmptyState
                title="No sessions found"
                description="Try a different filter, or create a session for a team."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead>Coach</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSessions.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell className="tabular-nums">{formatDate(session.date)}</TableCell>
                      <TableCell>{session.trainingGroup?.name ?? session.team.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {session.conductedByCoach
                          ? `${session.conductedByCoach.firstName} ${session.conductedByCoach.lastName}`
                          : "Unassigned"}
                      </TableCell>
                      <TableCell className="tabular-nums text-muted-foreground">
                        {session.startTime ?? "TBC"}
                        {session.endTime ? `–${session.endTime}` : ""}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{session.location ?? "—"}</TableCell>
                      <TableCell>
                        <StatusBadge status={session.status} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Edit session"
                            onClick={() => setEditingSession(session)}
                          >
                            <Pencil />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="View attendance"
                            onClick={() => navigate(`/head-coach/training-sessions/${session.id}`)}
                          >
                            <ClipboardCheck />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <CreateSessionDialog open={createOpen} onOpenChange={setCreateOpen} />
      <EditSessionDialog session={editingSession} onOpenChange={(o) => !o && setEditingSession(null)} />
    </DashboardLayout>
  )
}
