import { formatDate } from "@/lib/date"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, ClipboardList, Dumbbell, Plus, Star, Trash2 } from "lucide-react"

import { DashboardLayout } from "@/app/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { StatusBadge } from "@/design-system/status-badge"
import { LoadingState } from "@/design-system/loading-state"
import { ErrorState } from "@/design-system/error-state"
import { ApiError } from "@/lib/api-client"
import { COACH_NAV_ITEMS } from "@/features/dashboard-coach/coach-dashboard"
import { useAddTrainingActivity, useRemoveTrainingActivity, useSubmitTrainingPlan, useTrainingPlan } from "./training-api"
import { RateActivityPlayersDialog } from "./rate-activity-players-dialog"

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-border/60 py-2 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value ?? "—"}</span>
    </div>
  )
}

const activitySchema = z.object({
  name: z.string().min(1, "Name is required"),
  durationMinutes: z.string().optional(),
})
type ActivityFormValues = z.infer<typeof activitySchema>

export function TrainingPlanEditorPage() {
  const { planId } = useParams<{ planId: string }>()
  const navigate = useNavigate()
  const { data: plan, isLoading, isError, refetch } = useTrainingPlan(planId)
  const addActivity = useAddTrainingActivity(planId ?? "")
  const removeActivity = useRemoveTrainingActivity(planId ?? "")
  const submitPlan = useSubmitTrainingPlan(planId ?? "")
  const [actionError, setActionError] = useState<string | null>(null)
  const [ratingActivity, setRatingActivity] = useState<{ id: string; name: string } | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ActivityFormValues>({ resolver: zodResolver(activitySchema) })

  const runAction = async (action: () => Promise<unknown>) => {
    setActionError(null)
    try {
      await action()
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Action failed. Please try again.")
    }
  }

  const onAddActivity = async (values: ActivityFormValues) => {
    await runAction(() =>
      addActivity.mutateAsync({
        name: values.name,
        durationMinutes: values.durationMinutes ? Number(values.durationMinutes) : undefined,
      }),
    )
    reset()
  }

  const isEditable = plan?.approvalStatus === "DRAFT" || plan?.approvalStatus === "CHANGES_REQUESTED"
  const latestApproval = plan?.approvals[0]

  return (
    <DashboardLayout title="Training Plan" navItems={COACH_NAV_ITEMS}>
      <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate("/coach")}>
        <ArrowLeft /> Back to plans
      </Button>

      {isLoading ? (
        <LoadingState rows={6} />
      ) : isError || !plan ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <ClipboardList className="size-4.5" />
                </div>
                <div>
                  <CardTitle className="text-base">{plan.title}</CardTitle>
                  <p className="text-sm text-muted-foreground">{plan.team.name}</p>
                </div>
              </div>
              <StatusBadge status={plan.approvalStatus} />
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditable ? (
                <p className="rounded-lg border border-info/30 bg-info/10 p-3 text-sm text-muted-foreground">
                  Add at least one activity below, then submit this plan for your head coach to review.
                </p>
              ) : null}
              {actionError ? <p className="text-sm text-destructive">{actionError}</p> : null}
              {latestApproval?.comments &&
              (plan.approvalStatus === "CHANGES_REQUESTED" || plan.approvalStatus === "REJECTED") ? (
                <p className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm">
                  <span className="font-medium">Reviewer feedback: </span>
                  {latestApproval.comments}
                </p>
              ) : null}
              <InfoRow label="Objectives" value={plan.objectives} />
              <InfoRow label="Scheduled date" value={formatDate(plan.scheduledDate)} />
              <InfoRow label="Location" value={plan.location} />
              <InfoRow label="Skills focus" value={plan.skillsFocus} />
              {isEditable ? (
                <Button
                  size="sm"
                  disabled={submitPlan.isPending || plan.activities.length === 0}
                  onClick={() => void runAction(() => submitPlan.mutateAsync())}
                >
                  {submitPlan.isPending ? "Submitting…" : "Submit for approval"}
                </Button>
              ) : null}
              {isEditable && plan.activities.length === 0 ? (
                <p className="text-xs text-muted-foreground">Add at least one activity before submitting.</p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center gap-3 space-y-0">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-chart-3/10 text-chart-3">
                <Dumbbell className="size-4.5" />
              </div>
              <div>
                <CardTitle className="text-base">Activities</CardTitle>
                <CardDescription>The drills your team will run through this session.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {plan.activities.length === 0 ? (
                <p className="text-sm text-muted-foreground">No activities added yet.</p>
              ) : (
                plan.activities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center justify-between rounded-lg border border-border p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{activity.name}</p>
                      {activity.durationMinutes ? (
                        <p className="text-xs text-muted-foreground">{activity.durationMinutes} min</p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setRatingActivity({ id: activity.id, name: activity.name })}
                      >
                        <Star /> Rate players
                      </Button>
                      {isEditable ? (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Remove ${activity.name}`}
                          onClick={() => void runAction(() => removeActivity.mutateAsync(activity.id))}
                        >
                          <Trash2 className="text-destructive" />
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))
              )}

              {isEditable ? (
                <form className="flex items-end gap-2 pt-2" onSubmit={handleSubmit(onAddActivity)} noValidate>
                  <div className="flex-1 space-y-1.5">
                    <Label htmlFor="activity-name">Activity name</Label>
                    <Input id="activity-name" placeholder="Passing drills" {...register("name")} />
                    {errors.name ? <p className="text-xs text-destructive">{errors.name.message}</p> : null}
                  </div>
                  <div className="w-28 space-y-1.5">
                    <Label htmlFor="activity-duration">Minutes</Label>
                    <Input id="activity-duration" type="number" min={1} {...register("durationMinutes")} />
                  </div>
                  <Button type="submit" variant="outline" disabled={isSubmitting}>
                    <Plus /> Add
                  </Button>
                </form>
              ) : null}
            </CardContent>
          </Card>
        </div>
      )}

      {ratingActivity ? (
        <RateActivityPlayersDialog
          activityId={ratingActivity.id}
          activityName={ratingActivity.name}
          open={!!ratingActivity}
          onOpenChange={(next) => {
            if (!next) setRatingActivity(null)
          }}
        />
      ) : null}
    </DashboardLayout>
  )
}
