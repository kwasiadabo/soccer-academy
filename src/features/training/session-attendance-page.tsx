import { formatDate, formatTime, isPastDate, isWithinCurrentTrainingWeek } from "@/lib/date"
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
  MessageSquarePlus,
  Search,
  UserCheck,
  UserPlus,
  Users,
  UserX,
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
import { ROLE_NAMES } from "@/lib/shared-types"
import { useAuth } from "@/app/auth-context"
import { COACH_NAV_ITEMS } from "@/features/dashboard-coach/coach-dashboard"
import { RECEPTIONIST_NAV_ITEMS } from "@/features/dashboard-receptionist/receptionist-dashboard"
import { HEAD_COACH_NAV_ITEMS } from "@/features/dashboard-head-coach/head-coach-dashboard"
import { PlayerPhoto } from "@/features/players/player-photo"
import { RemarkDialog, type AssessablePlayer } from "@/features/assessments/player-assessment-dialogs"
import {
  useRecordAttendance,
  useTrainingSchedule,
  useTrainingSession,
  type AttendanceStatus,
  type SessionWithRoster,
} from "./training-api"

const EXCEPTION_OPTIONS: AttendanceStatus[] = ["ABSENT", "LATE", "EXCUSED", "INJURED"]
const STATUS_FILTER_OPTIONS: AttendanceStatus[] = ["PRESENT", "ABSENT", "LATE", "EXCUSED", "INJURED"]

type RosterPlayer = SessionWithRoster["roster"][number]

// A roster player nobody has explicitly marked is assumed absent rather than left blank —
// this synthesizes that assumption as a displayable row (id prefixed so it never collides
// with a real TrainingAttendance id) without writing anything until it's actually edited.
interface DisplayAttendanceRow {
  id: string
  player: RosterPlayer
  status: AttendanceStatus
  recordedAt: string | null
  recordedByUser: { firstName: string; lastName: string } | null
  isAssumed: boolean
}

function buildDisplayRows(session: SessionWithRoster): DisplayAttendanceRow[] {
  const byPlayerId = new Map(session.attendance.map((a) => [a.playerId, a]))
  return session.roster.map((player) => {
    const recorded = byPlayerId.get(player.id)
    if (recorded) {
      return {
        id: recorded.id,
        player,
        status: recorded.status,
        recordedAt: recorded.recordedAt,
        recordedByUser: recorded.recordedByUser,
        isAssumed: false,
      }
    }
    return {
      id: `assumed-${player.id}`,
      player,
      status: "ABSENT",
      recordedAt: null,
      recordedByUser: null,
      isAssumed: true,
    }
  })
}

// Lets staff correct any row inline — including one that's only an assumed-absent default,
// which turns it into a real recorded attendance entry the moment it's changed.
function AttendanceStatusCell({
  sessionId,
  playerId,
  status,
  isAssumed,
  disabled,
}: {
  sessionId: string
  playerId: string
  status: AttendanceStatus
  isAssumed: boolean
  disabled: boolean
}) {
  const recordAttendance = useRecordAttendance(sessionId)
  const [error, setError] = useState<string | null>(null)

  const onChange = async (next: AttendanceStatus) => {
    if (next === status) return
    setError(null)
    try {
      await recordAttendance.mutateAsync([{ playerId, status: next }])
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update attendance.")
    }
  }

  if (disabled) {
    return <StatusBadge status={status} />
  }

  return (
    <div className="space-y-1">
      <Select
        value={status}
        disabled={recordAttendance.isPending}
        onChange={(e) => void onChange(e.target.value as AttendanceStatus)}
        className="h-8 w-36"
      >
        {STATUS_FILTER_OPTIONS.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </Select>
      {isAssumed ? <p className="text-[11px] text-muted-foreground">Assumed — not confirmed</p> : null}
      {error ? <p className="text-[11px] text-destructive">{error}</p> : null}
    </div>
  )
}

function UnmarkedRow({
  player,
  sessionId,
  restricted,
  onNote,
}: {
  player: RosterPlayer
  sessionId: string
  restricted: boolean
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
          {restricted ? null : (
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
  restricted,
  onNote,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  session: SessionWithRoster
  restricted: boolean
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
                    restricted={restricted}
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
  const isHeadCoach = hasRole(ROLE_NAMES.HEAD_COACH) && !hasRole(ROLE_NAMES.COACH)
  // Reception and the Head Coach only record attendance for sessions a Coach has already
  // scheduled — same restricted view (no assessment notes).
  const restricted = isReceptionist || isHeadCoach
  const basePath = isReceptionist
    ? "/receptionist/training-sessions"
    : isHeadCoach
      ? "/head-coach/training-sessions"
      : "/coach/training-sessions"
  const { data: session, isLoading, isError, refetch } = useTrainingSession(sessionId)
  const { data: schedule } = useTrainingSchedule()
  // A session stays open for marking/correcting attendance for the rest of its training week
  // even once its exact date has passed — e.g. the default Saturday session is still editable
  // on the following Monday — only locking as historical once a new training week begins.
  const isHistorical = session
    ? isPastDate(session.date) && !isWithinCurrentTrainingWeek(session.date, schedule?.dayOfWeek ?? 6)
    : false
  const [tableSearch, setTableSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [markModalOpen, setMarkModalOpen] = useState(false)
  const [notingPlayer, setNotingPlayer] = useState<AssessablePlayer | null>(null)

  const displayRows = session ? buildDisplayRows(session) : []
  const filteredAttendance = displayRows
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
    <DashboardLayout
      title="Take Attendance"
      navItems={isReceptionist ? RECEPTIONIST_NAV_ITEMS : isHeadCoach ? HEAD_COACH_NAV_ITEMS : COACH_NAV_ITEMS}
    >
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

          <Card>
          <CardHeader>
            <CardTitle className="text-base">Attendance</CardTitle>
            <CardDescription>
              Anyone not explicitly marked is assumed absent — search, filter, or edit any row below to correct it.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search players by name or ID"
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

            {filteredAttendance.length === 0 ? (
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
                  {filteredAttendance.map((row, index) => (
                    <TableRow key={row.id}>
                      <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <PlayerPhoto
                            playerId={row.player.id}
                            photoDocumentId={row.player.photoDocumentId}
                            size={40}
                          />
                          <span className="font-medium">
                            {row.player.firstName} {row.player.lastName}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {row.player.playerCode ?? "—"}
                      </TableCell>
                      <TableCell>
                        <AttendanceStatusCell
                          sessionId={session.id}
                          playerId={row.player.id}
                          status={row.status}
                          isAssumed={row.isAssumed}
                          disabled={isHistorical}
                        />
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {row.recordedAt ? formatTime(row.recordedAt) : "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {row.recordedByUser ? `${row.recordedByUser.firstName} ${row.recordedByUser.lastName}` : "—"}
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
          restricted={restricted}
          onNote={setNotingPlayer}
        />
      ) : null}

      <Dialog open={!!notingPlayer} onOpenChange={(o) => !o && setNotingPlayer(null)}>
        {notingPlayer ? <RemarkDialog player={notingPlayer} onClose={() => setNotingPlayer(null)} /> : null}
      </Dialog>
    </DashboardLayout>
  )
}
