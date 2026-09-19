import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { ArrowLeft, ArrowRight, Check, Dumbbell, MessageSquarePlus, Plus, Search, Star, X } from "lucide-react"
import { toast } from "sonner"

import { DashboardLayout } from "@/app/dashboard-layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Dialog } from "@/components/ui/dialog"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { EmptyState } from "@/design-system/empty-state"
import { LoadingState } from "@/design-system/loading-state"
import { ErrorState } from "@/design-system/error-state"
import { ApiError } from "@/lib/api-client"
import { formatDate, isPastDate } from "@/lib/date"
import { PlayerPhoto } from "@/features/players/player-photo"
import { RemarkDialog, type AssessablePlayer } from "./player-assessment-dialogs"
import { usePlayerAssessments } from "./assessments-api"
import {
  useAddSessionActivity,
  useRemoveSessionActivity,
  useTrainingSession,
  useTrainingSessions,
  type SessionWithRoster,
} from "@/features/training/training-api"
import { COACH_NAV_ITEMS } from "@/features/dashboard-coach/coach-dashboard"

const sessionActivitySchema = z.object({
  name: z.string().min(1, "Name is required"),
})
type SessionActivityFormValues = z.infer<typeof sessionActivitySchema>

// Session activities live here (rather than on the Attendance page) because they're
// specifically what players get rated against when assessed — this is the screen coaches
// are already on right before picking a player to assess.
function SessionActivitiesCard({ session }: { session: SessionWithRoster }) {
  const addActivity = useAddSessionActivity(session.id)
  const removeActivity = useRemoveSessionActivity(session.id)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SessionActivityFormValues>({ resolver: zodResolver(sessionActivitySchema) })

  const onAdd = async (values: SessionActivityFormValues) => {
    try {
      await addActivity.mutateAsync(values)
      reset()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not add activity.")
    }
  }

  const onRemove = async (activityId: string) => {
    try {
      await removeActivity.mutateAsync(activityId)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not remove activity.")
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
      </CardContent>
    </Card>
  )
}

function PresentPlayerRow({
  attendance,
  index,
  sessionId,
  onAssess,
  onNote,
}: {
  attendance: SessionWithRoster["attendance"][number]
  index: number
  sessionId: string
  onAssess: () => void
  onNote: () => void
}) {
  const player = attendance.player
  const { data: assessments } = usePlayerAssessments(player.id)
  const isAssessed = assessments?.some((a) => a.trainingSessionId === sessionId) ?? false

  return (
    <TableRow>
      <TableCell className="text-muted-foreground">{index + 1}</TableCell>
      <TableCell>
        <div className="flex items-center gap-2.5">
          <PlayerPhoto playerId={player.id} photoDocumentId={player.photoDocumentId} size={40} />
          <span className="font-medium">
            {player.firstName} {player.lastName}
          </span>
        </div>
      </TableCell>
      <TableCell className="font-mono text-xs text-muted-foreground">{player.playerCode ?? "—"}</TableCell>
      <TableCell>
        {isAssessed ? (
          <Badge variant="success">
            <Check /> Assessed
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">Not assessed</span>
        )}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onAssess}>
            <Star /> {isAssessed ? "Re-assess" : "Assess"}
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Add note for ${player.firstName} ${player.lastName}`}
            onClick={onNote}
          >
            <MessageSquarePlus />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}

export function CoachAssessmentsPage() {
  const navigate = useNavigate()
  const { data: sessions, isLoading: sessionsLoading, isError, refetch } = useTrainingSessions()
  const [selectedSessionId, setSelectedSessionId] = useState<string | undefined>(undefined)
  const { data: selectedSession, isLoading: sessionLoading } = useTrainingSession(selectedSessionId)
  const [playerSearch, setPlayerSearch] = useState("")
  const [notingPlayer, setNotingPlayer] = useState<AssessablePlayer | null>(null)

  const activeSessions = (sessions ?? [])
    .filter((s) => !isPastDate(s.date))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  const presentPlayers = (selectedSession?.attendance ?? [])
    .filter((a) => a.status === "PRESENT")
    .filter((a) => {
      const q = playerSearch.trim().toLowerCase()
      if (!q) return true
      return (
        `${a.player.firstName} ${a.player.lastName}`.toLowerCase().includes(q) ||
        (a.player.playerCode ?? "").toLowerCase().includes(q)
      )
    })

  return (
    <DashboardLayout title="Assessments" navItems={COACH_NAV_ITEMS}>
      {!selectedSessionId ? (
        <Card>
          <CardHeader>
            <CardTitle>Select a session</CardTitle>
            <CardDescription>Choose the active session to see who's present and rate them.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {sessionsLoading ? (
              <LoadingState rows={2} />
            ) : isError ? (
              <ErrorState onRetry={() => void refetch()} />
            ) : activeSessions.length === 0 ? (
              <EmptyState
                title="No active sessions"
                description="Check Attendance to open this week's session or create one."
              />
            ) : (
              activeSessions.map((session) => (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => setSelectedSessionId(session.id)}
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
              ))
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <Button variant="ghost" size="sm" className="mb-4" onClick={() => setSelectedSessionId(undefined)}>
            <ArrowLeft /> Change session
          </Button>
          {selectedSession ? <div className="mb-4"><SessionActivitiesCard session={selectedSession} /></div> : null}
          <Card>
            <CardHeader>
              <CardTitle>
                {selectedSession ? `${selectedSession.team.name} · ${formatDate(selectedSession.date)}` : "Session"}
              </CardTitle>
              <CardDescription>Present players — select one to rate them against this session's activities.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search present players by name or ID"
                  className="pl-9"
                  value={playerSearch}
                  onChange={(e) => setPlayerSearch(e.target.value)}
                  autoFocus
                />
              </div>

              {sessionLoading ? (
                <LoadingState rows={3} />
              ) : presentPlayers.length === 0 ? (
                <EmptyState
                  title={playerSearch ? "No players match" : "No one marked present yet"}
                  description={
                    playerSearch
                      ? "Try a different search."
                      : "Mark attendance for this session from the Attendance page first."
                  }
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Player</TableHead>
                      <TableHead>Player ID</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {presentPlayers.map((a, index) => (
                      <PresentPlayerRow
                        key={a.id}
                        attendance={a}
                        index={index}
                        sessionId={selectedSessionId as string}
                        onAssess={() => navigate(`/coach/players/${a.player.id}/assess?sessionId=${selectedSessionId}`)}
                        onNote={() => setNotingPlayer(a.player)}
                      />
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <Dialog open={!!notingPlayer} onOpenChange={(o) => !o && setNotingPlayer(null)}>
        {notingPlayer ? <RemarkDialog player={notingPlayer} onClose={() => setNotingPlayer(null)} /> : null}
      </Dialog>
    </DashboardLayout>
  )
}
