import { formatDate, isPastDate } from "@/lib/date"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useNavigate } from "react-router-dom"
import { ArrowRight, CalendarPlus, ClipboardList } from "lucide-react"

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { EmptyState } from "@/design-system/empty-state"
import { LoadingState } from "@/design-system/loading-state"
import { ErrorState } from "@/design-system/error-state"
import { ApiError } from "@/lib/api-client"
import { ROLE_NAMES } from "@soccer-academy/shared-types"
import { useAuth } from "@/app/auth-context"
import { useCreateTrainingSession, useTrainingSessions, useTrainingTeams, type TrainingSession } from "./training-api"
import { COACH_NAV_ITEMS } from "@/features/dashboard-coach/coach-dashboard"
import { RECEPTIONIST_NAV_ITEMS } from "@/features/dashboard-receptionist/receptionist-dashboard"

function CardIcon({ icon: Icon }: { icon: typeof ClipboardList }) {
  return (
    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-accent-foreground">
      <Icon className="size-4.5" aria-hidden />
    </div>
  )
}

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
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (session: TrainingSession) => void
}) {
  const { data: teams } = useTrainingTeams()
  const createSession = useCreateTrainingSession()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateSessionFormValues>({
    resolver: zodResolver(createSessionSchema),
    defaultValues: { location: "Makers House Astroturf" },
  })

  // A coach with exactly one assigned team never has to pick — it's selected for them.
  // With more than one (or none assigned, which falls back to every academy team) they
  // still choose from the dropdown below.
  useEffect(() => {
    if (open && teams?.length === 1) {
      setValue("teamId", teams[0].id, { shouldValidate: true })
    }
  }, [open, teams, setValue])

  const onSubmit = async (values: CreateSessionFormValues) => {
    setServerError(null)
    try {
      const session = await createSession.mutateAsync({
        teamId: values.teamId,
        date: values.date,
        startTime: values.startTime || undefined,
        endTime: values.endTime || undefined,
        location: values.location || undefined,
      })
      reset()
      onOpenChange(false)
      onCreated(session)
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
            For a makeup session or any date outside the usual Saturday fixture.
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
            {errors.teamId ? (
              <p className="text-xs text-destructive">{errors.teamId.message}</p>
            ) : teams && teams.length > 1 ? (
              <p className="text-xs text-muted-foreground">Select which team this session is for.</p>
            ) : null}
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

function SessionRow({ session, basePath }: { session: TrainingSession; basePath: string }) {
  const navigate = useNavigate()
  return (
    <button
      type="button"
      onClick={() => navigate(`${basePath}/${session.id}`)}
      className="flex w-full items-center justify-between gap-3 rounded-lg border border-border p-3 text-left transition-colors hover:border-primary/30 hover:bg-muted/40"
    >
      <div>
        <p className="text-sm font-medium">{session.trainingGroup?.name ?? session.team.name}</p>
        <p className="text-xs text-muted-foreground">
          {formatDate(session.date)} · {session.startTime ?? "Time TBC"}
          {session.endTime ? `–${session.endTime}` : ""} ·{" "}
          {session.attendance.filter((a) => a.status === "PRESENT").length} present
        </p>
      </div>
      <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
    </button>
  )
}

export function TrainingSessionListPage() {
  const navigate = useNavigate()
  const { hasRole } = useAuth()
  const isReceptionist = hasRole(ROLE_NAMES.RECEPTIONIST) && !hasRole(ROLE_NAMES.COACH)
  const basePath = isReceptionist ? "/receptionist/training-sessions" : "/coach/training-sessions"
  const { data: sessions, isLoading: sessionsLoading, isError, refetch } = useTrainingSessions()
  const [createSessionOpen, setCreateSessionOpen] = useState(false)

  const upcomingSessions = (sessions ?? [])
    .filter((s) => !isPastDate(s.date))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  const pastSessions = (sessions ?? [])
    .filter((s) => isPastDate(s.date))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return (
    <DashboardLayout
      title="Training Attendance"
      navItems={isReceptionist ? RECEPTIONIST_NAV_ITEMS : COACH_NAV_ITEMS}
    >
      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <CardIcon icon={ClipboardList} />
            <div>
              <CardTitle>Sessions</CardTitle>
              <CardDescription>
                Open a team's full roster to set session activities, record exceptions, assess players, or add
                notes.
              </CardDescription>
            </div>
          </div>
          {isReceptionist ? null : (
            <Button size="sm" variant="outline" onClick={() => setCreateSessionOpen(true)}>
              <CalendarPlus /> Create Session
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="upcoming">
            <TabsList>
              <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>

            <TabsContent value="upcoming" className="space-y-2 pt-2">
              {sessionsLoading ? (
                <LoadingState rows={2} />
              ) : isError ? (
                <ErrorState onRetry={() => void refetch()} />
              ) : upcomingSessions.length === 0 ? (
                <EmptyState
                  title="No upcoming sessions"
                  description={
                    isReceptionist
                      ? "Nothing scheduled yet."
                      : "The Saturday fixture auto-schedules itself. Use Create Session for a makeup session or a different day."
                  }
                />
              ) : (
                upcomingSessions.map((session) => (
                  <SessionRow key={session.id} session={session} basePath={basePath} />
                ))
              )}
            </TabsContent>

            <TabsContent value="history" className="space-y-2 pt-2">
              {sessionsLoading ? (
                <LoadingState rows={2} />
              ) : isError ? (
                <ErrorState onRetry={() => void refetch()} />
              ) : pastSessions.length === 0 ? (
                <EmptyState title="No past sessions" description="Sessions move here once their date has passed." />
              ) : (
                pastSessions.map((session) => <SessionRow key={session.id} session={session} basePath={basePath} />)
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {isReceptionist ? null : (
        <CreateSessionDialog
          open={createSessionOpen}
          onOpenChange={setCreateSessionOpen}
          onCreated={(session) => navigate(`${basePath}/${session.id}`)}
        />
      )}
    </DashboardLayout>
  )
}
