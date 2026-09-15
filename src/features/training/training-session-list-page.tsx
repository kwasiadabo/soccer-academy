import { formatDate, formatTime, isSameDay } from "@/lib/date"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useNavigate } from "react-router-dom"
import { CalendarClock, Check, ClipboardCheck, Pencil, Search, UserSearch, type LucideIcon } from "lucide-react"

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
import { ROLE_NAMES } from "@/lib/shared-types"
import { useAuth } from "@/app/auth-context"
import { usePlayers, type Player } from "@/features/players/players-api"
import { PlayerPhoto } from "@/features/players/player-photo"
import {
  useQuickMarkAttendance,
  useTrainingSchedule,
  useTrainingSessions,
  useTrainingTeams,
  useUpdateTrainingSchedule,
  WEEKDAY_NAMES,
  type AttendanceStatus,
  type TrainingSession,
} from "./training-api"
import { COACH_NAV_ITEMS } from "@/features/dashboard-coach/coach-dashboard"
import { RECEPTIONIST_NAV_ITEMS } from "@/features/dashboard-receptionist/receptionist-dashboard"
import { HEAD_COACH_NAV_ITEMS } from "@/features/dashboard-head-coach/head-coach-dashboard"

const QUICK_MARK_EXCEPTION_OPTIONS: AttendanceStatus[] = ["ABSENT", "LATE", "EXCUSED", "INJURED"]
const MARKED_STATUS_FILTER_OPTIONS: AttendanceStatus[] = ["PRESENT", "ABSENT", "LATE", "EXCUSED", "INJURED"]

interface MarkedPlayerRow {
  id: string
  player: { id: string; firstName: string; lastName: string; playerCode: string | null; photoDocumentId: string | null }
  status: AttendanceStatus
  teamName: string
  sessionId: string
  sessionDate: string
  recordedAt: string
  recordedByUser: { firstName: string; lastName: string }
}

// Flattens every loaded session's attendance into one player-level list instead of requiring
// staff to open each team's session individually. `sessions` is already scoped server-side —
// a plain Coach only ever gets their own assigned team(s)/group(s), while Head Coach/Reception
// get every team — so this naturally inherits the right scope with no team filter/grouping of
// its own: same table, same code, correct for every role.
function buildMarkedPlayerRows(sessions: TrainingSession[]): MarkedPlayerRow[] {
  return sessions
    .flatMap((session) =>
      session.attendance.map((a) => ({
        id: a.id,
        player: a.player,
        status: a.status,
        teamName: session.trainingGroup?.name ?? session.team.name,
        sessionId: session.id,
        sessionDate: session.date,
        recordedAt: a.recordedAt,
        recordedByUser: a.recordedByUser,
      })),
    )
    .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())
}

const scheduleSchema = z.object({
  dayOfWeek: z.coerce.number().min(0).max(6),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  location: z.string().optional(),
})
type ScheduleFormValues = z.input<typeof scheduleSchema>
type ScheduleFormOutput = z.output<typeof scheduleSchema>

// Head Coach-only: lets them change the academy's recurring weekly training fixture
// (e.g. move it from Saturday to Sunday, or change its time/venue) instead of it being
// fixed forever at whatever an admin set up initially.
function WeeklyScheduleCard() {
  const { data: schedule, isLoading } = useTrainingSchedule()
  const updateSchedule = useUpdateTrainingSchedule()
  const [editOpen, setEditOpen] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ScheduleFormValues, unknown, ScheduleFormOutput>({ resolver: zodResolver(scheduleSchema) })

  useEffect(() => {
    if (editOpen && schedule) {
      reset({
        dayOfWeek: schedule.dayOfWeek,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        location: schedule.location ?? "",
      })
    }
  }, [editOpen, schedule, reset])

  const onSubmit = async (values: ScheduleFormOutput) => {
    setServerError(null)
    try {
      await updateSchedule.mutateAsync({
        dayOfWeek: values.dayOfWeek,
        startTime: values.startTime,
        endTime: values.endTime,
        location: values.location || undefined,
      })
      setEditOpen(false)
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : "Could not update the schedule.")
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <CardIcon icon={CalendarClock} />
          <div>
            <CardTitle>Weekly Training Schedule</CardTitle>
            <CardDescription>
              {isLoading || !schedule ? (
                "Loading…"
              ) : (
                <>
                  Every <span className="font-medium text-foreground">{WEEKDAY_NAMES[schedule.dayOfWeek]}</span>,{" "}
                  {schedule.startTime}–{schedule.endTime}
                  {schedule.location ? ` at ${schedule.location}` : ""} — sessions auto-schedule for every team.
                </>
              )}
            </CardDescription>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={() => setEditOpen(true)} disabled={!schedule}>
          <Pencil /> Edit
        </Button>
      </CardHeader>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <div className="mb-1 flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <CalendarClock className="size-4.5" />
            </div>
            <DialogTitle>Edit weekly training schedule</DialogTitle>
            <DialogDescription>
              This changes the recurring fixture for every team academy-wide, e.g. "every Saturday."
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="schedule-day">Day of week</Label>
              <Select id="schedule-day" {...register("dayOfWeek")}>
                {WEEKDAY_NAMES.map((name, value) => (
                  <option key={value} value={value}>
                    {name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="schedule-start">Start time</Label>
                <Input id="schedule-start" type="time" {...register("startTime")} />
                {errors.startTime ? <p className="text-xs text-destructive">{errors.startTime.message}</p> : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="schedule-end">End time</Label>
                <Input id="schedule-end" type="time" {...register("endTime")} />
                {errors.endTime ? <p className="text-xs text-destructive">{errors.endTime.message}</p> : null}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="schedule-location">Location</Label>
              <Input id="schedule-location" {...register("location")} />
            </div>
            {serverError ? <p className="text-sm text-destructive">{serverError}</p> : null}
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving…" : "Save schedule"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

function CardIcon({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-accent-foreground">
      <Icon className="size-4.5" aria-hidden />
    </div>
  )
}

function LiveClock() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <p className="text-xs font-medium text-foreground">
      {formatDate(now)} · {formatTime(now)}
    </p>
  )
}

function QuickMarkRow({ player }: { player: Player }) {
  const quickMark = useQuickMarkAttendance()
  const [error, setError] = useState<string | null>(null)
  const [markedStatus, setMarkedStatus] = useState<AttendanceStatus | null>(null)

  const mark = async (status: AttendanceStatus) => {
    setError(null)
    try {
      await quickMark.mutateAsync({ playerId: player.id, status })
      setMarkedStatus(status)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not mark attendance.")
    }
  }

  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <PlayerPhoto playerId={player.id} photoDocumentId={player.photoDocumentId} size={40} />
          <div>
            <p className="text-sm font-medium">
              {player.firstName} {player.lastName}
            </p>
            <p className="text-xs text-muted-foreground">
              {player.playerCode ?? "No ID"} · {player.team?.name ?? "No team assigned"}
            </p>
          </div>
        </div>
        {markedStatus ? (
          <span className="text-sm font-medium text-success">Marked {markedStatus}</span>
        ) : (
          <div className="flex items-center gap-2">
            <Button size="sm" disabled={quickMark.isPending} onClick={() => void mark("PRESENT")}>
              <Check /> {quickMark.isPending ? "Marking…" : "Present"}
            </Button>
            <Select className="h-9 w-32" value="" onChange={(e) => void mark(e.target.value as AttendanceStatus)}>
              <option value="" disabled>
                Other
              </option>
              {QUICK_MARK_EXCEPTION_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </Select>
          </div>
        )}
      </div>
      {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
    </div>
  )
}

// Head Coach and Reception oversee every team, so their search spans the whole academy
// roster. A plain Coach's search is restricted to their own assigned team(s)/group(s) —
// useTrainingTeams already scopes the picker itself for them, and passing teamId through to
// usePlayers scopes the results too (belt-and-suspenders alongside the server-side player
// search, which also enforces this). Either way the player's own session is resolved
// automatically, no need to open it first.
function QuickMarkAttendanceDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [search, setSearch] = useState("")
  const [teamId, setTeamId] = useState("")
  const { data: teams } = useTrainingTeams(open)
  const { data: players, isLoading } = usePlayers({
    status: "ACTIVE",
    search: search.trim() || undefined,
    teamId: teamId || undefined,
  })

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o)
        if (!o) {
          setSearch("")
          setTeamId("")
        }
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="mb-1 flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <UserSearch className="size-4.5" />
          </div>
          <DialogTitle>Quick Mark Attendance</DialogTitle>
          <DialogDescription>
            Search a player — their own team's session is resolved automatically, no need to open it first.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name or player ID"
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>
          {teams && teams.length > 1 ? (
            <Select value={teamId} onChange={(e) => setTeamId(e.target.value)} className="sm:w-44">
              <option value="">All my teams</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          ) : null}
        </div>
        <div className="max-h-96 space-y-2 overflow-y-auto">
          {isLoading ? (
            <LoadingState rows={3} />
          ) : !players || players.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {search.trim() ? `No players match "${search}".` : "Start typing to search for a player."}
            </p>
          ) : (
            players.map((player) => <QuickMarkRow key={player.id} player={player} />)
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function TrainingSessionListPage() {
  const navigate = useNavigate()
  const { hasRole } = useAuth()
  const isReceptionist = hasRole(ROLE_NAMES.RECEPTIONIST) && !hasRole(ROLE_NAMES.COACH)
  const isHeadCoach = hasRole(ROLE_NAMES.HEAD_COACH) && !hasRole(ROLE_NAMES.COACH)
  const basePath = isReceptionist
    ? "/receptionist/training-sessions"
    : isHeadCoach
      ? "/head-coach/training-sessions"
      : "/coach/training-sessions"
  const { data: sessions, isLoading: sessionsLoading, isError, refetch } = useTrainingSessions()
  const [quickMarkOpen, setQuickMarkOpen] = useState(false)
  const [markedSearch, setMarkedSearch] = useState("")
  const [markedStatusFilter, setMarkedStatusFilter] = useState("")

  const markedPlayers = buildMarkedPlayerRows(sessions ?? [])
    .filter((row) => isSameDay(row.recordedAt, new Date()))
    .filter((row) => !markedStatusFilter || row.status === markedStatusFilter)
    .filter((row) => {
      const q = markedSearch.trim().toLowerCase()
      if (!q) return true
      return (
        `${row.player.firstName} ${row.player.lastName}`.toLowerCase().includes(q) ||
        (row.player.playerCode ?? "").toLowerCase().includes(q) ||
        row.teamName.toLowerCase().includes(q)
      )
    })

  return (
    <DashboardLayout
      title="Training Attendance"
      navItems={isReceptionist ? RECEPTIONIST_NAV_ITEMS : isHeadCoach ? HEAD_COACH_NAV_ITEMS : COACH_NAV_ITEMS}
    >
      <div className="space-y-4">
        {isHeadCoach ? <WeeklyScheduleCard /> : null}

        <Card>
          <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <CardIcon icon={ClipboardCheck} />
              <div>
                <CardTitle>Marked Players</CardTitle>
                <CardDescription>
                  {isReceptionist || isHeadCoach
                    ? "Everyone marked today, across every team — not filtered or grouped by team."
                    : "Everyone marked today, across your sessions."}
                </CardDescription>
                <LiveClock />
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => setQuickMarkOpen(true)}>
              <UserSearch /> Quick Mark Attendance
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name, player ID, or team"
                  className="pl-9"
                  value={markedSearch}
                  onChange={(e) => setMarkedSearch(e.target.value)}
                />
              </div>
              <Select value={markedStatusFilter} onChange={(e) => setMarkedStatusFilter(e.target.value)} className="sm:w-44">
                <option value="">All statuses</option>
                {MARKED_STATUS_FILTER_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </Select>
            </div>

            {sessionsLoading ? (
              <LoadingState rows={3} />
            ) : isError ? (
              <ErrorState onRetry={() => void refetch()} />
            ) : markedPlayers.length === 0 ? (
              <EmptyState
                title="No one marked yet"
                description={
                  markedSearch || markedStatusFilter
                    ? "Try a different search or filter."
                    : "Marked players will appear here once attendance is recorded."
                }
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Player</TableHead>
                    <TableHead>Player ID</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Time Marked</TableHead>
                    <TableHead>Marked by</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {markedPlayers.map((row, index) => (
                    <TableRow
                      key={row.id}
                      className="cursor-pointer"
                      onClick={() => navigate(`${basePath}/${row.sessionId}`)}
                    >
                      <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <PlayerPhoto playerId={row.player.id} photoDocumentId={row.player.photoDocumentId} size={40} />
                          <span className="font-medium">
                            {row.player.firstName} {row.player.lastName}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {row.player.playerCode ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{row.teamName}</TableCell>
                      <TableCell>
                        <StatusBadge status={row.status} />
                      </TableCell>
                      <TableCell className="tabular-nums">{formatTime(row.recordedAt)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {row.recordedByUser.firstName} {row.recordedByUser.lastName}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <QuickMarkAttendanceDialog open={quickMarkOpen} onOpenChange={setQuickMarkOpen} />
    </DashboardLayout>
  )
}
