import { formatDate } from "@/lib/date"
import { useMemo, useState } from "react"
import { Award, BarChart3, Search, Star, Trophy, Users, X } from "lucide-react"
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import { DashboardLayout } from "@/app/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { LoadingState } from "@/design-system/loading-state"
import { EmptyState } from "@/design-system/empty-state"
import { StatCard } from "@/design-system/stat-card"
import { calculateAge } from "@/lib/date"
import { usePlayers, type Player } from "@/features/players/players-api"
import { PlayerPhoto } from "@/features/players/player-photo"
import { COACH_NAV_ITEMS } from "@/features/dashboard-coach/coach-dashboard"
import { usePlayerMarks, useTeamMarks } from "./training-api"

const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 13,
}

const axisTick = { fontSize: 12, fill: "var(--muted-foreground)" }

function shortDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", { day: "numeric", month: "short" })
}

function PlayerPicker({ onSelect }: { onSelect: (player: Player) => void }) {
  const [search, setSearch] = useState("")
  const { data: players, isLoading } = usePlayers({ status: "ACTIVE", search })

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-3 space-y-0">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Award className="size-4.5" />
        </div>
        <div>
          <CardTitle>Player Marks</CardTitle>
          <CardDescription>
            Search for a player to see every drill mark they've been given and how they're trending.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or player ID"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>
        {search.trim().length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Start typing to find a player.</p>
        ) : isLoading ? (
          <LoadingState rows={2} />
        ) : !players || players.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No active players match "{search}".</p>
        ) : (
          <div className="space-y-2">
            {players.map((player) => (
              <button
                key={player.id}
                type="button"
                onClick={() => onSelect(player)}
                className="flex w-full items-center gap-3 rounded-lg border border-border p-3 text-left transition-colors hover:border-primary/30 hover:bg-muted/40"
              >
                <PlayerPhoto playerId={player.id} photoDocumentId={player.photoDocumentId} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {player.firstName} {player.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {calculateAge(player.dateOfBirth)} yrs · {player.team?.name ?? "No team"}
                    {player.playerCode ? ` · ${player.playerCode}` : ""}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function PlayerMarksAnalytics({ player, onChangePlayer }: { player: Player; onChangePlayer: () => void }) {
  const { data: marks, isLoading: marksLoading } = usePlayerMarks(player.id)
  const { data: teamMarks, isLoading: teamLoading } = useTeamMarks(player.team?.id)
  const [activityFilter, setActivityFilter] = useState("")

  const activityOptions = useMemo(
    () => Array.from(new Set((marks ?? []).map((m) => m.trainingActivity.name))).sort(),
    [marks],
  )

  const filteredMarks = useMemo(
    () => (marks ?? []).filter((m) => activityFilter === "" || m.trainingActivity.name === activityFilter),
    [marks, activityFilter],
  )

  const trend = (marks ?? [])
    .slice()
    .reverse()
    .map((m) => ({ date: m.createdAt, label: shortDate(m.createdAt), rating: m.rating, activity: m.trainingActivity.name }))

  const average = marks && marks.length > 0 ? marks.reduce((sum, m) => sum + m.rating, 0) / marks.length : null

  const byPlayer = (teamMarks ?? []).reduce<Record<string, { name: string; total: number; count: number }>>((acc, row) => {
    const key = row.playerId
    if (!acc[key]) acc[key] = { name: `${row.player.firstName} ${row.player.lastName}`, total: 0, count: 0 }
    acc[key].total += row.rating
    acc[key].count += 1
    return acc
  }, {})
  const teamAverage =
    teamMarks && teamMarks.length > 0 ? teamMarks.reduce((sum, r) => sum + r.rating, 0) / teamMarks.length : null

  const comparison =
    average !== null && teamAverage !== null
      ? [
          { name: `${player.firstName} ${player.lastName}`, average: Math.round(average * 10) / 10, isSelected: true },
          { name: "Team average", average: Math.round(teamAverage * 10) / 10, isSelected: false },
        ]
      : []

  const teamRanking = Object.entries(byPlayer)
    .map(([playerId, row]) => ({ playerId, name: row.name, average: row.total / row.count }))
    .sort((a, b) => b.average - a.average)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <PlayerPhoto playerId={player.id} photoDocumentId={player.photoDocumentId} size={48} />
            <div>
              <CardTitle>
                {player.firstName} {player.lastName}
              </CardTitle>
              <CardDescription>
                {player.team?.name ?? "No team"}
                {player.playerCode ? ` · ${player.playerCode}` : ""}
              </CardDescription>
            </div>
          </div>
          <button
            type="button"
            onClick={onChangePlayer}
            className="text-xs font-medium text-accent-foreground hover:underline"
          >
            Search another player
          </button>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={Star} label="Marks recorded" value={marks?.length ?? 0} isLoading={marksLoading} />
        <StatCard
          icon={Star}
          label="Average mark"
          value={average === null ? "—" : average.toFixed(1)}
          isLoading={marksLoading}
        />
        <StatCard
          icon={BarChart3}
          label="Team average"
          value={teamAverage === null ? "—" : teamAverage.toFixed(1)}
          isLoading={teamLoading}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center gap-3 space-y-0">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-chart-2/10 text-chart-2">
              <BarChart3 className="size-4.5" />
            </div>
            <div>
              <CardTitle className="text-base">Marks Over Time</CardTitle>
              <CardDescription>Every recorded activity mark, oldest to newest</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {marksLoading ? (
              <LoadingState rows={3} />
            ) : trend.length === 0 ? (
              <EmptyState title="No marks yet" description="Marks will appear here once a coach rates this player." />
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trend} margin={{ top: 8, right: 8, left: -20, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={{ stroke: "var(--border)" }} />
                    <YAxis domain={[0, 10]} allowDecimals={false} tick={axisTick} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(v, _n, item) => [v, item.payload.activity]}
                    />
                    <Line
                      type="monotone"
                      dataKey="rating"
                      name="Rating"
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
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-chart-4/10 text-chart-4">
              <Users className="size-4.5" />
            </div>
            <div>
              <CardTitle className="text-base">vs Team Average</CardTitle>
              <CardDescription>This player's average mark compared to their team</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {marksLoading || teamLoading ? (
              <LoadingState rows={3} />
            ) : comparison.length === 0 ? (
              <EmptyState title="Not enough data yet" description="Needs at least one mark for this player and their team." />
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparison} margin={{ top: 8, right: 8, left: -20, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="name" tick={axisTick} tickLine={false} axisLine={{ stroke: "var(--border)" }} />
                    <YAxis domain={[0, 10]} allowDecimals={false} tick={axisTick} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="average" name="Average mark" radius={[6, 6, 0, 0]} isAnimationActive={false}>
                      {comparison.map((row) => (
                        <Cell key={row.name} fill={row.isSelected ? "var(--primary)" : "var(--muted-foreground)"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {teamRanking.length > 1 ? (
        <Card>
          <CardHeader className="flex-row items-center gap-3 space-y-0">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-chart-1/10 text-chart-1">
              <Trophy className="size-4.5" />
            </div>
            <div>
              <CardTitle className="text-base">Team Ranking</CardTitle>
              <CardDescription>Average mark across all rated players on this team</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {teamRanking.map((row, index) => (
              <div
                key={row.playerId}
                className={`flex items-center justify-between rounded-lg border p-3 text-sm ${
                  row.playerId === player.id ? "border-primary/40 bg-primary/5" : "border-border"
                }`}
              >
                <span className="font-medium">
                  {index + 1}. {row.name}
                </span>
                <span className="tabular-nums text-muted-foreground">{row.average.toFixed(1)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="flex-row items-center gap-3 space-y-0">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-chart-3/10 text-chart-3">
            <Star className="size-4.5" />
          </div>
          <CardTitle className="text-base">Mark History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {marksLoading ? null : marks && marks.length > 0 ? (
            <div className="flex items-center gap-2">
              <Select
                className="sm:w-56"
                value={activityFilter}
                onChange={(e) => setActivityFilter(e.target.value)}
                aria-label="Filter by activity"
              >
                <option value="">All activities</option>
                {activityOptions.map((activity) => (
                  <option key={activity} value={activity}>
                    {activity}
                  </option>
                ))}
              </Select>
              {activityFilter !== "" ? (
                <Button variant="ghost" size="sm" onClick={() => setActivityFilter("")}>
                  <X /> Clear
                </Button>
              ) : null}
            </div>
          ) : null}

          {marksLoading ? (
            <LoadingState rows={3} />
          ) : !marks || marks.length === 0 ? (
            <EmptyState title="No marks yet" description="Marks will appear here once recorded." />
          ) : filteredMarks.length === 0 ? (
            <EmptyState title="No matching marks" description="Try a different activity filter." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Activity</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Remarks</TableHead>
                  <TableHead>Rated by</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMarks.map((mark) => (
                  <TableRow key={mark.id}>
                    <TableCell>{formatDate(mark.createdAt)}</TableCell>
                    <TableCell>{mark.trainingActivity.trainingPlan.title}</TableCell>
                    <TableCell>{mark.trainingActivity.name}</TableCell>
                    <TableCell className="font-medium tabular-nums">{mark.rating}/10</TableCell>
                    <TableCell className="text-muted-foreground">{mark.remarks ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {mark.ratedByCoach.firstName} {mark.ratedByCoach.lastName}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export function CoachPlayerMarksPage() {
  const [player, setPlayer] = useState<Player | null>(null)

  return (
    <DashboardLayout title="Player Marks" navItems={COACH_NAV_ITEMS}>
      {player ? (
        <PlayerMarksAnalytics player={player} onChangePlayer={() => setPlayer(null)} />
      ) : (
        <PlayerPicker onSelect={setPlayer} />
      )}
    </DashboardLayout>
  )
}
