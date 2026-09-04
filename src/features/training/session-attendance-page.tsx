import { formatDate, formatTime, isPastDate } from "@/lib/date"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useNavigate, useParams } from "react-router-dom"
import {
  ArrowLeft,
  Check,
  CheckCheck,
  ClipboardCheck,
  Clock,
  Dumbbell,
  MessageSquarePlus,
  Plus,
  Search,
  UserCheck,
  UserPlus,
  Users,
  UserX,
  X,
} from "lucide-react"

import { DashboardLayout } from "@/app/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { EmptyState } from "@/design-system/empty-state"
import { LoadingState } from "@/design-system/loading-state"
import { ErrorState } from "@/design-system/error-state"
import { StatCard } from "@/design-system/stat-card"
import { StatusBadge } from "@/design-system/status-badge"
import { ApiError } from "@/lib/api-client"
import { ROLE_NAMES } from "@soccer-academy/shared-types"
import { useAuth } from "@/app/auth-context"
import { COACH_NAV_ITEMS } from "@/features/dashboard-coach/coach-dashboard"
import { RECEPTIONIST_NAV_ITEMS } from "@/features/dashboard-receptionist/receptionist-dashboard"
import { PlayerPhoto } from "@/features/players/player-photo"
import { RemarkDialog, type AssessablePlayer } from "@/features/assessments/player-assessment-dialogs"
import {
  useAddSessionActivity,
  useRecordAttendance,
  useRemoveSessionActivity,
  useTrainingSession,
  type AttendanceStatus,
  type SessionWithRoster,
} from "./training-api"

const sessionActivitySchema = z.object({
  name: z.string().min(1, "Name is required"),
})
type SessionActivityFormValues = z.infer<typeof sessionActivitySchema>

function SessionActivitiesCard({ session, isHistorical }: { session: SessionWithRoster; isHistorical: boolean }) {
  const addActivity = useAddSessionActivity(session.id)
  const removeActivity = useRemoveSessionActivity(session.id)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SessionActivityFormValues>({ resolver: zodResolver(sessionActivitySchema) })

  const onAdd = async (values: SessionActivityFormValues) => {
    setError(null)
    try {
      await addActivity.mutateAsync(values)
      reset()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not add activity.")
    }
  }

  const onRemove = async (activityId: string) => {
    setError(null)
    try {
      await removeActivity.mutateAsync(activityId)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not remove activity.")
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-3 space-y-0">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-chart-3/10 text-chart-3">
          <Dumbbell className="size-4.5" />
        </div>
        <div>
          <CardTitle className="text-base">Session Activities</CardTitle>
          <CardDescription>
            Set the activities for this session — players are rated against these when assessed.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {session.sessionActivities.length === 0 ? (
          <p className="text-sm text-muted-foreground">No activities added yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {session.sessionActivities.map((activity) => (
              <span
                key={activity.id}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 py-1 pr-1.5 pl-3 text-sm"
              >
                {activity.name}
                <button
                  type="button"
                  aria-label={`Remove ${activity.name}`}
                  onClick={() => void onRemove(activity.id)}
                  className="rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <X className="size-3.5" />
                </button>
              </span>
            ))}
          </div>
        )}

        {isHistorical ? null : (
          <form className="flex items-end gap-2 pt-1" onSubmit={handleSubmit(onAdd)} noValidate>
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="session-activity-name">Activity name</Label>
              <Input id="session-activity-name" placeholder="Passing" {...register("name")} />
              {errors.name ? <p className="text-xs text-destructive">{errors.name.message}</p> : null}
            </div>
            <Button type="submit" variant="outline" disabled={isSubmitting}>
              <Plus /> Add
            </Button>
          </form>
        )}
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </CardContent>
    </Card>
  )
}

const EXCEPTION_OPTIONS: AttendanceStatus[] = ["ABSENT", "LATE", "EXCUSED", "INJURED"]
const STATUS_FILTER_OPTIONS: AttendanceStatus[] = ["PRESENT", "ABSENT", "LATE", "EXCUSED", "INJURED"]

type RosterPlayer = SessionWithRoster["roster"][number]

function UnmarkedRow({
  player,
  sessionId,
  isReceptionist,
  onNote,
}: {
  player: RosterPlayer
  sessionId: string
  isReceptionist: boolean
  onNote: () => void
}) {
  const recordAttendance = useRecordAttendance(sessionId)
  const [error, setError] = useState<string | null>(null)

  const mark = async (status: AttendanceStatus) => {
    setError(null)
    try {
      await recordAttendance.mutateAsync([{ playerId: player.id, status }])
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save attendance.")
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
            <p className="text-xs text-muted-foreground">{player.playerCode ?? "Not yet marked"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="lg" className="h-11" disabled={recordAttendance.isPending} onClick={() => void mark("PRESENT")}>
            <Check /> {recordAttendance.isPending ? "Marking…" : "Mark present"}
          </Button>
          <Select className="h-11 w-36" value="" onChange={(e) => void mark(e.target.value as AttendanceStatus)}>
            <option value="" disabled>
              Other status
            </option>
            {EXCEPTION_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </Select>
          {isReceptionist ? null : (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Add note for ${player.firstName} ${player.lastName}`}
              onClick={onNote}
            >
              <MessageSquarePlus />
            </Button>
          )}
        </div>
      </div>
      {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
    </div>
  )
}

function MarkAttendanceModal({
  open,
  onOpenChange,
  session,
  isReceptionist,
  onNote,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  session: SessionWithRoster
  isReceptionist: boolean
  onNote: (player: AssessablePlayer) => void
}) {
  const [search, setSearch] = useState("")
  const recordAttendance = useRecordAttendance(session.id)
  const [bulkError, setBulkError] = useState<string | null>(null)

  const unmarkedPlayers = session.roster.filter(
    (player) => !session.attendance.some((a) => a.playerId === player.id),
  )
  const filteredUnmarked = unmarkedPlayers.filter((player) =>
    `${player.firstName} ${player.lastName}`.toLowerCase().includes(search.trim().toLowerCase()),
  )

  const markAllPresent = async () => {
    if (unmarkedPlayers.length === 0) return
    setBulkError(null)
    try {
      await recordAttendance.mutateAsync(
        unmarkedPlayers.map((player) => ({ playerId: player.id, status: "PRESENT" as const })),
      )
    } catch (err) {
      setBulkError(err instanceof ApiError ? err.message : "Could not mark all present.")
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o)
        if (!o) setSearch("")
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader className="flex-row items-start justify-between gap-3 pr-6">
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-success/10 text-success">
              <UserPlus className="size-4.5" />
            </div>
            <div>
              <DialogTitle>Mark Attendance</DialogTitle>
              <DialogDescription>
                Search for a player to mark them present. Players already marked — by a receptionist or a coach —
                can't be re-marked here.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {unmarkedPlayers.length > 0 ? (
          <Button
            variant="secondary"
            size="sm"
            className="w-fit"
            disabled={recordAttendance.isPending}
            onClick={() => void markAllPresent()}
          >
            <CheckCheck />
            {recordAttendance.isPending ? "Marking…" : `Mark all ${unmarkedPlayers.length} remaining present`}
          </Button>
        ) : null}
        {bulkError ? <p className="text-xs text-destructive">{bulkError}</p> : null}

        {unmarkedPlayers.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Everyone on the roster has been marked.</p>
        ) : (
          <>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search for a player"
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />
            </div>
            <div className="max-h-80 space-y-2 overflow-y-auto">
              {filteredUnmarked.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No unmarked players match "{search}".</p>
              ) : (
                filteredUnmarked.map((player) => (
                  <UnmarkedRow
                    key={player.id}
                    player={player}
                    sessionId={session.id}
                    isReceptionist={isReceptionist}
                    onNote={() => onNote(player)}
                  />
                ))
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

export function SessionAttendancePage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const { hasRole } = useAuth()
  const isReceptionist = hasRole(ROLE_NAMES.RECEPTIONIST) && !hasRole(ROLE_NAMES.COACH)
  const basePath = isReceptionist ? "/receptionist/training-sessions" : "/coach/training-sessions"
  const { data: session, isLoading, isError, refetch } = useTrainingSession(sessionId)
  const isHistorical = session ? isPastDate(session.date) : false
  const [tableSearch, setTableSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [markModalOpen, setMarkModalOpen] = useState(false)
  const [notingPlayer, setNotingPlayer] = useState<AssessablePlayer | null>(null)

  const filteredAttendance = (session?.attendance ?? [])
    .filter((a) => !statusFilter || a.status === statusFilter)
    .filter((a) => {
      const q = tableSearch.trim().toLowerCase()
      if (!q) return true
      return (
        `${a.player.firstName} ${a.player.lastName}`.toLowerCase().includes(q) ||
        (a.player.playerCode ?? "").toLowerCase().includes(q)
      )
    })

  const presentCount = session?.attendance.filter((a) => a.status === "PRESENT").length ?? 0
  const lateCount = session?.attendance.filter((a) => a.status === "LATE").length ?? 0
  const notPresentCount = (session?.roster.length ?? 0) - presentCount - lateCount

  return (
    <DashboardLayout title="Take Attendance" navItems={isReceptionist ? RECEPTIONIST_NAV_ITEMS : COACH_NAV_ITEMS}>
      <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate(basePath)}>
        <ArrowLeft /> Back to sessions
      </Button>

      {isLoading ? (
        <LoadingState rows={6} />
      ) : isError || !session ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : session.roster.length === 0 ? (
        <EmptyState title="No roster yet" description="No active players are assigned to this team." />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-success/10 text-success">
                <ClipboardCheck className="size-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">
                  {session.team.name} · {formatDate(session.date)}
                  {session.startTime ? ` · ${session.startTime}–${session.endTime}` : ""}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {session.attendance.length} of {session.roster.length} marked
                  {isHistorical ? " · Past session" : ""}
                </p>
              </div>
            </div>
            {isHistorical ? null : (
              <Button size="lg" onClick={() => setMarkModalOpen(true)}>
                <UserPlus /> Mark Attendance
              </Button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard icon={Users} label="Team size" value={session.roster.length} iconClassName="bg-chart-2/15 text-chart-2" />
            <StatCard icon={UserCheck} label="Present" value={presentCount} iconClassName="bg-success/15 text-success" />
            <StatCard icon={UserX} label="Not present" value={notPresentCount} iconClassName="bg-destructive/15 text-destructive" />
            <StatCard icon={Clock} label="Late" value={lateCount} iconClassName="bg-warning/15 text-warning" />
          </div>

          {isReceptionist ? null : <SessionActivitiesCard session={session} isHistorical={isHistorical} />}
          <Card>
          <CardHeader>
            <CardTitle className="text-base">Marked Players</CardTitle>
            <CardDescription>Search or filter the roster already marked for this session.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search marked players by name or ID"
                  className="pl-9"
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="sm:w-44">
                <option value="">All statuses</option>
                {STATUS_FILTER_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </Select>
            </div>

            {session.attendance.length === 0 ? (
              <EmptyState
                title="No one marked yet"
                description={
                  isHistorical ? "No attendance was recorded for this session." : "Use Mark Attendance above to record arrivals."
                }
              />
            ) : filteredAttendance.length === 0 ? (
              <EmptyState title="No players match" description="Try a different search or filter." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Player</TableHead>
                    <TableHead>Player ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Marked by</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAttendance.map((attendance, index) => (
                    <TableRow key={attendance.id}>
                      <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <PlayerPhoto
                            playerId={attendance.player.id}
                            photoDocumentId={attendance.player.photoDocumentId}
                            size={40}
                          />
                          <span className="font-medium">
                            {attendance.player.firstName} {attendance.player.lastName}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {attendance.player.playerCode ?? "—"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={attendance.status} />
                      </TableCell>
                      <TableCell className="tabular-nums">{formatTime(attendance.recordedAt)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {attendance.recordedByUser.firstName} {attendance.recordedByUser.lastName}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
          </Card>
        </div>
      )}

      {session && !isHistorical ? (
        <MarkAttendanceModal
          open={markModalOpen}
          onOpenChange={setMarkModalOpen}
          session={session}
          isReceptionist={isReceptionist}
          onNote={setNotingPlayer}
        />
      ) : null}

      <Dialog open={!!notingPlayer} onOpenChange={(o) => !o && setNotingPlayer(null)}>
        {notingPlayer ? <RemarkDialog player={notingPlayer} onClose={() => setNotingPlayer(null)} /> : null}
      </Dialog>
    </DashboardLayout>
  )
}
