import { formatDate } from "@/lib/date"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import { motion } from "framer-motion"
import {
  AlertCircle,
  ArrowLeft,
  Award,
  CheckCircle2,
  Layers,
  LineChart as LineChartIcon,
  Lock,
  MessagesSquare,
  Minus,
  Pencil,
  Phone,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Trophy,
  Users,
} from "lucide-react"
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import { ROLE_NAMES } from "@/lib/shared-types"
import { DashboardLayout } from "@/app/dashboard-layout"
import { useAuth } from "@/app/auth-context"
import { RECEPTIONIST_NAV_ITEMS } from "@/features/dashboard-receptionist/receptionist-dashboard"
import { InvoiceSection } from "@/features/finance/invoice-section"
import { PlayerStatement } from "@/features/finance/player-statement"
import { usePlayerInvoices } from "@/features/finance/finance-api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { StatusBadge } from "@/design-system/status-badge"
import { LoadingState } from "@/design-system/loading-state"
import { ErrorState } from "@/design-system/error-state"
import { EmptyState } from "@/design-system/empty-state"
import { ProgressBar } from "@/design-system/progress-bar"
import { ApiError } from "@/lib/api-client"
import { cn } from "@/lib/utils"
import {
  assessmentAveragePercent,
  CATEGORY_LABELS,
  computeCategoryScores,
  computeDevelopmentNote,
  type AssessmentCategory,
  type DevelopmentTrend,
} from "@/lib/assessment-categories"
import { useTeams, useTrainingGroups } from "@/features/dashboard-admin/academy-config-api"
import { usePlayerAssessments, usePlayerRemarks } from "@/features/assessments/assessments-api"
import { PlayerPhoto } from "./player-photo"
import { PlayerAttendanceTab } from "./player-attendance-tab"
import { useApprovePlayer, usePlayer, useUpdatePlayer, type Player } from "./players-api"
import { RegistrationPaymentCollector } from "./registration-payment-collector"

const PROFILE_TABS = ["overview", "development", "financial", "statement", "team", "attendance"]

interface EditPlayerFormValues {
  firstName: string
  middleName: string
  lastName: string
  dateOfBirth: string
  gender: "MALE" | "FEMALE" | "OTHER"
  nationality: string
  preferredPosition: string
  dominantFoot: "" | "LEFT" | "RIGHT" | "BOTH"
  residentialAddress: string
  previousExperience: string
  medicalNotes: string
  emergencyContactName: string
  emergencyContactPhone: string
}

function EditPlayerDetailsDialog({ player }: { player: Player }) {
  const [open, setOpen] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const updatePlayer = useUpdatePlayer(player.id)

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<EditPlayerFormValues>({
    defaultValues: {
      firstName: player.firstName,
      middleName: player.middleName ?? "",
      lastName: player.lastName,
      dateOfBirth: player.dateOfBirth.slice(0, 10),
      gender: player.gender,
      nationality: player.nationality ?? "",
      preferredPosition: player.preferredPosition ?? "",
      dominantFoot: player.dominantFoot ?? "",
      residentialAddress: player.residentialAddress ?? "",
      previousExperience: player.previousExperience ?? "",
      medicalNotes: player.medicalNotes ?? "",
      emergencyContactName: player.emergencyContactName ?? "",
      emergencyContactPhone: player.emergencyContactPhone ?? "",
    },
  })

  const onOpenChange = (next: boolean) => {
    setOpen(next)
    if (next) {
      reset({
        firstName: player.firstName,
        middleName: player.middleName ?? "",
        lastName: player.lastName,
        dateOfBirth: player.dateOfBirth.slice(0, 10),
        gender: player.gender,
        nationality: player.nationality ?? "",
        preferredPosition: player.preferredPosition ?? "",
        dominantFoot: player.dominantFoot ?? "",
        residentialAddress: player.residentialAddress ?? "",
        previousExperience: player.previousExperience ?? "",
        medicalNotes: player.medicalNotes ?? "",
        emergencyContactName: player.emergencyContactName ?? "",
        emergencyContactPhone: player.emergencyContactPhone ?? "",
      })
    }
    setServerError(null)
  }

  const onSubmit = async (values: EditPlayerFormValues) => {
    setServerError(null)
    try {
      await updatePlayer.mutateAsync({
        firstName: values.firstName,
        middleName: values.middleName || undefined,
        lastName: values.lastName,
        dateOfBirth: values.dateOfBirth,
        gender: values.gender,
        nationality: values.nationality || undefined,
        preferredPosition: values.preferredPosition || undefined,
        dominantFoot: values.dominantFoot || undefined,
        residentialAddress: values.residentialAddress || undefined,
        previousExperience: values.previousExperience || undefined,
        medicalNotes: values.medicalNotes || undefined,
        emergencyContactName: values.emergencyContactName || undefined,
        emergencyContactPhone: values.emergencyContactPhone || undefined,
      })
      setOpen(false)
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : "Could not save changes.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Pencil /> Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit player details</DialogTitle>
          <DialogDescription>Changes save immediately, even for already-registered players.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-firstName">First name</Label>
              <Input id="edit-firstName" {...register("firstName", { required: true })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-lastName">Last name</Label>
              <Input id="edit-lastName" {...register("lastName", { required: true })} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-middleName">Middle name</Label>
              <Input id="edit-middleName" {...register("middleName")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-dob">Date of birth</Label>
              <Input id="edit-dob" type="date" {...register("dateOfBirth", { required: true })} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-gender">Gender</Label>
              <Select id="edit-gender" {...register("gender")}>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-nationality">Nationality</Label>
              <Input id="edit-nationality" {...register("nationality")} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-position">Preferred position</Label>
              <Input id="edit-position" {...register("preferredPosition")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-foot">Dominant foot</Label>
              <Select id="edit-foot" {...register("dominantFoot")}>
                <option value="">Not set</option>
                <option value="LEFT">Left</option>
                <option value="RIGHT">Right</option>
                <option value="BOTH">Both</option>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-address">Residential address</Label>
            <Input id="edit-address" {...register("residentialAddress")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-experience">Previous experience</Label>
            <Textarea id="edit-experience" rows={2} {...register("previousExperience")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-medical">Medical / emergency notes</Label>
            <Textarea id="edit-medical" rows={2} {...register("medicalNotes")} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-ec-name">Emergency contact</Label>
              <Input id="edit-ec-name" {...register("emergencyContactName")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-ec-phone">Emergency phone</Label>
              <Input id="edit-ec-phone" {...register("emergencyContactPhone")} />
            </div>
          </div>
          {serverError ? <p className="text-sm text-destructive">{serverError}</p> : null}
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

const CATEGORY_BAR_COLORS: Record<AssessmentCategory, string> = {
  TECHNICAL: "bg-chart-1",
  TACTICAL: "bg-chart-2",
  PHYSICAL: "bg-chart-3",
  MENTAL_BEHAVIOURAL: "bg-chart-4",
}

const TREND_STYLES: Record<DevelopmentTrend, { icon: typeof TrendingUp; card: string; icon_wrap: string }> = {
  improving: { icon: TrendingUp, card: "border-success/30 bg-success/5", icon_wrap: "bg-success/15 text-success" },
  declining: { icon: TrendingDown, card: "border-destructive/30 bg-destructive/5", icon_wrap: "bg-destructive/15 text-destructive" },
  steady: { icon: Minus, card: "border-warning/30 bg-warning/5", icon_wrap: "bg-warning/15 text-warning" },
  single: { icon: Minus, card: "border-info/30 bg-info/5", icon_wrap: "bg-info/15 text-info" },
  none: { icon: Minus, card: "border-border bg-muted/30", icon_wrap: "bg-muted text-muted-foreground" },
}

function SectionIcon({ icon: Icon, className }: { icon: typeof Award; className?: string }) {
  return (
    <div className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", className)}>
      <Icon className="size-4" />
    </div>
  )
}

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

export function PlayerDevelopmentTab({ playerId }: { playerId: string }) {
  const { data: assessments, isLoading: assessmentsLoading } = usePlayerAssessments(playerId)
  const { data: remarks, isLoading: remarksLoading } = usePlayerRemarks(playerId)
  const skillScores = assessments ? computeCategoryScores(assessments) : []
  const developmentNote = assessments ? computeDevelopmentNote(assessments) : null
  const trendStyle = developmentNote ? TREND_STYLES[developmentNote.trend] : null

  const trendData = (assessments ?? [])
    .slice()
    .sort((a, b) => new Date(a.assessmentDate).getTime() - new Date(b.assessmentDate).getTime())
    .map((a) => {
      const percent = assessmentAveragePercent(a)
      return percent !== null ? { label: shortDate(a.assessmentDate), rating: Math.round(percent) } : null
    })
    .filter((d): d is { label: string; rating: number } => d !== null)

  return (
    <div className="space-y-6">
      {developmentNote && trendStyle ? (
        <Card className={trendStyle.card}>
          <CardHeader className="flex-row items-center gap-3 space-y-0">
            <SectionIcon icon={trendStyle.icon} className={trendStyle.icon_wrap} />
            <CardTitle className="text-base">Development Note</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{developmentNote.text}</p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="flex-row items-center gap-3 space-y-0">
          <SectionIcon icon={LineChartIcon} className="bg-chart-3/10 text-chart-3" />
          <CardTitle className="text-base">Rating Trend</CardTitle>
        </CardHeader>
        <CardContent>
          {assessmentsLoading ? (
            <LoadingState rows={3} />
          ) : trendData.length < 2 ? (
            <EmptyState
              title="Not enough data yet"
              description="A trend chart will appear once there are at least two assessments to compare."
            />
          ) : (
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 8, right: 8, left: -20, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="label" tick={chartAxisTick} tickLine={false} axisLine={{ stroke: "var(--border)" }} />
                  <YAxis domain={[0, 100]} tick={chartAxisTick} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={chartTooltipStyle} formatter={(v) => [`${v}%`, "Rating"]} />
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
          <SectionIcon icon={Trophy} className="bg-primary/10 text-primary" />
          <CardTitle className="text-base">Player Development</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {assessmentsLoading ? (
            <LoadingState rows={4} />
          ) : skillScores.length === 0 ? (
            <EmptyState
              title="No assessments yet"
              description="Development scores will appear here once a coach records an assessment."
            />
          ) : (
            skillScores.map((s) => (
              <ProgressBar
                key={s.category}
                label={CATEGORY_LABELS[s.category]}
                value={s.percent}
                barClassName={CATEGORY_BAR_COLORS[s.category]}
              />
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center gap-3 space-y-0">
          <SectionIcon icon={Award} className="bg-chart-2/10 text-chart-2" />
          <CardTitle className="text-base">Assessment History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {assessmentsLoading ? (
            <LoadingState rows={3} />
          ) : !assessments || assessments.length === 0 ? (
            <EmptyState title="No assessments yet" />
          ) : (
            assessments.map((a) => (
              <div key={a.id} className="rounded-lg border border-border p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{a.template?.name ?? "Session assessment"}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(a.assessmentDate)}</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  By {a.assessedByCoach.firstName} {a.assessedByCoach.lastName}
                </p>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {a.ratings.map((r) => (
                    <li key={r.id} className="rounded-full border border-border px-2 py-0.5 text-xs">
                      {r.criteria?.name ?? r.sessionActivity?.name}: {r.ratingLabel ?? r.ratingValue}
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

      <Card>
        <CardHeader className="flex-row items-center gap-3 space-y-0">
          <SectionIcon icon={MessagesSquare} className="bg-chart-3/10 text-chart-3" />
          <CardTitle className="text-base">Coach Remarks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {remarksLoading ? (
            <LoadingState rows={2} />
          ) : !remarks || remarks.length === 0 ? (
            <EmptyState title="No remarks yet" description="Coach remarks about this player will appear here." />
          ) : (
            remarks.map((r) => (
              <div key={r.id} className="border-b border-border/60 pb-3 text-sm last:border-0">
                <div className="flex items-center justify-between">
                  <p className="font-medium">
                    {r.coach.firstName} {r.coach.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDate(r.createdAt)}</p>
                </div>
                <p className="mt-1 text-muted-foreground">{r.remark}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-border/60 py-2 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value ?? "—"}</span>
    </div>
  )
}

function TeamAssignmentCard({ player }: { player: NonNullable<ReturnType<typeof usePlayer>["data"]> }) {
  const { data: teams } = useTeams()
  const { data: trainingGroups } = useTrainingGroups()
  const updatePlayer = useUpdatePlayer(player.id)
  const [teamId, setTeamId] = useState(player.team?.id ?? "")
  const [trainingGroupId, setTrainingGroupId] = useState(player.trainingGroup?.id ?? "")
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const groupsForTeam = trainingGroups?.filter((g) => g.teamId === teamId)
  const locked = player.status !== "ACTIVE"
  const selectedTeam = teams?.find((t) => t.id === teamId)
  const hasCurrentAssignment = !locked && (player.team || player.trainingGroup)

  const onSave = async () => {
    setSaveError(null)
    setSaved(false)
    try {
      await updatePlayer.mutateAsync({
        teamId: teamId || undefined,
        trainingGroupId: trainingGroupId || undefined,
      })
      setSaved(true)
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Could not save team assignment.")
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Team Assignment</CardTitle>
        <CardDescription>Place {player.firstName} on a team and, optionally, a training group.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {locked ? (
          <div className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm">
            <Lock className="mt-0.5 size-4 shrink-0 text-warning" />
            <div>
              <p className="font-medium">Locked until payment is collected</p>
              <p className="mt-1 text-muted-foreground">
                Team assignment unlocks once the registration payment is confirmed.
              </p>
            </div>
          </div>
        ) : null}

        {hasCurrentAssignment ? (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-muted/40 p-3 text-sm">
            <span className="text-muted-foreground">Currently on</span>
            {player.team ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-background px-2.5 py-1 font-medium ring-1 ring-border">
                <Users className="size-3.5 text-muted-foreground" /> {player.team.name}
              </span>
            ) : null}
            {player.trainingGroup ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-background px-2.5 py-1 font-medium ring-1 ring-border">
                <Layers className="size-3.5 text-muted-foreground" /> {player.trainingGroup.name}
              </span>
            ) : null}
          </div>
        ) : null}

        {saveError ? (
          <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
            <p>{saveError}</p>
          </div>
        ) : null}
        {saved ? (
          <div className="flex items-center gap-2 rounded-xl border border-success/30 bg-success/10 p-3 text-sm text-success">
            <CheckCircle2 className="size-4 shrink-0" /> Team assignment saved.
          </div>
        ) : null}

        <fieldset disabled={locked} className="contents">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <Users className="size-3.5 text-muted-foreground" /> Team
            </Label>
            <Select
              value={teamId}
              onChange={(e) => {
                setTeamId(e.target.value)
                setTrainingGroupId("")
              }}
            >
              <option value="">No team</option>
              {teams?.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
            {selectedTeam ? (
              <p className="text-xs text-muted-foreground">
                {selectedTeam.ageCategory.name} · {selectedTeam.season.name}
              </p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <Layers className="size-3.5 text-muted-foreground" /> Training group
            </Label>
            <Select value={trainingGroupId} onChange={(e) => setTrainingGroupId(e.target.value)} disabled={!teamId}>
              <option value="">No training group</option>
              {groupsForTeam?.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </Select>
            {teamId && groupsForTeam?.length === 0 ? (
              <p className="text-xs text-muted-foreground">No training groups set up for this team yet.</p>
            ) : null}
          </div>
        </div>
        <div className="border-t border-border pt-4">
          <Button size="sm" disabled={locked || updatePlayer.isPending} onClick={() => void onSave()}>
            {updatePlayer.isPending ? "Saving…" : "Save assignment"}
          </Button>
        </div>
        </fieldset>
      </CardContent>
    </Card>
  )
}

export function PlayerProfilePage() {
  const { playerId } = useParams<{ playerId: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { hasRole } = useAuth()
  const navItems = hasRole(ROLE_NAMES.ADMIN) ? undefined : RECEPTIONIST_NAV_ITEMS
  const { data: player, isLoading, isError, refetch } = usePlayer(playerId)
  const { data: invoices } = usePlayerInvoices(playerId)
  const approvePlayer = useApprovePlayer(playerId ?? "")
  const [actionError, setActionError] = useState<string | null>(null)
  const [justPaidRegistration, setJustPaidRegistration] = useState(false)
  const hasPendingInvoice = invoices?.some((inv) => inv.status === "PENDING" || inv.status === "PARTIALLY_PAID")
  const isPreRegistrationPayment =
    player?.status === "DRAFT" ||
    player?.status === "PENDING_PARENT_INFO" ||
    player?.status === "SUBMITTED" ||
    player?.status === "PENDING_REGISTRATION_PAYMENT"
  const requestedTab = searchParams.get("tab")
  const initialTab = requestedTab && PROFILE_TABS.includes(requestedTab) ? requestedTab : "overview"

  const runAction = async (action: () => Promise<unknown>) => {
    setActionError(null)
    try {
      await action()
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Action failed. Please try again.")
    }
  }

  return (
    <DashboardLayout title="Player Profile" navItems={navItems}>
      <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate("/receptionist")}>
        <ArrowLeft /> Back to players
      </Button>

      {isLoading ? (
        <LoadingState rows={6} />
      ) : isError || !player ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardContent className="flex flex-col items-center gap-4 pt-6 text-center">
              <PlayerPhoto
                playerId={player.id}
                photoDocumentId={player.photoDocumentId}
                editable
                shape="rectangle"
                width={280}
                height={340}
              />
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: 0.1 }}
                className="space-y-1.5"
              >
                <h2 className="text-lg font-semibold">
                  {player.firstName} {player.lastName}
                </h2>
                {player.playerCode ? (
                  <p className="font-mono text-xs text-muted-foreground">{player.playerCode}</p>
                ) : null}
                <StatusBadge status={player.status} />
              </motion.div>
            </CardContent>
          </Card>

          <div className="lg:col-span-2">
            <Tabs defaultValue={initialTab}>
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                {hasRole(ROLE_NAMES.ADMIN) ? <TabsTrigger value="development">Development</TabsTrigger> : null}
                <TabsTrigger value="financial">Financial</TabsTrigger>
                <TabsTrigger value="statement">Statement</TabsTrigger>
                <TabsTrigger value="team">Team</TabsTrigger>
                <TabsTrigger value="attendance">Attendance</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                <Card>
                  <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
                    <CardTitle className="text-base">Registration Progress</CardTitle>
                    <ShieldCheck className="size-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {player.status === "ACTIVE"
                        ? "Registration complete — this player is active at the academy."
                        : (
                          <>
                            Registration payment pending — handled from the{" "}
                            <span className="font-medium text-foreground">Financial</span> tab.
                          </>
                        )}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
                    <CardTitle className="text-base">Player Details</CardTitle>
                    <EditPlayerDetailsDialog player={player} />
                  </CardHeader>
                  <CardContent>
                    <InfoRow label="Date of birth" value={formatDate(player.dateOfBirth)} />
                    <InfoRow label="Gender" value={player.gender} />
                    <InfoRow label="Nationality" value={player.nationality} />
                    <InfoRow label="Age category" value={player.ageCategory?.name} />
                    <InfoRow label="Preferred position" value={player.preferredPosition} />
                    <InfoRow label="Dominant foot" value={player.dominantFoot} />
                    <InfoRow label="Residential address" value={player.residentialAddress} />
                    <InfoRow label="Previous experience" value={player.previousExperience} />
                    <InfoRow label="Medical / emergency notes" value={player.medicalNotes} />
                    <InfoRow label="Emergency contact" value={player.emergencyContactName} />
                    <InfoRow label="Emergency phone" value={player.emergencyContactPhone} />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Guardians</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {player.guardians.map((link) => (
                      <div
                        key={link.id}
                        className="flex items-center justify-between rounded-lg border border-border p-3"
                      >
                        <div>
                          <p className="text-sm font-medium">
                            {link.guardian.firstName} {link.guardian.lastName}
                            {link.isPrimary ? (
                              <span className="ml-2 text-xs font-normal text-accent-foreground">Primary</span>
                            ) : null}
                          </p>
                          <p className="text-xs text-muted-foreground">{link.relationship}</p>
                        </div>
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Phone className="size-3.5" />
                          {link.guardian.phone}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              {hasRole(ROLE_NAMES.ADMIN) ? (
                <TabsContent value="development">
                  <PlayerDevelopmentTab playerId={player.id} />
                </TabsContent>
              ) : null}

              <TabsContent value="financial" className="space-y-6">
                {actionError ? <p className="text-sm text-destructive">{actionError}</p> : null}
                {player.status === "DRAFT" ||
                player.status === "PENDING_PARENT_INFO" ||
                player.status === "SUBMITTED" ||
                (player.status === "PENDING_REGISTRATION_PAYMENT" && !hasPendingInvoice) ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Registration Payment</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {player.status === "PENDING_REGISTRATION_PAYMENT" ? (
                        <p className="text-sm text-destructive">
                          This player has no invoice to pay — generate one to continue.
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          No invoice yet — proceed to payment to generate the registration invoice.
                        </p>
                      )}
                      <Button
                        size="sm"
                        disabled={approvePlayer.isPending}
                        onClick={() => void runAction(() => approvePlayer.mutateAsync())}
                      >
                        {approvePlayer.isPending ? "Preparing invoice…" : "Proceed to payment"}
                      </Button>
                    </CardContent>
                  </Card>
                ) : null}
                {(player.status === "PENDING_REGISTRATION_PAYMENT" && hasPendingInvoice) || justPaidRegistration ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Registration Payment</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <RegistrationPaymentCollector
                        playerId={player.id}
                        playerName={`${player.firstName} ${player.lastName}`}
                        onPaymentRecorded={() => setJustPaidRegistration(true)}
                      />
                    </CardContent>
                  </Card>
                ) : null}
                {/* Invoices & Payments duplicates the Registration Payment card above while
                    a player's first invoice is still outstanding, or while the just-recorded
                    receipt is still on screen — only show it once that's settled. */}
                {!isPreRegistrationPayment && !justPaidRegistration ? <InvoiceSection playerId={player.id} /> : null}
              </TabsContent>

              <TabsContent value="statement">
                <PlayerStatement
                  playerId={player.id}
                  playerName={`${player.firstName} ${player.lastName}`}
                  playerCode={player.playerCode}
                />
              </TabsContent>

              <TabsContent value="team">
                <TeamAssignmentCard player={player} />
              </TabsContent>

              <TabsContent value="attendance">
                <PlayerAttendanceTab playerId={player.id} />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
