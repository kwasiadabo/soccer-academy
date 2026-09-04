import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  Activity,
  Award,
  ArrowRight,
  CalendarDays,
  Clock,
  ClipboardList,
  Search,
  Star,
  UserCheck,
  UserX,
  Users,
} from "lucide-react"

import { DashboardLayout } from "@/app/dashboard-layout"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { EmptyState } from "@/design-system/empty-state"
import { LoadingState } from "@/design-system/loading-state"
import { ErrorState } from "@/design-system/error-state"
import { StatCard } from "@/design-system/stat-card"
import { formatDate } from "@/lib/date"
import { PlayerPhoto } from "@/features/players/player-photo"
import { usePlayers } from "@/features/players/players-api"
import { useTrainingSession, useTrainingSessions, useTrainingTeams } from "@/features/training/training-api"
import { useMatches } from "@/features/matches/matches-api"
import { useTeams } from "@/features/dashboard-admin/academy-config-api"
import { useAssessmentOversight, type AssessmentOversightRow } from "./assessments-api"
import { HEAD_COACH_NAV_ITEMS } from "@/features/dashboard-head-coach/head-coach-dashboard"

interface RatingRow {
  id: string
  playerId: string
  playerName: string
  teamName: string
  source: string
  date: string
  rating: string
}

function RatingsTable({ rows, onSelectPlayer }: { rows: RatingRow[]; onSelectPlayer: (playerId: string) => void }) {
  if (rows.length === 0) {
    return <EmptyState title="No ratings yet" description="Ratings logged by coaches will appear here." />
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Player</TableHead>
          <TableHead>Team</TableHead>
          <TableHead>Source</TableHead>
          <TableHead>Rating</TableHead>
          <TableHead>Date</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.id} className="cursor-pointer" onClick={() => onSelectPlayer(r.playerId)}>
            <TableCell className="font-medium">{r.playerName}</TableCell>
            <TableCell>{r.teamName}</TableCell>
            <TableCell>{r.source}</TableCell>
            <TableCell className="tabular-nums">{r.rating}</TableCell>
            <TableCell className="text-muted-foreground">{formatDate(r.date)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

// Detailed breakdown for one specific training session: who was present, who's been rated
// against which activity, and who still hasn't been rated at all.
function SessionDetailCard({ sessionId, onSelectPlayer }: { sessionId: string; onSelectPlayer: (playerId: string) => void }) {
  const { data: session, isLoading, isError, refetch } = useTrainingSession(sessionId)
  const { data: sessionRatings, isLoading: ratingsLoading } = useAssessmentOversight(undefined, sessionId)

  if (isLoading || ratingsLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <LoadingState rows={4} />
        </CardContent>
      </Card>
    )
  }
  if (isError || !session) {
    return (
      <Card>
        <CardContent className="pt-6">
          <ErrorState onRetry={() => void refetch()} />
        </CardContent>
      </Card>
    )
  }

  const presentCount = session.attendance.filter((a) => a.status === "PRESENT").length
  const lateCount = session.attendance.filter((a) => a.status === "LATE").length
  const notPresentCount = session.roster.length - presentCount - lateCount
  const activities = session.sessionActivities
  const rows = sessionRatings ?? []
  const ratedPlayerIds = new Set(rows.map((a) => a.player.id))
  const notYetRated = session.attendance.filter(
    (a) => (a.status === "PRESENT" || a.status === "LATE") && !ratedPlayerIds.has(a.playerId),
  )

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/8 via-chart-2/6 to-transparent p-4">
        <div className="flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <CalendarDays className="size-4.5" />
          </div>
          <div>
            <p className="font-semibold">{session.team.name}</p>
            <p className="text-xs text-muted-foreground">
              {formatDate(session.date)}
              {session.startTime ? ` · ${session.startTime}–${session.endTime}` : ""} · {session.location ?? "Location TBC"}
            </p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {activities.length > 0 ? (
            activities.map((a) => (
              <Badge key={a.id} variant="outline">
                {a.name}
              </Badge>
            ))
          ) : (
            <span className="text-xs text-muted-foreground">No activities set for this session</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Users} label="Team size" value={session.roster.length} iconClassName="bg-chart-2/15 text-chart-2" />
        <StatCard icon={UserCheck} label="Present" value={presentCount} iconClassName="bg-success/15 text-success" />
        <StatCard icon={UserX} label="Not present" value={notPresentCount} iconClassName="bg-destructive/15 text-destructive" />
        <StatCard icon={Clock} label="Late" value={lateCount} iconClassName="bg-warning/15 text-warning" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ratings by Activity</CardTitle>
          <CardDescription>Every rated player's score for each of this session's activities.</CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <EmptyState title="No ratings recorded yet" description="Ratings logged for this session will appear here." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Player</TableHead>
                  {activities.map((a) => (
                    <TableHead key={a.id}>{a.name}</TableHead>
                  ))}
                  <TableHead>Average</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((a) => {
                  const byActivity = new Map(a.ratings.map((r) => [r.sessionActivityId, Number(r.ratingValue)]))
                  const values = [...byActivity.values()].filter((v) => !Number.isNaN(v))
                  const avg = values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : null
                  return (
                    <TableRow
                      key={a.id}
                      className="cursor-pointer"
                      onClick={() => onSelectPlayer(a.player.id)}
                    >
                      <TableCell className="font-medium">
                        {a.player.firstName} {a.player.lastName}
                      </TableCell>
                      {activities.map((act) => (
                        <TableCell key={act.id} className="tabular-nums">
                          {byActivity.get(act.id) != null ? byActivity.get(act.id)!.toFixed(1) : "—"}
                        </TableCell>
                      ))}
                      <TableCell className="font-medium tabular-nums">{avg !== null ? avg.toFixed(1) : "—"}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {notYetRated.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Not Yet Rated</CardTitle>
            <CardDescription>Present or late players who haven't been rated for this session yet.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {notYetRated.map((a) => (
              <Badge key={a.id} variant="warning">
                {a.player.firstName} {a.player.lastName}
              </Badge>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}

// Aggregate training-ratings analytics for one team: overall volume, top performers, and
// which activity the team is strongest/weakest at, computed across all its logged ratings.
function TeamInsightsCard({ rows }: { rows: AssessmentOversightRow[] }) {
  if (rows.length === 0) {
    return <EmptyState title="No training ratings yet" description="Ratings logged for this team will appear here." />
  }

  const playerMap = new Map<string, { name: string; total: number; count: number }>()
  const activityMap = new Map<string, { total: number; count: number }>()
  const allValues: number[] = []

  for (const a of rows) {
    const values = a.ratings.map((r) => Number(r.ratingValue)).filter((v) => !Number.isNaN(v))
    if (values.length > 0) {
      const avg = values.reduce((sum, v) => sum + v, 0) / values.length
      const entry = playerMap.get(a.player.id) ?? { name: `${a.player.firstName} ${a.player.lastName}`, total: 0, count: 0 }
      entry.total += avg
      entry.count += 1
      playerMap.set(a.player.id, entry)
    }
    for (const r of a.ratings) {
      const label = r.criteria?.name ?? r.sessionActivity?.name
      const value = Number(r.ratingValue)
      if (!label || Number.isNaN(value)) continue
      allValues.push(value)
      const entry = activityMap.get(label) ?? { total: 0, count: 0 }
      entry.total += value
      entry.count += 1
      activityMap.set(label, entry)
    }
  }

  const topPerformers = [...playerMap.entries()]
    .map(([id, v]) => ({ id, name: v.name, average: v.total / v.count }))
    .sort((a, b) => b.average - a.average)
    .slice(0, 5)

  const activityAverages = [...activityMap.entries()].map(([label, v]) => ({ label, average: v.total / v.count }))
  const strongest =
    activityAverages.length > 0 ? activityAverages.reduce((max, d) => (d.average > max.average ? d : max)) : null
  const weakest =
    activityAverages.length > 0 ? activityAverages.reduce((min, d) => (d.average < min.average ? d : min)) : null
  const avgOverall = allValues.length > 0 ? allValues.reduce((sum, v) => sum + v, 0) / allValues.length : null

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard icon={ClipboardList} label="Ratings logged" value={rows.length} iconClassName="bg-chart-2/15 text-chart-2" />
        <StatCard
          icon={Star}
          label="Avg rating"
          value={avgOverall !== null ? `${avgOverall.toFixed(1)} / 5` : "—"}
          iconClassName="bg-primary/15 text-primary"
        />
        <StatCard icon={Users} label="Players rated" value={playerMap.size} iconClassName="bg-chart-4/15 text-chart-4" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-border p-4">
          <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Award className="size-4 text-chart-2" /> Top performers
          </p>
          <div className="space-y-2">
            {topPerformers.map((p, i) => (
              <div key={p.id} className="flex items-center justify-between text-sm">
                <span className="font-medium">
                  {i + 1}. {p.name}
                </span>
                <span className="tabular-nums text-muted-foreground">{p.average.toFixed(1)} / 5</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {strongest ? (
            <p className="rounded-lg border border-success/30 bg-success/10 p-3 text-sm">
              <span className="font-medium">Strongest activity: </span>
              {strongest.label} (avg {strongest.average.toFixed(1)}/5)
            </p>
          ) : null}
          {weakest ? (
            <p className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm">
              <span className="font-medium">Focus area: </span>
              {weakest.label} (avg {weakest.average.toFixed(1)}/5) — the lowest-rated activity across recent sessions.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export function HeadCoachPlayerRatingsPage() {
  const navigate = useNavigate()
  const [teamId, setTeamId] = useState("")
  const [sessionId, setSessionId] = useState("")
  const [search, setSearch] = useState("")

  const { data: teams } = useTrainingTeams()
  const { data: academyTeams } = useTeams()
  const { data: sessions } = useTrainingSessions()
  const {
    data: players,
    isLoading: playersLoading,
    isError: playersError,
    refetch: refetchPlayers,
  } = usePlayers({ teamId: teamId || undefined, search: search || undefined })
  const { data: oversight, isLoading: oversightLoading } = useAssessmentOversight(teamId || undefined)
  const { data: matches, isLoading: matchesLoading } = useMatches()

  // Keep the session picker consistent with the team filter — clear it if it no longer
  // belongs to the newly selected team, rather than leaving a mismatched selection.
  useEffect(() => {
    if (!teamId || !sessionId) return
    const stillValid = sessions?.some((s) => s.id === sessionId && s.teamId === teamId)
    if (!stillValid) setSessionId("")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId])

  const sessionOptions = useMemo(() => {
    return (sessions ?? [])
      .filter((s) => !teamId || s.teamId === teamId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 100)
  }, [sessions, teamId])

  const q = search.trim().toLowerCase()

  const trainingRows: RatingRow[] = useMemo(() => {
    return (oversight ?? [])
      .map((a) => {
        const ratedValues = a.ratings.map((r) => Number(r.ratingValue)).filter((v) => !Number.isNaN(v))
        const avg = ratedValues.length > 0 ? ratedValues.reduce((sum, v) => sum + v, 0) / ratedValues.length : null
        return {
          id: a.id,
          playerId: a.player.id,
          playerName: `${a.player.firstName} ${a.player.lastName}`,
          teamName: a.player.team?.name ?? "—",
          source: a.template?.name ?? "Training session",
          date: a.assessmentDate,
          rating: avg !== null ? `${avg.toFixed(1)} / 5` : "—",
        }
      })
      .filter((r) => !q || r.playerName.toLowerCase().includes(q))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 30)
  }, [oversight, q])

  const matchRows: RatingRow[] = useMemo(() => {
    return (matches ?? [])
      .filter((m) => !teamId || m.teamId === teamId)
      .flatMap((m) =>
        m.matchPlayerAssessments.map((a) => {
          const participant = m.participations.find((p) => p.playerId === a.playerId)
          const overall = a.overallRating != null ? Number(a.overallRating) : null
          return {
            id: a.id,
            playerId: a.playerId,
            playerName: participant ? `${participant.player.firstName} ${participant.player.lastName}` : "Unknown player",
            teamName: m.team.name,
            source: `vs ${m.opponent.name}`,
            date: m.matchDate,
            rating: overall !== null ? `${overall.toFixed(1)} / 5` : "—",
          }
        }),
      )
      .filter((r) => !q || r.playerName.toLowerCase().includes(q))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 30)
  }, [matches, teamId, q])

  const goToPlayer = (playerId: string) => navigate(`/head-coach/players/${playerId}/ratings`)
  const teamCoach = academyTeams?.find((t) => t.id === teamId)?.headCoach ?? null

  return (
    <DashboardLayout title="Player Ratings" navItems={HEAD_COACH_NAV_ITEMS}>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Filter</CardTitle>
            <CardDescription>
              Narrow down to one team and/or a specific session, or search for a player, to see detailed statistics.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Select className="w-full sm:w-56" value={teamId} onChange={(e) => setTeamId(e.target.value)}>
              <option value="">All teams</option>
              {teams?.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
            <Select className="w-full sm:w-64" value={sessionId} onChange={(e) => setSessionId(e.target.value)}>
              <option value="">All sessions</option>
              {sessionOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.team.name} · {formatDate(s.date)}
                </option>
              ))}
            </Select>
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search player by name"
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {sessionId ? (
          <Card>
            <CardHeader className="flex-row items-center gap-3 space-y-0">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <CalendarDays className="size-4.5" />
              </div>
              <div>
                <CardTitle className="text-base">Session Detail</CardTitle>
                <CardDescription>Detailed attendance and rating breakdown for the selected session.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <SessionDetailCard sessionId={sessionId} onSelectPlayer={goToPlayer} />
            </CardContent>
          </Card>
        ) : teamId ? (
          <Card>
            <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0">
              <div className="flex items-center gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-chart-1/10 text-chart-1">
                  <Activity className="size-4.5" />
                </div>
                <div>
                  <CardTitle className="text-base">Team Insights</CardTitle>
                  <CardDescription>Training-rating analytics for {teams?.find((t) => t.id === teamId)?.name ?? "this team"}.</CardDescription>
                </div>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-xs text-muted-foreground">Coach in charge</p>
                <p className="text-sm font-medium">
                  {teamCoach ? `${teamCoach.firstName} ${teamCoach.lastName}` : "Unassigned"}
                </p>
              </div>
            </CardHeader>
            <CardContent>
              {oversightLoading ? <LoadingState rows={4} /> : <TeamInsightsCard rows={oversight ?? []} />}
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader className="flex-row items-center gap-3 space-y-0">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-chart-2/10 text-chart-2">
              <ClipboardList className="size-4.5" />
            </div>
            <div>
              <CardTitle className="text-base">Recent Ratings</CardTitle>
              <CardDescription>Latest training and match ratings across the academy.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="training">
              <TabsList>
                <TabsTrigger value="training">Training</TabsTrigger>
                <TabsTrigger value="matches">Matches</TabsTrigger>
              </TabsList>
              <TabsContent value="training" className="pt-2">
                {oversightLoading ? <LoadingState rows={4} /> : <RatingsTable rows={trainingRows} onSelectPlayer={goToPlayer} />}
              </TabsContent>
              <TabsContent value="matches" className="pt-2">
                {matchesLoading ? <LoadingState rows={4} /> : <RatingsTable rows={matchRows} onSelectPlayer={goToPlayer} />}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center gap-3 space-y-0">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Users className="size-4.5" />
            </div>
            <div>
              <CardTitle className="text-base">Players</CardTitle>
              <CardDescription>Select a player to see their full ratings, development, and progress over time.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {playersLoading ? (
              <LoadingState rows={4} />
            ) : playersError ? (
              <ErrorState onRetry={() => void refetchPlayers()} />
            ) : !players || players.length === 0 ? (
              <EmptyState title="No players found" description="Try a different team or search." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Player</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead>Player ID</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {players.map((p, index) => (
                    <TableRow key={p.id} className="cursor-pointer" onClick={() => goToPlayer(p.id)}>
                      <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <PlayerPhoto playerId={p.id} photoDocumentId={p.photoDocumentId} size={40} />
                          <span className="font-medium">
                            {p.firstName} {p.lastName}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{p.team?.name ?? "—"}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{p.playerCode ?? "—"}</TableCell>
                      <TableCell className="text-right">
                        <ArrowRight className="size-4 text-muted-foreground" aria-hidden />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
