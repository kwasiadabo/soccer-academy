import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom"
import { motion } from "framer-motion"
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CalendarDays,
  Footprints,
  Globe2,
  Info,
  Sparkles,
  Target,
  UserRound,
  Users,
} from "lucide-react"

import { DashboardLayout } from "@/app/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RatingInput } from "@/components/ui/rating-input"
import { StatusBadge } from "@/design-system/status-badge"
import { LoadingState } from "@/design-system/loading-state"
import { ErrorState } from "@/design-system/error-state"
import { EmptyState } from "@/design-system/empty-state"
import { ApiError } from "@/lib/api-client"
import { calculateAge, formatDate, formatTime } from "@/lib/date"
import { COACH_NAV_ITEMS } from "@/features/dashboard-coach/coach-dashboard"
import { PlayerPhoto } from "@/features/players/player-photo"
import { usePlayer } from "@/features/players/players-api"
import { PlayerDevelopmentTab } from "@/features/players/player-profile-page"
import { useCurrentTeamSession, useTrainingSession, type SessionWithRoster } from "@/features/training/training-api"
import { useCreatePlayerAssessment, usePlayerAssessments, useUpdatePlayerAssessment } from "./assessments-api"
import type { AssessablePlayer } from "./player-assessment-dialogs"

// A small, bounded palette (matches the app's chart tokens) so each activity keeps a
// consistent color between the summary chip and its rating row, without turning into an
// arbitrary rainbow — five hues cycle for any number of activities.
const ACTIVITY_COLORS = [
  { text: "text-chart-1", bg: "bg-chart-1/8", border: "border-chart-1/25", dot: "bg-chart-1" },
  { text: "text-chart-2", bg: "bg-chart-2/8", border: "border-chart-2/25", dot: "bg-chart-2" },
  { text: "text-chart-3", bg: "bg-chart-3/8", border: "border-chart-3/25", dot: "bg-chart-3" },
  { text: "text-chart-4", bg: "bg-chart-4/8", border: "border-chart-4/25", dot: "bg-chart-4" },
  { text: "text-chart-5", bg: "bg-chart-5/8", border: "border-chart-5/25", dot: "bg-chart-5" },
]
function activityColor(index: number) {
  return ACTIVITY_COLORS[index % ACTIVITY_COLORS.length]
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

const notesOnlySchema = z.object({
  strengths: z.string().optional(),
  areasForImprovement: z.string().optional(),
})
type NotesOnlyFormValues = z.infer<typeof notesOnlySchema>

function SessionAssessmentForm({
  player,
  session,
  onSaved,
}: {
  player: AssessablePlayer
  session: SessionWithRoster
  onSaved: () => void
}) {
  const { data: existingAssessments } = usePlayerAssessments(player.id)
  const createAssessment = useCreatePlayerAssessment(player.id)
  const updateAssessment = useUpdatePlayerAssessment(player.id)
  const [ratings, setRatings] = useState<Record<string, number>>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [overriding, setOverriding] = useState(false)
  const sessionActivities = session.sessionActivities

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<NotesOnlyFormValues>({ resolver: zodResolver(notesOnlySchema) })

  const attendance = session.attendance.find((a) => a.playerId === player.id)
  const alreadyAssessedForSession = existingAssessments?.find((a) => a.trainingSessionId === session.id)

  const startOverride = () => {
    if (!alreadyAssessedForSession) return
    const initialRatings: Record<string, number> = {}
    alreadyAssessedForSession.ratings.forEach((r) => {
      if (r.sessionActivityId) initialRatings[r.sessionActivityId] = Number(r.ratingValue)
    })
    setRatings(initialRatings)
    reset({
      strengths: alreadyAssessedForSession.strengths ?? "",
      areasForImprovement: alreadyAssessedForSession.areasForImprovement ?? "",
    })
    setOverriding(true)
  }

  const cancelOverride = () => {
    setOverriding(false)
    setRatings({})
    reset({ strengths: "", areasForImprovement: "" })
  }

  const onSubmit = async (values: NotesOnlyFormValues) => {
    setServerError(null)
    const ratingEntries = sessionActivities
      .filter((a) => ratings[a.id] !== undefined)
      .map((a) => ({ sessionActivityId: a.id, ratingValue: ratings[a.id] }))
    if (ratingEntries.length === 0) {
      setServerError("Rate at least one activity")
      return
    }
    try {
      if (alreadyAssessedForSession && overriding) {
        await updateAssessment.mutateAsync({
          assessmentId: alreadyAssessedForSession.id,
          strengths: values.strengths || undefined,
          areasForImprovement: values.areasForImprovement || undefined,
          ratings: ratingEntries,
        })
      } else {
        await createAssessment.mutateAsync({
          trainingSessionId: session.id,
          strengths: values.strengths || undefined,
          areasForImprovement: values.areasForImprovement || undefined,
          ratings: ratingEntries,
        })
      }
      onSaved()
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : "Could not save assessment.")
    }
  }

  const sessionInfo = (
    <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/8 via-chart-2/6 to-transparent p-4 text-sm">
      <div className="flex items-center gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <CalendarDays className="size-4.5" />
        </div>
        <div>
          <p className="font-semibold">{session.team.name}</p>
          <p className="text-xs text-muted-foreground">
            {formatDate(session.date)}
            {session.startTime ? ` · ${session.startTime}–${session.endTime}` : ""}
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {sessionActivities.length > 0 ? (
          sessionActivities.map((a, i) => {
            const c = activityColor(i)
            return (
              <span
                key={a.id}
                className={`inline-flex items-center gap-1.5 rounded-full border ${c.border} ${c.bg} px-2.5 py-1 text-xs font-medium ${c.text}`}
              >
                <span className={`size-1.5 rounded-full ${c.dot}`} />
                {a.name}
              </span>
            )
          })
        ) : (
          <span className="text-muted-foreground">No activities set yet</span>
        )}
      </div>
    </div>
  )

  if (!attendance) {
    return (
      <div className="space-y-4">
        {sessionInfo}
        <div className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
          <div>
            <p className="font-medium">Attendance not marked yet</p>
            <p className="mt-1 text-muted-foreground">
              {player.firstName} hasn't been marked for this session. Mark attendance before assessing them.
            </p>
          </div>
        </div>
        <Button asChild size="sm">
          <Link to={`/coach/training-sessions/${session.id}`}>Go mark attendance</Link>
        </Button>
      </div>
    )
  }

  if (alreadyAssessedForSession && !overriding) {
    return (
      <div className="space-y-4">
        {sessionInfo}
        <div className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
          <div>
            <p className="font-medium">Already assessed</p>
            <p className="mt-1 text-muted-foreground">
              {player.firstName} was assessed for this session at{" "}
              {formatTime(alreadyAssessedForSession.assessmentDate)} by{" "}
              {alreadyAssessedForSession.assessedByCoach.firstName}{" "}
              {alreadyAssessedForSession.assessedByCoach.lastName}. Do you want to override the earlier ratings and
              assessment?
            </p>
          </div>
        </div>
        <Button size="sm" onClick={startOverride}>
          Override previous assessment
        </Button>
      </div>
    )
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      {sessionInfo}

      {overriding ? (
        <div className="flex items-start gap-3 rounded-xl border border-info/30 bg-info/10 p-4 text-sm">
          <Info className="mt-0.5 size-4 shrink-0 text-info" />
          <p>
            <span className="font-medium">Overriding previous assessment. </span>
            Saving will replace the earlier ratings and notes.{" "}
            <button type="button" className="font-medium underline" onClick={cancelOverride}>
              Cancel
            </button>
          </p>
        </div>
      ) : null}

      {sessionActivities.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No activities have been added to this session yet — add one from the session's roster page before
          assessing players.
        </p>
      ) : (
        <div className="space-y-2">
          {sessionActivities.map((activity, i) => {
            const c = activityColor(i)
            return (
              <div
                key={activity.id}
                className={`flex items-center justify-between gap-3 rounded-lg border ${c.border} ${c.bg} p-3`}
              >
                <div className="flex items-center gap-2">
                  <span className={`size-2 shrink-0 rounded-full ${c.dot}`} />
                  <span className="text-sm font-medium">{activity.name}</span>
                </div>
                <RatingInput
                  scale="SCALE_1_5"
                  value={ratings[activity.id]}
                  onChange={(value) => setRatings((prev) => ({ ...prev, [activity.id]: value }))}
                />
              </div>
            )
          })}
        </div>
      )}

      <div className="space-y-1.5">
        <Label>Strengths</Label>
        <Textarea rows={2} {...register("strengths")} />
      </div>
      <div className="space-y-1.5">
        <Label>Areas for improvement</Label>
        <Textarea rows={2} {...register("areasForImprovement")} />
      </div>

      {serverError ? <p className="text-sm text-destructive">{serverError}</p> : null}
      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting || sessionActivities.length === 0}>
          {isSubmitting ? "Saving…" : "Save assessment"}
        </Button>
      </div>
    </form>
  )
}

export function CoachPlayerAssessPage() {
  const { playerId } = useParams<{ playerId: string }>()
  const [searchParams] = useSearchParams()
  const explicitSessionId = searchParams.get("sessionId") ?? undefined
  const navigate = useNavigate()
  const [tab, setTab] = useState("assess")

  const { data: player, isLoading, isError, refetch } = usePlayer(playerId)
  const { data: explicitSession, isLoading: explicitSessionLoading } = useTrainingSession(explicitSessionId)
  const { data: resolvedSession, isLoading: resolvedSessionLoading } = useCurrentTeamSession(
    explicitSessionId ? undefined : player?.team?.id
  )
  const session = explicitSessionId ? explicitSession : resolvedSession
  const sessionLoading = explicitSessionId ? explicitSessionLoading : resolvedSessionLoading

  return (
    <DashboardLayout title="Assess Player" navItems={COACH_NAV_ITEMS}>
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
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList>
                <TabsTrigger value="assess">Assess</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
              </TabsList>

              <TabsContent value="assess">
                <Card>
                  <CardHeader className="flex-row items-center gap-3 space-y-0">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Sparkles className="size-4.5" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Rate against this session's activities</CardTitle>
                      <CardDescription>Each session has its own set of activities to rate.</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {!player.team ? (
                      <EmptyState
                        title="No team assigned"
                        description="This player isn't assigned to a team, so there's no training session to assess them against."
                      />
                    ) : sessionLoading ? (
                      <LoadingState rows={3} />
                    ) : !session ? (
                      <ErrorState onRetry={() => void refetch()} />
                    ) : (
                      <SessionAssessmentForm player={player} session={session} onSaved={() => setTab("history")} />
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="history">
                <PlayerDevelopmentTab playerId={player.id} />
              </TabsContent>
            </Tabs>
          </div>
        </motion.div>
      )}
    </DashboardLayout>
  )
}
