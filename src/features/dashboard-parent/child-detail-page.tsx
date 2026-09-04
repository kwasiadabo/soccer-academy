import { useMemo } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, CalendarClock, CheckCircle2, Star, Trophy } from "lucide-react"
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import { DashboardLayout } from "@/app/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StatusBadge } from "@/design-system/status-badge"
import { LoadingState } from "@/design-system/loading-state"
import { ErrorState } from "@/design-system/error-state"
import { EmptyState } from "@/design-system/empty-state"
import { ProgressBar } from "@/design-system/progress-bar"
import { StatCard } from "@/design-system/stat-card"
import { formatCurrency } from "@/lib/currency"
import { formatDate } from "@/lib/date"
import { CATEGORY_LABELS, computeCategoryScores } from "@/lib/assessment-categories"
import { PlayerPhoto } from "@/features/players/player-photo"
import { useParentNavItems } from "./children-list-page"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import {
  useChild,
  useChildActivityMarks,
  useChildAssessments,
  useChildAttendance,
  useChildFinanceSummary,
  useChildMatches,
  useChildStatement,
  usePlayerOfTheWeekAwards,
} from "./parent-portal-api"
import { CoachFeedbackDialog } from "./coach-feedback-form"

const FINANCE_BADGE: Record<string, "success" | "warning" | "destructive"> = {
  UP_TO_DATE: "success",
  PENDING: "warning",
  OVERDUE: "destructive",
}

const FINANCE_LABEL: Record<string, string> = {
  UP_TO_DATE: "Up to date",
  PENDING: "Payment due",
  OVERDUE: "Overdue",
}

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  CASH: "Cash",
  BANK_TRANSFER: "Bank transfer",
  MOBILE_MONEY: "Mobile money",
  CARD: "Card",
  ONLINE_GATEWAY: "Online gateway",
  OTHER: "Other",
}

export function ChildDetailPage() {
  const { playerId } = useParams<{ playerId: string }>()
  const navigate = useNavigate()
  const { data: child, isLoading, isError, refetch } = useChild(playerId)
  const { data: attendance } = useChildAttendance(playerId)
  const { data: assessments } = useChildAssessments(playerId)
  const { data: activityMarks } = useChildActivityMarks(playerId)
  const { data: matches } = useChildMatches(playerId)
  const { data: finance } = useChildFinanceSummary(playerId)
  const { data: statement, isLoading: statementLoading } = useChildStatement(playerId)
  const { data: awards } = usePlayerOfTheWeekAwards()
  const navItems = useParentNavItems()

  // Same "most recent week across all of this guardian's children" rule as the
  // children list, so a child is starred only for their most recent pick, not every
  // Player of the Week award they've ever earned.
  const latestAward = useMemo(() => {
    if (!awards || awards.length === 0 || !child) return null
    const latestWeekOf = awards.reduce((max, a) => (a.weekOf > max ? a.weekOf : max), awards[0].weekOf)
    return awards.find((a) => a.playerId === child.id && a.weekOf === latestWeekOf) ?? null
  }, [awards, child])

  const attendancePercent =
    attendance && attendance.length > 0
      ? Math.round((attendance.filter((a) => a.status === "PRESENT").length / attendance.length) * 100)
      : null

  const skillScores = assessments ? computeCategoryScores(assessments) : []

  const nextMatch = (matches ?? [])
    .filter((m) => new Date(m.match.matchDate) >= new Date())
    .sort((a, b) => new Date(a.match.matchDate).getTime() - new Date(b.match.matchDate).getTime())[0]

  return (
    <DashboardLayout title="Parent Dashboard" navItems={navItems}>
      <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate("/parent")}>
        <ArrowLeft /> Back to my children
      </Button>

      {isLoading ? (
        <LoadingState rows={6} />
      ) : isError || !child ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardContent className="flex flex-col items-center gap-4 pt-6 text-center">
              <div className="relative">
                <PlayerPhoto
                  playerId={child.id}
                  photoDocumentId={child.photoDocumentId}
                  photoPath={`/parent-portal/children/${child.id}/photo`}
                  shape="rectangle"
                  width={240}
                  height={300}
                />
                {latestAward ? (
                  <span
                    className="absolute -top-2 -right-2 flex size-9 items-center justify-center rounded-full bg-warning text-warning-foreground shadow-md"
                    title="Player of the Week"
                  >
                    <Star className="size-4.5" fill="currentColor" />
                  </span>
                ) : null}
              </div>
              <div className="space-y-1.5">
                <h2 className="flex items-center justify-center gap-2 text-lg font-bold tracking-tight">
                  {child.firstName} {child.lastName}
                </h2>
                {child.playerCode ? (
                  <p className="font-mono text-xs text-muted-foreground">{child.playerCode}</p>
                ) : null}
                <p className="text-sm text-muted-foreground">
                  {child.team?.name ?? "No team"} · {child.ageCategory?.name ?? "No age category"}
                </p>
                <StatusBadge status={child.status} />
              </div>
            </CardContent>
          </Card>

          <div className="lg:col-span-2">
            <Tabs defaultValue="overview">
              <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="attendance">Attendance</TabsTrigger>
              <TabsTrigger value="assessments">Assessments</TabsTrigger>
              <TabsTrigger value="activity-marks">Activity Marks</TabsTrigger>
              <TabsTrigger value="matches">Matches</TabsTrigger>
              <TabsTrigger value="financial">Financial</TabsTrigger>
              <TabsTrigger value="statement">Statement</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {latestAward ? (
                <div className="flex items-center gap-3 rounded-xl border border-warning/30 bg-warning/5 p-4">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-warning text-warning-foreground">
                    <Star className="size-4.5" fill="currentColor" />
                  </span>
                  <p className="text-sm">
                    <span className="font-semibold text-foreground">Player of the Week</span>{" "}
                    for {latestAward.team.name} — {child.firstName} trained hard this week and it's showing!
                  </p>
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
                <StatCard
                  icon={CheckCircle2}
                  label="Attendance"
                  value={attendancePercent !== null ? `${attendancePercent}%` : "–"}
                  highlight={attendancePercent !== null && attendancePercent >= 80}
                />
                <StatCard
                  icon={Trophy}
                  label="Next match"
                  value={nextMatch ? formatDate(nextMatch.match.matchDate) : "None scheduled"}
                />
                <StatCard
                  icon={CalendarClock}
                  label="Fees"
                  value={finance ? FINANCE_LABEL[finance.status] : "–"}
                  highlight={finance?.status === "OVERDUE"}
                />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Player Development</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {skillScores.length === 0 ? (
                    <EmptyState
                      title="No assessments yet"
                      description="Development scores will appear here once a coach records an assessment."
                    />
                  ) : (
                    skillScores.map((s) => (
                      <ProgressBar key={s.category} label={CATEGORY_LABELS[s.category]} value={s.percent} />
                    ))
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
                  <CardTitle className="text-base">Coach Feedback</CardTitle>
                  <CoachFeedbackDialog playerId={child.id} />
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Share feedback about your child's coach with the academy.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="attendance">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Attendance History</CardTitle>
                </CardHeader>
                <CardContent>
                  {!attendance || attendance.length === 0 ? (
                    <EmptyState title="No attendance recorded yet" />
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Team</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {attendance.map((a) => (
                          <TableRow key={a.id}>
                            <TableCell>{formatDate(a.trainingSession.date)}</TableCell>
                            <TableCell>{a.trainingSession.team.name}</TableCell>
                            <TableCell>
                              <StatusBadge status={a.status} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="assessments">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Assessment History</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {!assessments || assessments.length === 0 ? (
                    <EmptyState title="No assessments yet" />
                  ) : (
                    assessments.map((a) => (
                      <div key={a.id} className="rounded-lg border border-border p-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">{a.template?.name ?? "Training session"}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(a.assessmentDate)}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          By {a.assessedByCoach.firstName} {a.assessedByCoach.lastName}
                        </p>
                        <ul className="mt-2 flex flex-wrap gap-2">
                          {a.ratings.map((r) => (
                            <li key={r.id} className="rounded-full border border-border px-2 py-0.5 text-xs">
                              {r.criteria?.name ?? r.sessionActivity?.name ?? "Rating"}: {r.ratingLabel ?? r.ratingValue}
                            </li>
                          ))}
                        </ul>
                        {a.strengths ? <p className="mt-2 text-sm">{a.strengths}</p> : null}
                        {a.areasForImprovement ? (
                          <p className="mt-1 text-sm text-muted-foreground">{a.areasForImprovement}</p>
                        ) : null}
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activity-marks" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Marks Over Time</CardTitle>
                  <CardDescription>Your child's activity marks from training, oldest to newest</CardDescription>
                </CardHeader>
                <CardContent>
                  {!activityMarks || activityMarks.length === 0 ? (
                    <EmptyState
                      title="No marks yet"
                      description="Marks will appear here once a coach rates your child during training."
                    />
                  ) : (
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={activityMarks
                            .slice()
                            .reverse()
                            .map((m) => ({
                              label: new Date(m.createdAt).toLocaleDateString("en-US", { day: "numeric", month: "short" }),
                              rating: m.rating,
                              activity: m.trainingActivity.name,
                            }))}
                          margin={{ top: 8, right: 8, left: -20, bottom: 8 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                          <XAxis
                            dataKey="label"
                            tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                            tickLine={false}
                            axisLine={{ stroke: "var(--border)" }}
                          />
                          <YAxis
                            domain={[0, 10]}
                            allowDecimals={false}
                            tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                            tickLine={false}
                            axisLine={false}
                          />
                          <Tooltip
                            contentStyle={{
                              background: "var(--popover)",
                              border: "1px solid var(--border)",
                              borderRadius: 8,
                              fontSize: 13,
                            }}
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
                <CardHeader>
                  <CardTitle className="text-base">Mark History</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {!activityMarks || activityMarks.length === 0 ? (
                    <EmptyState title="No marks yet" />
                  ) : (
                    activityMarks.map((m) => (
                      <div key={m.id} className="rounded-lg border border-border p-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">{m.trainingActivity.name}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(m.createdAt)}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">{m.trainingActivity.trainingPlan.title}</p>
                        <p className="mt-1 text-sm font-medium">{m.rating}/10</p>
                        {m.remarks ? <p className="mt-1 text-sm text-muted-foreground">{m.remarks}</p> : null}
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="matches">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Match History</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {!matches || matches.length === 0 ? (
                    <EmptyState title="No matches yet" />
                  ) : (
                    matches.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between border-b border-border/60 py-2 text-sm last:border-0"
                      >
                        <span>
                          {m.match.team.name} vs {m.match.opponent.name} · {formatDate(m.match.matchDate)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {m.isStarting ? "Starting XI" : m.isSubstitute ? "Substitute" : "Squad"}
                        </span>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="financial">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Financial Account</CardTitle>
                </CardHeader>
                <CardContent>
                  {finance ? (
                    <div className="flex flex-wrap items-center gap-6">
                      <div>
                        <p className="text-xs text-muted-foreground">Status</p>
                        <Badge variant={FINANCE_BADGE[finance.status]}>{FINANCE_LABEL[finance.status]}</Badge>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Total due</p>
                        <p className="text-sm font-medium">{formatCurrency(finance.totalDue)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Paid to date</p>
                        <p className="text-sm font-medium">{formatCurrency(finance.paidToDate)}</p>
                      </div>
                      {finance.nextDueDate ? (
                        <div>
                          <p className="text-xs text-muted-foreground">Next due date</p>
                          <p className="text-sm font-medium">{formatDate(finance.nextDueDate)}</p>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <LoadingState rows={1} />
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="statement">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Statement of Account</CardTitle>
                  <CardDescription>Every bill and payment on record for {child.firstName}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="mb-3 text-sm font-semibold">Bills</h3>
                    {statementLoading ? (
                      <LoadingState rows={2} />
                    ) : !statement || statement.invoices.length === 0 ? (
                      <EmptyState title="No bills yet" description="Invoices are generated automatically." />
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Invoice #</TableHead>
                            <TableHead>Fee</TableHead>
                            <TableHead>Issued</TableHead>
                            <TableHead>Due</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Remaining</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {statement.invoices.map((invoice) => (
                            <TableRow key={invoice.id}>
                              <TableCell className="font-mono text-xs">{invoice.invoiceNumber}</TableCell>
                              <TableCell>{invoice.feeTypeName}</TableCell>
                              <TableCell>{formatDate(invoice.issuedAt)}</TableCell>
                              <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                              <TableCell className="tabular-nums">{formatCurrency(invoice.amount)}</TableCell>
                              <TableCell className="tabular-nums">{formatCurrency(Math.max(invoice.remaining, 0))}</TableCell>
                              <TableCell>
                                <StatusBadge status={invoice.status} />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </div>

                  <div>
                    <h3 className="mb-3 text-sm font-semibold">Payments</h3>
                    {statementLoading ? (
                      <LoadingState rows={2} />
                    ) : !statement || statement.payments.length === 0 ? (
                      <EmptyState title="No payments yet" description="Payments recorded for this player will appear here." />
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Receipt #</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Fee</TableHead>
                            <TableHead>Method</TableHead>
                            <TableHead>Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {statement.payments.map((row) => (
                            <TableRow key={`${row.paymentId}-${row.invoiceId}`}>
                              <TableCell className="font-mono text-xs">{row.receiptNumber}</TableCell>
                              <TableCell>{formatDate(row.paidAt)}</TableCell>
                              <TableCell>{row.feeTypeName}</TableCell>
                              <TableCell>{PAYMENT_METHOD_LABEL[row.method] ?? row.method}</TableCell>
                              <TableCell className="tabular-nums">{formatCurrency(row.amount)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
