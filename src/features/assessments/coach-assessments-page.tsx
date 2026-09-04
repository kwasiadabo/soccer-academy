import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft, ArrowRight, Check, MessageSquarePlus, Search, Star } from "lucide-react"

import { DashboardLayout } from "@/app/dashboard-layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Dialog } from "@/components/ui/dialog"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { EmptyState } from "@/design-system/empty-state"
import { LoadingState } from "@/design-system/loading-state"
import { ErrorState } from "@/design-system/error-state"
import { formatDate, isPastDate } from "@/lib/date"
import { PlayerPhoto } from "@/features/players/player-photo"
import { RemarkDialog, type AssessablePlayer } from "./player-assessment-dialogs"
import { usePlayerAssessments } from "./assessments-api"
import { useTrainingSession, useTrainingSessions, type SessionWithRoster } from "@/features/training/training-api"
import { COACH_NAV_ITEMS } from "@/features/dashboard-coach/coach-dashboard"

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
