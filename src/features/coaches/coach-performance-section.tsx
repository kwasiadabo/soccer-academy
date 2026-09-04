import { useMemo, useState } from "react"
import { Search, Trophy, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { EmptyState } from "@/design-system/empty-state"
import { LoadingState } from "@/design-system/loading-state"
import { ProgressBar } from "@/design-system/progress-bar"
import type { Coach } from "./coaches-api"
import type { TrainingPlan, TrainingSession } from "@/features/training/training-api"
import type { AssessmentOversightRow } from "@/features/assessments/assessments-api"

interface CoachPerformanceSectionProps {
  coaches: Coach[]
  sessions: TrainingSession[]
  trainingPlans: TrainingPlan[]
  oversight: AssessmentOversightRow[]
  isLoading?: boolean
}

interface CoachPerformanceRow {
  coach: Coach
  teamNames: string[]
  sessionsConducted: number
  presentCount: number
  markedCount: number
  attendanceRate: number | null
  plansApproved: number
  plansSubmitted: number
  assessmentsLogged: number
}

function buildRows(
  coaches: Coach[],
  sessions: TrainingSession[],
  trainingPlans: TrainingPlan[],
  oversight: AssessmentOversightRow[],
): CoachPerformanceRow[] {
  return coaches
    .map((coach) => {
      const coachSessions = sessions.filter((s) => s.conductedByCoachId === coach.id)
      const completedSessions = coachSessions.filter((s) => s.status === "COMPLETED")
      const attendance = completedSessions.flatMap((s) => s.attendance)
      const presentCount = attendance.filter((a) => a.status === "PRESENT").length
      const markedCount = attendance.length

      const coachPlans = trainingPlans.filter((p) => p.coachId === coach.id)
      const submittedPlans = coachPlans.filter((p) => p.approvalStatus !== "DRAFT")
      const plansApproved = submittedPlans.filter((p) => p.approvalStatus === "APPROVED").length

      const assessmentsLogged = oversight.filter((a) => a.assessedByCoachId === coach.id).length

      const teamNames = Array.from(
        new Set([...coachSessions.map((s) => s.team.name), ...coachPlans.map((p) => p.team.name)]),
      ).sort()

      return {
        coach,
        teamNames,
        sessionsConducted: completedSessions.length,
        presentCount,
        markedCount,
        attendanceRate: markedCount > 0 ? (presentCount / markedCount) * 100 : null,
        plansApproved,
        plansSubmitted: submittedPlans.length,
        assessmentsLogged,
      }
    })
    .sort((a, b) => b.sessionsConducted - a.sessionsConducted)
}

export function CoachPerformanceSection({
  coaches,
  sessions,
  trainingPlans,
  oversight,
  isLoading = false,
}: CoachPerformanceSectionProps) {
  const rows = buildRows(coaches, sessions, trainingPlans, oversight)

  const [search, setSearch] = useState("")
  const [teamFilter, setTeamFilter] = useState("")

  const hasActiveFilters = search.trim() !== "" || teamFilter !== ""
  const clearFilters = () => {
    setSearch("")
    setTeamFilter("")
  }

  const teamOptions = useMemo(() => {
    const names = new Set<string>()
    for (const row of rows) {
      for (const name of row.teamNames) names.add(name)
    }
    return Array.from(names).sort()
  }, [rows])

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase()
    return rows.filter((row) => {
      const matchesSearch =
        query === "" || `${row.coach.firstName} ${row.coach.lastName}`.toLowerCase().includes(query)
      const matchesTeam = teamFilter === "" || row.teamNames.includes(teamFilter)
      return matchesSearch && matchesTeam
    })
  }, [rows, search, teamFilter])

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-3 space-y-0">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-accent-foreground">
          <Trophy className="size-4.5" aria-hidden />
        </div>
        <div>
          <CardTitle className="text-base">Coach Performance</CardTitle>
          <CardDescription>Sessions delivered, attendance quality, and reporting across your coaching staff</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by coach name…"
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select
            className="sm:w-44"
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
            aria-label="Filter by team"
          >
            <option value="">All teams</option>
            {teamOptions.map((name) => (
              <option key={name} value={name}>
                {name}
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
          <LoadingState rows={4} />
        ) : rows.length === 0 ? (
          <EmptyState title="No coaches yet" description="Coach performance will appear once staff are added." />
        ) : filteredRows.length === 0 ? (
          <EmptyState title="No matching coaches" description="Try adjusting your search or filters." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Coach</TableHead>
                <TableHead>Teams</TableHead>
                <TableHead>Sessions run</TableHead>
                <TableHead className="min-w-40">Attendance rate</TableHead>
                <TableHead>Plans approved</TableHead>
                <TableHead>Assessments logged</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.map((row) => (
                <TableRow key={row.coach.id}>
                  <TableCell className="font-medium">
                    {row.coach.firstName} {row.coach.lastName}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.teamNames.length > 0 ? row.teamNames.join(", ") : "—"}
                  </TableCell>
                  <TableCell className="tabular-nums">{row.sessionsConducted}</TableCell>
                  <TableCell>
                    {row.attendanceRate === null ? (
                      <span className="text-xs text-muted-foreground">No attendance recorded</span>
                    ) : (
                      <ProgressBar value={row.attendanceRate} className="max-w-40" />
                    )}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {row.plansSubmitted > 0 ? `${row.plansApproved}/${row.plansSubmitted}` : "—"}
                  </TableCell>
                  <TableCell className="tabular-nums">{row.assessmentsLogged}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
