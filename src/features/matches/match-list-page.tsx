import { formatDate } from "@/lib/date"
import { useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useNavigate } from "react-router-dom"
import { Award, CheckCircle2, MinusCircle, Plus, Search, Shield, Trophy, TrendingUp, X, XCircle } from "lucide-react"

import { DashboardLayout, type NavItem } from "@/app/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { EmptyState } from "@/design-system/empty-state"
import { LoadingState } from "@/design-system/loading-state"
import { ErrorState } from "@/design-system/error-state"
import { StatCard } from "@/design-system/stat-card"
import { StatusBadge } from "@/design-system/status-badge"
import { useTrainingTeams } from "@/features/training/training-api"
import { useCreateMatch, useCreateOpponent, useMatches, useOpponents, type Match, type MatchStatus } from "./matches-api"

const ALL_MATCH_STATUSES: MatchStatus[] = ["SCHEDULED", "COMPLETED", "CANCELLED", "POSTPONED"]

const RATING_DIMENSIONS = [
  ["technicalRating", "Technical"],
  ["tacticalRating", "Tactical"],
  ["teamContributionRating", "Team contribution"],
  ["disciplineRating", "Discipline"],
  ["effortRating", "Effort"],
] as const

function MatchAnalyticsSection({ matches }: { matches: Match[] }) {
  const scoredMatches = matches.filter(
    (m) => m.status === "COMPLETED" && m.homeScore !== null && m.awayScore !== null,
  )
  if (scoredMatches.length === 0) return null

  const wins = scoredMatches.filter((m) => m.homeScore! > m.awayScore!).length
  const draws = scoredMatches.filter((m) => m.homeScore! === m.awayScore!).length
  const losses = scoredMatches.filter((m) => m.homeScore! < m.awayScore!).length
  const winRate = Math.round((wins / scoredMatches.length) * 100)

  const playerMap = new Map<string, { name: string; total: number; count: number }>()
  const dimensionSums = new Map<string, { total: number; count: number }>()

  for (const match of scoredMatches) {
    const nameById = new Map(
      match.participations.map((p) => [p.playerId, `${p.player.firstName} ${p.player.lastName}`]),
    )
    for (const a of match.matchPlayerAssessments) {
      if (a.overallRating != null) {
        const value = Number(a.overallRating)
        if (!Number.isNaN(value)) {
          const name = nameById.get(a.playerId) ?? "Unknown player"
          const entry = playerMap.get(a.playerId) ?? { name, total: 0, count: 0 }
          entry.total += value
          entry.count += 1
          playerMap.set(a.playerId, entry)
        }
      }
      for (const [key, label] of RATING_DIMENSIONS) {
        const raw = a[key]
        if (raw == null) continue
        const value = Number(raw)
        if (Number.isNaN(value)) continue
        const entry = dimensionSums.get(label) ?? { total: 0, count: 0 }
        entry.total += value
        entry.count += 1
        dimensionSums.set(label, entry)
      }
    }
  }

  const topPerformers = [...playerMap.entries()]
    .map(([playerId, v]) => ({ playerId, name: v.name, average: v.total / v.count }))
    .sort((a, b) => b.average - a.average)
    .slice(0, 5)

  const dimensionAverages = [...dimensionSums.entries()].map(([label, v]) => ({ label, average: v.total / v.count }))
  const weakest =
    dimensionAverages.length > 0 ? dimensionAverages.reduce((min, d) => (d.average < min.average ? d : min)) : null
  const strongest =
    dimensionAverages.length > 0 ? dimensionAverages.reduce((max, d) => (d.average > max.average ? d : max)) : null

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-3 space-y-0">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-chart-1/10 text-chart-1">
          <TrendingUp className="size-4.5" />
        </div>
        <div>
          <CardTitle className="text-base">Match Analytics</CardTitle>
          <CardDescription>A quick read on results and player ratings across completed matches.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard icon={Trophy} label="Win rate" value={`${winRate}%`} iconClassName="bg-chart-1/15 text-chart-1" />
          <StatCard icon={CheckCircle2} label="Wins" value={wins} iconClassName="bg-success/15 text-success" />
          <StatCard icon={MinusCircle} label="Draws" value={draws} iconClassName="bg-warning/15 text-warning" />
          <StatCard icon={XCircle} label="Losses" value={losses} iconClassName="bg-destructive/15 text-destructive" />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-border p-4">
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Award className="size-4 text-chart-2" /> Highest performing players
            </p>
            {topPerformers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No player ratings recorded yet for completed matches.</p>
            ) : (
              <div className="space-y-2">
                {topPerformers.map((p, i) => (
                  <div key={p.playerId} className="flex items-center justify-between text-sm">
                    <span className="font-medium">
                      {i + 1}. {p.name}
                    </span>
                    <span className="tabular-nums text-muted-foreground">{p.average.toFixed(1)} / 5</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3">
            {strongest ? (
              <p className="rounded-lg border border-success/30 bg-success/10 p-3 text-sm">
                <span className="font-medium">Strongest area: </span>
                {strongest.label} (avg {strongest.average.toFixed(1)}/5) — keep reinforcing this in training.
              </p>
            ) : null}
            {weakest ? (
              <p className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm">
                <span className="font-medium">Focus area: </span>
                {weakest.label} (avg {weakest.average.toFixed(1)}/5) — the lowest-rated dimension across recent
                matches.
              </p>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

const opponentSchema = z.object({ name: z.string().min(1, "Name is required") })
type OpponentFormValues = z.infer<typeof opponentSchema>

const matchSchema = z.object({
  teamId: z.string().min(1, "Select a team"),
  opponentId: z.string().min(1, "Select an opponent"),
  matchDate: z.string().min(1, "Date is required"),
  venue: z.string().optional(),
})
type MatchFormValues = z.infer<typeof matchSchema>

function OpponentsPanel() {
  const { data: opponents } = useOpponents()
  const createOpponent = useCreateOpponent()
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<OpponentFormValues>({
    resolver: zodResolver(opponentSchema),
  })

  const onSubmit = async (values: OpponentFormValues) => {
    await createOpponent.mutateAsync(values)
    reset()
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-3 space-y-0">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-chart-2/10 text-chart-2">
          <Shield className="size-4.5" />
        </div>
        <div>
          <CardTitle className="text-base">Opponents</CardTitle>
          <CardDescription>Add opposing teams here first, then pick one when scheduling a match.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {opponents?.map((o) => (
            <span
              key={o.id}
              className="rounded-full border border-chart-2/25 bg-chart-2/8 px-3 py-1 text-xs font-medium text-chart-2"
            >
              {o.name}
            </span>
          ))}
          {!opponents?.length ? <p className="text-sm text-muted-foreground">No opponents yet.</p> : null}
        </div>
        <form className="flex gap-2" onSubmit={handleSubmit(onSubmit)} noValidate>
          <Input placeholder="Opponent name" {...register("name")} />
          <Button type="submit" variant="outline" disabled={isSubmitting}>
            <Plus /> Add
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

export function MatchListPage({ title, navItems, detailBasePath }: { title: string; navItems: NavItem[]; detailBasePath: string }) {
  const navigate = useNavigate()
  const { data, isLoading, isError, refetch } = useMatches()
  const { data: teams } = useTrainingTeams()
  const { data: opponents } = useOpponents()
  const createMatch = useCreateMatch()
  const [open, setOpen] = useState(false)

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [teamFilter, setTeamFilter] = useState("")

  const hasActiveFilters = search.trim() !== "" || statusFilter !== "" || teamFilter !== ""
  const clearFilters = () => {
    setSearch("")
    setStatusFilter("")
    setTeamFilter("")
  }

  const filteredData = useMemo(() => {
    if (!data) return data
    const query = search.trim().toLowerCase()
    return data.filter((match) => {
      const matchesSearch = query === "" || match.opponent.name.toLowerCase().includes(query)
      const matchesStatus = statusFilter === "" || match.status === statusFilter
      const matchesTeam = teamFilter === "" || match.teamId === teamFilter
      return matchesSearch && matchesStatus && matchesTeam
    })
  }, [data, search, statusFilter, teamFilter])

  const uniqueTeams = useMemo(() => {
    if (!data) return []
    const map = new Map<string, string>()
    for (const match of data) map.set(match.teamId, match.team.name)
    return [...map.entries()]
  }, [data])

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MatchFormValues>({ resolver: zodResolver(matchSchema) })

  const onSubmit = async (values: MatchFormValues) => {
    const match = await createMatch.mutateAsync(values)
    reset()
    setOpen(false)
    navigate(`${detailBasePath}/${match.id}`)
  }

  return (
    <DashboardLayout title={title} navItems={navItems}>
      <div className="space-y-6">
        <OpponentsPanel />

        <Card>
          <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-chart-4/10 text-chart-4">
                <Trophy className="size-4.5" />
              </div>
              <div>
                <CardTitle>Matches</CardTitle>
                <CardDescription>Schedule a fixture, then open it to manage the squad and post-match ratings.</CardDescription>
              </div>
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm" disabled={!teams?.length || !opponents?.length}>
                  <Plus /> New match
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Schedule a match</DialogTitle>
                  <DialogDescription>You can only manage matches for a team you're assigned to.</DialogDescription>
                </DialogHeader>
                <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
                  <div className="space-y-1.5">
                    <Label htmlFor="match-team">Team</Label>
                    <Select id="match-team" defaultValue="" {...register("teamId")}>
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
                    <Label htmlFor="match-opponent">Opponent</Label>
                    <Select id="match-opponent" defaultValue="" {...register("opponentId")}>
                      <option value="" disabled>
                        Select an opponent
                      </option>
                      {opponents?.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name}
                        </option>
                      ))}
                    </Select>
                    {errors.opponentId ? (
                      <p className="text-xs text-destructive">{errors.opponentId.message}</p>
                    ) : null}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="match-date">Date</Label>
                    <Input id="match-date" type="date" {...register("matchDate")} />
                    {errors.matchDate ? (
                      <p className="text-xs text-destructive">{errors.matchDate.message}</p>
                    ) : null}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="match-venue">Venue</Label>
                    <Input id="match-venue" {...register("venue")} />
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? "Creating…" : "Create match"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative flex-1 sm:max-w-xs">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by opponent…"
                  className="pl-8"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              {uniqueTeams.length > 1 ? (
                <Select
                  className="sm:w-40"
                  value={teamFilter}
                  onChange={(e) => setTeamFilter(e.target.value)}
                  aria-label="Filter by team"
                >
                  <option value="">All teams</option>
                  {uniqueTeams.map(([id, name]) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
                </Select>
              ) : null}
              <Select
                className="sm:w-40"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                aria-label="Filter by status"
              >
                <option value="">All statuses</option>
                {ALL_MATCH_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status.charAt(0) + status.slice(1).toLowerCase()}
                  </option>
                ))}
              </Select>
              {hasActiveFilters ? (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X /> Clear
                </Button>
              ) : null}
            </div>

            {isLoading ? (
              <LoadingState rows={3} />
            ) : isError ? (
              <ErrorState onRetry={() => void refetch()} />
            ) : !data || data.length === 0 ? (
              <EmptyState title="No matches yet" description="Schedule a match to start building a squad." />
            ) : !filteredData || filteredData.length === 0 ? (
              <EmptyState title="No matching matches" description="Try adjusting your search or filters." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead>Opponent</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((match, index) => (
                    <TableRow
                      key={match.id}
                      className="cursor-pointer"
                      onClick={() => navigate(`${detailBasePath}/${match.id}`)}
                    >
                      <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                      <TableCell className="font-medium">{match.team.name}</TableCell>
                      <TableCell>{match.opponent.name}</TableCell>
                      <TableCell>{formatDate(match.matchDate)}</TableCell>
                      <TableCell>
                        {match.homeScore !== null && match.awayScore !== null ? (
                          <div className="flex items-center gap-2">
                            <span className="font-semibold tabular-nums">
                              {match.homeScore} - {match.awayScore}
                            </span>
                            <StatusBadge
                              status={
                                match.homeScore > match.awayScore
                                  ? "WIN"
                                  : match.homeScore === match.awayScore
                                    ? "DRAW"
                                    : "LOSS"
                              }
                            />
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={match.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {data ? <MatchAnalyticsSection matches={data} /> : null}
      </div>
    </DashboardLayout>
  )
}
