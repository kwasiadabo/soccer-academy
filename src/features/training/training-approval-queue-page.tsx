import { formatDate } from "@/lib/date"
import { useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Search, X } from "lucide-react"

import { DashboardLayout } from "@/app/dashboard-layout"
import { HEAD_COACH_NAV_ITEMS } from "@/features/dashboard-head-coach/head-coach-dashboard"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { EmptyState } from "@/design-system/empty-state"
import { LoadingState } from "@/design-system/loading-state"
import { ErrorState } from "@/design-system/error-state"
import { ApiError } from "@/lib/api-client"
import { useDecideTrainingPlan, useTrainingPlans, type TrainingPlan } from "./training-api"

const decisionSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED", "CHANGES_REQUESTED"]),
  comments: z.string().optional(),
})
type DecisionFormValues = z.infer<typeof decisionSchema>

function DecisionDialog({ plan, onClose }: { plan: TrainingPlan; onClose: () => void }) {
  const decide = useDecideTrainingPlan(plan.id)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<DecisionFormValues>({
    resolver: zodResolver(decisionSchema),
    defaultValues: { decision: "APPROVED" },
  })

  const onSubmit = async (values: DecisionFormValues) => {
    setServerError(null)
    try {
      await decide.mutateAsync(values)
      onClose()
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : "Could not record decision.")
    }
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{plan.title}</DialogTitle>
        <DialogDescription>
          {plan.coach.firstName} {plan.coach.lastName} · {plan.team.name}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-2 rounded-lg border border-border p-3 text-sm">
        {plan.objectives ? <p>{plan.objectives}</p> : null}
        <ul className="list-inside list-disc text-muted-foreground">
          {plan.activities.map((a) => (
            <li key={a.id}>
              {a.name}
              {a.durationMinutes ? ` (${a.durationMinutes} min)` : ""}
            </li>
          ))}
        </ul>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="space-y-1.5">
          <Label>Decision</Label>
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" value="APPROVED" {...register("decision")} /> Approve
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" value="CHANGES_REQUESTED" {...register("decision")} /> Request changes
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" value="REJECTED" {...register("decision")} /> Reject
            </label>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="decision-comments">Comments</Label>
          <Textarea id="decision-comments" rows={3} {...register("comments")} />
        </div>
        {serverError ? <p className="text-sm text-destructive">{serverError}</p> : null}
        <DialogFooter>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : "Save decision"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}

export function TrainingApprovalQueuePage() {
  const { data, isLoading, isError, refetch } = useTrainingPlans("SUBMITTED")
  const [reviewingPlan, setReviewingPlan] = useState<TrainingPlan | null>(null)
  const [search, setSearch] = useState("")

  const filteredData = useMemo(() => {
    if (!data) return data
    const query = search.trim().toLowerCase()
    if (query === "") return data
    return data.filter(
      (plan) =>
        plan.title.toLowerCase().includes(query) ||
        plan.team.name.toLowerCase().includes(query) ||
        `${plan.coach.firstName} ${plan.coach.lastName}`.toLowerCase().includes(query),
    )
  }, [data, search])

  return (
    <DashboardLayout title="Approvals" navItems={HEAD_COACH_NAV_ITEMS}>
      <Card>
        <CardHeader>
          <CardTitle>Training Plan Approvals</CardTitle>
          <CardDescription>Plans submitted by coaches, awaiting your decision</CardDescription>
        </CardHeader>
        <CardContent>
          {!isLoading && !isError && data && data.length > 0 ? (
            <div className="mb-4 flex items-center gap-2">
              <div className="relative flex-1 sm:max-w-xs">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by title, team, or coach…"
                  className="pl-8"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              {search.trim() !== "" ? (
                <Button variant="ghost" size="sm" onClick={() => setSearch("")}>
                  <X /> Clear
                </Button>
              ) : null}
            </div>
          ) : null}

          {isLoading ? (
            <LoadingState rows={3} />
          ) : isError ? (
            <ErrorState onRetry={() => void refetch()} />
          ) : !data || data.length === 0 ? (
            <EmptyState title="Nothing to review" description="No training plans are waiting for approval." />
          ) : !filteredData || filteredData.length === 0 ? (
            <EmptyState title="No matching plans" description="Try adjusting your search." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Coach</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>Scheduled</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((plan, index) => (
                  <TableRow key={plan.id} className="cursor-pointer" onClick={() => setReviewingPlan(plan)}>
                    <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                    <TableCell className="font-medium">{plan.title}</TableCell>
                    <TableCell>
                      {plan.coach.firstName} {plan.coach.lastName}
                    </TableCell>
                    <TableCell>{plan.team.name}</TableCell>
                    <TableCell>{formatDate(plan.scheduledDate)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!reviewingPlan} onOpenChange={(o) => !o && setReviewingPlan(null)}>
        {reviewingPlan ? (
          <DecisionDialog plan={reviewingPlan} onClose={() => setReviewingPlan(null)} />
        ) : null}
      </Dialog>
    </DashboardLayout>
  )
}
