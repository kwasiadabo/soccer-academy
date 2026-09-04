import { formatDate } from "@/lib/date"
import { useState } from "react"
import { CalendarCheck, Percent, PieChart as PieChartIcon } from "lucide-react"
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"

import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { StatCard } from "@/design-system/stat-card"
import { EmptyState } from "@/design-system/empty-state"
import { LoadingState } from "@/design-system/loading-state"
import { useTrainingSessions, type AttendanceStatus } from "@/features/training/training-api"
import {
  ATTENDANCE_STATUS_BADGE_VARIANT,
  ATTENDANCE_STATUS_COLORS,
  ATTENDANCE_STATUS_LABELS,
} from "@/features/training/attendance-constants"

const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 13,
}

function ninetyDaysAgo(): string {
  const d = new Date()
  d.setDate(d.getDate() - 90)
  return d.toISOString().slice(0, 10)
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export function PlayerAttendanceTab({ playerId }: { playerId: string }) {
  const [from, setFrom] = useState(ninetyDaysAgo())
  const [to, setTo] = useState(today())
  const { data: sessions, isLoading } = useTrainingSessions()

  const allRecords = (sessions ?? [])
    .flatMap((session) =>
      session.attendance
        .filter((a) => a.player.id === playerId)
        .map((a) => ({
          id: a.id,
          date: session.date,
          teamName: session.trainingGroup?.name ?? session.team.name,
          status: a.status,
          remarks: a.remarks,
          recordedBy: `${a.recordedByUser.firstName} ${a.recordedByUser.lastName}`,
        })),
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const fromTime = from ? new Date(from).getTime() : -Infinity
  const toTime = to ? new Date(`${to}T23:59:59.999`).getTime() : Infinity
  const inRange = allRecords.filter((r) => {
    const t = new Date(r.date).getTime()
    return t >= fromTime && t <= toTime
  })

  const presentCount = inRange.filter((r) => r.status === "PRESENT").length
  const attendanceRate = inRange.length > 0 ? Math.round((presentCount / inRange.length) * 100) : null

  const statusBreakdown = (Object.keys(ATTENDANCE_STATUS_LABELS) as AttendanceStatus[])
    .map((status) => ({
      status,
      name: ATTENDANCE_STATUS_LABELS[status],
      value: inRange.filter((r) => r.status === status).length,
    }))
    .filter((row) => row.value > 0)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Attendance</CardTitle>
          <CardDescription>Training attendance for a selected period, with a breakdown by status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="attendance-from">From</Label>
              <Input id="attendance-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="attendance-to">To</Label>
              <Input id="attendance-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>

          {isLoading ? (
            <LoadingState rows={4} />
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <StatCard icon={CalendarCheck} label="Sessions in range" value={inRange.length} />
                <StatCard icon={CalendarCheck} label="Present" value={presentCount} />
                <StatCard
                  icon={Percent}
                  label="Attendance rate"
                  value={attendanceRate === null ? "—" : `${attendanceRate}%`}
                />
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  {inRange.length === 0 ? (
                    <EmptyState
                      title="No attendance in this range"
                      description="Try widening the date range."
                    />
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Team</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Remarks</TableHead>
                          <TableHead>Recorded by</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {inRange.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell>{formatDate(row.date)}</TableCell>
                            <TableCell>{row.teamName}</TableCell>
                            <TableCell>
                              <Badge variant={ATTENDANCE_STATUS_BADGE_VARIANT[row.status]}>
                                {ATTENDANCE_STATUS_LABELS[row.status]}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">{row.remarks ?? "—"}</TableCell>
                            <TableCell className="text-muted-foreground">{row.recordedBy}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>

                <Card className="h-full">
                  <CardHeader className="flex-row items-center gap-3 space-y-0">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-accent-foreground">
                      <PieChartIcon className="size-4.5" aria-hidden />
                    </div>
                    <div>
                      <CardTitle className="text-base">Breakdown</CardTitle>
                      <CardDescription>By status, in range</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {statusBreakdown.length === 0 ? (
                      <p className="py-6 text-center text-sm text-muted-foreground">Nothing to show yet.</p>
                    ) : (
                      <div className="h-56 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={statusBreakdown}
                              dataKey="value"
                              nameKey="name"
                              innerRadius={50}
                              outerRadius={80}
                              startAngle={90}
                              endAngle={-270}
                              paddingAngle={statusBreakdown.length > 1 ? 3 : 0}
                              isAnimationActive={false}
                            >
                              {statusBreakdown.map((row) => (
                                <Cell key={row.status} fill={ATTENDANCE_STATUS_COLORS[row.status]} />
                              ))}
                            </Pie>
                            <Tooltip contentStyle={tooltipStyle} />
                            <Legend wrapperStyle={{ fontSize: 12 }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
