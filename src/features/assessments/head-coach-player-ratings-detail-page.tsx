import { useParams, useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import {
  ArrowLeft,
  BarChart3,
  Calendar,
  Footprints,
  Globe2,
  LineChart as LineChartIcon,
  Minus,
  Star,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
  UserRound,
  Users,
} from "lucide-react"
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import { DashboardLayout } from "@/app/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StatusBadge } from "@/design-system/status-badge"
import { StatCard } from "@/design-system/stat-card"
import { LoadingState } from "@/design-system/loading-state"
import { ErrorState } from "@/design-system/error-state"
import { EmptyState } from "@/design-system/empty-state"
import { calculateAge, formatDate } from "@/lib/date"
import { PlayerPhoto } from "@/features/players/player-photo"
import { usePlayer } from "@/features/players/players-api"
import { PlayerDevelopmentTab } from "@/features/players/player-profile-page"
import { useMatches } from "@/features/matches/matches-api"
import { HEAD_COACH_NAV_ITEMS } from "@/features/dashboard-head-coach/head-coach-dashboard"

const MATCH_RATING_FIELDS = [
  ["technicalRating", "Technical"],
  ["tacticalRating", "Tactical"],
  ["teamContributionRating", "Team"],
  ["disciplineRating", "Discipline"],
  ["effortRating", "Effort"],
  ["overallRating", "Overall"],
] as const

const DIMENSION_FIELDS = [
  ["technicalRating", "Technical", "var(--chart-1)"],
  ["tacticalRating", "Tactical", "var(--chart-2)"],
  ["teamContributionRating", "Team", "var(--chart-3)"],
  ["disciplineRating", "Discipline", "var(--chart-4)"],
  ["effortRating", "Effort", "var(--chart-5)"],
] as const

const chartTooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 13,
}

const chartAxisTick = { fontSize: 12, fill: "var(--muted-foreground)" }

function shortDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", { day: "numeric", month: "short" })
}

function StatChip({ icon: Icon, label, value }: { icon: typeof Calendar; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-border bg-muted/30 p-2.5">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] leading-tight text-muted-foreground">{label}</p>
        <p className="text-sm leading-tight font-medium break-words">{value ?? "—"}</p>
      </div>
    </div>
  )
}

function PlayerMatchRatingsTab({ playerId }: { playerId: string }) {
  const { data: matches, isLoading } = useMatches()

  if (isLoading) {
    return <LoadingState rows={3} />
  }

  const rows = (matches ?? [])
    .map((m) => {
      const assessment = m.matchPlayerAssessments.find((a) => a.playerId === playerId)
      return assessment ? { match: m, assessment } : null
    })
    .filter((r): r is { match: NonNullable<typeof matches>[number]; assessment: NonNullable<typeof matches>[number]["matchPlayerAssessments"][number] } => r !== null)
    .sort((a, b) => new Date(b.match.matchDate).getTime() - new Date(a.match.matchDate).getTime())

  if (rows.length === 0) {
    return (
      <EmptyState
        title="No match ratings yet"
        description="This player hasn't been rated in a match yet."
      />
    )
  }

  const overallValues = rows
    .map((r) => (r.assessment.overallRating != null ? Number(r.assessment.overallRating) : null))
    .filter((v): v is number => v !== null && !Number.isNaN(v))
  const avgOverall = overallValues.length > 0 ? overallValues.reduce((s, v) => s + v, 0) / overallValues.length : null

  // Simple trend: compare the average of the earliest half of rated matches to the latest half.
  let trend: "improving" | "declining" | "steady" | null = null
  if (overallValues.length >= 2) {
    const chronological = [...overallValues].reverse()
    const mid = Math.floor(chronological.length / 2)
    const earlyAvg = chronological.slice(0, mid).reduce((s, v) => s + v, 0) / mid
    const lateAvg = chronological.slice(mid).reduce((s, v) => s + v, 0) / (chronological.length - mid)
    const delta = lateAvg - earlyAvg
    trend = delta > 0.25 ? "improving" : delta < -0.25 ? "declining" : "steady"
  }

  const TrendIcon = trend === "improving" ? TrendingUp : trend === "declining" ? TrendingDown : Minus

  const overallTrendData = [...rows]
    .reverse()
    .map(({ match, assessment }) =>
      assessment.overallRating != null
        ? { label: shortDate(match.matchDate), rating: Number(assessment.overallRating) }
        : null,
    )
    .filter((d): d is { label: string; rating: number } => d !== null)

  const dimensionAverages = DIMENSION_FIELDS.map(([key, label, color]) => {
    const values = rows.map((r) => r.assessment[key]).filter((v): v is string => v != null).map(Number)
    const avg = values.length > 0 ? values.reduce((s, v) => s + v, 0) / values.length : null
    return { label, average: avg !== null ? Math.round(avg * 10) / 10 : 0, color, hasData: avg !== null }
  })

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard icon={Trophy} label="Matches rated" value={rows.length} iconClassName="bg-chart-4/15 text-chart-4" />
        <StatCard
          icon={Star}
          label="Avg overall rating"
          value={avgOverall !== null ? `${avgOverall.toFixed(1)} / 5` : "—"}
          iconClassName="bg-primary/15 text-primary"
        />
        <StatCard
          icon={TrendIcon}
          label="Trend"
          value={trend ? trend[0].toUpperCase() + trend.slice(1) : "—"}
          iconClassName={
            trend === "improving"
              ? "bg-success/15 text-success"
              : trend === "declining"
                ? "bg-destructive/15 text-destructive"
                : "bg-muted text-muted-foreground"
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center gap-3 space-y-0">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <LineChartIcon className="size-4.5" />
            </div>
            <div>
              <CardTitle className="text-base">Overall Rating Over Time</CardTitle>
              <CardDescription>Match by match, oldest to newest</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {overallTrendData.length < 2 ? (
              <EmptyState
                title="Not enough data yet"
                description="A trend chart will appear once there are at least two rated matches."
              />
            ) : (
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={overallTrendData} margin={{ top: 8, right: 8, left: -20, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="label" tick={chartAxisTick} tickLine={false} axisLine={{ stroke: "var(--border)" }} />
                    <YAxis domain={[0, 5]} tick={chartAxisTick} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={chartTooltipStyle} formatter={(v) => [`${v} / 5`, "Overall"]} />
                    <Line
                      type="monotone"
                      dataKey="rating"
                      name="Overall"
                      stroke="var(--primary)"
                      strokeWidth={2.5}
                      dot={{ r: 3.5, fill: "var(--primary)" }}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center gap-3 space-y-0">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-chart-2/10 text-chart-2">
              <BarChart3 className="size-4.5" />
            </div>
            <div>
              <CardTitle className="text-base">Rating by Dimension</CardTitle>
              <CardDescription>Average across all rated matches</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {!dimensionAverages.some((d) => d.hasData) ? (
              <EmptyState title="No dimension ratings yet" description="Ratings by dimension will appear here." />
            ) : (
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dimensionAverages} margin={{ top: 8, right: 8, left: -20, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="label" tick={chartAxisTick} tickLine={false} axisLine={{ stroke: "var(--border)" }} />
                    <YAxis domain={[0, 5]} tick={chartAxisTick} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={chartTooltipStyle} formatter={(v) => [`${v} / 5`, "Average"]} />
                    <Bar dataKey="average" name="Average" radius={[6, 6, 0, 0]} isAnimationActive={false}>
                      {dimensionAverages.map((d) => (
                        <Cell key={d.label} fill={d.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Match Rating History</CardTitle>
          <CardDescription>Every match this player has been rated in, most recent first.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Opponent</TableHead>
                {MATCH_RATING_FIELDS.map(([key, label]) => (
                  <TableHead key={key}>{label}</TableHead>
                ))}
                <TableHead>Remarks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ match, assessment }) => (
                <TableRow key={assessment.id}>
                  <TableCell className="text-muted-foreground">{formatDate(match.matchDate)}</TableCell>
                  <TableCell className="font-medium">{match.opponent.name}</TableCell>
                  {MATCH_RATING_FIELDS.map(([key]) => {
                    const raw = assessment[key]
                    return (
                      <TableCell key={key} className="tabular-nums">
                        {raw != null ? Number(raw).toFixed(1) : "—"}
                      </TableCell>
                    )
                  })}
                  <TableCell className="max-w-[200px] truncate text-muted-foreground">
                    {assessment.remarks ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

export function HeadCoachPlayerRatingsDetailPage() {
  const { playerId } = useParams<{ playerId: string }>()
  const navigate = useNavigate()
  const { data: player, isLoading, isError, refetch } = usePlayer(playerId)

  return (
    <DashboardLayout title="Player Ratings" navItems={HEAD_COACH_NAV_ITEMS}>
      <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate(-1)}>
        <ArrowLeft /> Back
      </Button>

      {isLoading ? (
        <LoadingState rows={6} />
      ) : isError || !player ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="grid grid-cols-1 gap-6 lg:grid-cols-3"
        >
          <Card className="overflow-hidden lg:col-span-1">
            <div className="h-16 bg-gradient-to-br from-primary via-primary/70 to-chart-2" />
            <CardContent className="-mt-12 flex flex-col items-center gap-4 pt-0 pb-6 text-center">
              <PlayerPhoto
                playerId={player.id}
                photoDocumentId={player.photoDocumentId}
                shape="rectangle"
                width={200}
                height={240}
              />
              <div className="space-y-1.5">
                <h2 className="text-lg font-semibold">
                  {player.firstName} {player.lastName}
                </h2>
                {player.playerCode ? (
                  <p className="font-mono text-xs text-muted-foreground">{player.playerCode}</p>
                ) : null}
                <StatusBadge status={player.status} />
              </div>
              <div className="grid w-full grid-cols-2 gap-2">
                <StatChip icon={Calendar} label="Age" value={`${calculateAge(player.dateOfBirth)} yrs`} />
                <StatChip icon={UserRound} label="Gender" value={player.gender} />
                <StatChip icon={Globe2} label="Nationality" value={player.nationality} />
                <StatChip icon={Users} label="Team" value={player.team?.name} />
                <StatChip icon={Target} label="Position" value={player.preferredPosition} />
                <StatChip icon={Footprints} label="Dominant foot" value={player.dominantFoot} />
              </div>
            </CardContent>
          </Card>

          <div className="lg:col-span-2">
            <Tabs defaultValue="training">
              <TabsList>
                <TabsTrigger value="training">Training</TabsTrigger>
                <TabsTrigger value="matches">Matches</TabsTrigger>
              </TabsList>

              <TabsContent value="training">
                <PlayerDevelopmentTab playerId={player.id} />
              </TabsContent>

              <TabsContent value="matches">
                <PlayerMatchRatingsTab playerId={player.id} />
              </TabsContent>
            </Tabs>
          </div>
        </motion.div>
      )}
    </DashboardLayout>
  )
}
