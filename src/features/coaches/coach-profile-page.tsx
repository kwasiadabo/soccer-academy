import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, Plus } from "lucide-react"

import { DashboardLayout, type NavItem } from "@/app/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatusBadge } from "@/design-system/status-badge"
import { LoadingState } from "@/design-system/loading-state"
import { ErrorState } from "@/design-system/error-state"
import { ApiError } from "@/lib/api-client"
import { useTeams, useTrainingGroups } from "@/features/dashboard-admin/academy-config-api"
import {
  useAddCoachAssignment,
  useAddCoachQualification,
  useCoach,
  useEndCoachAssignment,
  useUpdateCoach,
} from "./coaches-api"

const qualificationSchema = z.object({
  title: z.string().min(1, "Title is required"),
  issuingBody: z.string().optional(),
})
type QualificationFormValues = z.infer<typeof qualificationSchema>

const assignmentSchema = z.object({
  targetType: z.enum(["team", "trainingGroup"]),
  targetId: z.string().min(1, "Select a target"),
  role: z.enum(["PRIMARY", "ASSISTANT"]),
})
type AssignmentFormValues = z.infer<typeof assignmentSchema>

export function CoachProfilePage({ backTo, navItems }: { backTo: string; navItems?: NavItem[] }) {
  const { coachId } = useParams<{ coachId: string }>()
  const navigate = useNavigate()
  const { data: coach, isLoading, isError, refetch } = useCoach(coachId)
  const { data: teams } = useTeams()
  const { data: trainingGroups } = useTrainingGroups()
  const addQualification = useAddCoachQualification(coachId ?? "")
  const addAssignment = useAddCoachAssignment(coachId ?? "")
  const endAssignment = useEndCoachAssignment(coachId ?? "")
  const updateCoach = useUpdateCoach(coachId ?? "")
  const [actionError, setActionError] = useState<string | null>(null)

  const qualificationForm = useForm<QualificationFormValues>({ resolver: zodResolver(qualificationSchema) })
  const assignmentForm = useForm<AssignmentFormValues>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: { targetType: "team", role: "PRIMARY" },
  })
  const targetType = assignmentForm.watch("targetType")

  const runAction = async (action: () => Promise<unknown>) => {
    setActionError(null)
    try {
      await action()
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Action failed. Please try again.")
    }
  }

  const onAddQualification = async (values: QualificationFormValues) => {
    await runAction(() => addQualification.mutateAsync(values))
    qualificationForm.reset()
  }

  const onAddAssignment = async (values: AssignmentFormValues) => {
    await runAction(() =>
      addAssignment.mutateAsync({
        teamId: values.targetType === "team" ? values.targetId : undefined,
        trainingGroupId: values.targetType === "trainingGroup" ? values.targetId : undefined,
        role: values.role,
      }),
    )
    assignmentForm.reset({ targetType: values.targetType, role: values.role, targetId: "" })
  }

  return (
    <DashboardLayout title="Coach Profile" navItems={navItems}>
      <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate(backTo)}>
        <ArrowLeft /> Back to coaches
      </Button>

      {isLoading ? (
        <LoadingState rows={6} />
      ) : isError || !coach ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">
                    {coach.firstName} {coach.lastName}
                  </CardTitle>
                  <StatusBadge status={coach.isActive ? "ACTIVE" : "SUSPENDED"} />
                </div>
                <p className="text-sm text-muted-foreground">{coach.email ?? "No email on file"}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={updateCoach.isPending}
                onClick={() => void runAction(() => updateCoach.mutateAsync({ isActive: !coach.isActive }))}
              >
                {coach.isActive ? "Suspend" : "Reinstate"}
              </Button>
            </CardHeader>
            {actionError ? (
              <CardContent className="pt-0">
                <p className="text-sm text-destructive">{actionError}</p>
              </CardContent>
            ) : null}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Qualifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {coach.qualifications?.length ? (
                coach.qualifications.map((q) => (
                  <div key={q.id} className="rounded-lg border border-border p-3">
                    <p className="text-sm font-medium">{q.title}</p>
                    {q.issuingBody ? <p className="text-xs text-muted-foreground">{q.issuingBody}</p> : null}
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No qualifications recorded yet.</p>
              )}
              <form
                className="flex items-end gap-2"
                onSubmit={qualificationForm.handleSubmit(onAddQualification)}
                noValidate
              >
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="qual-title">Title</Label>
                  <Input id="qual-title" placeholder="UEFA B License" {...qualificationForm.register("title")} />
                </div>
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="qual-body">Issuing body</Label>
                  <Input id="qual-body" {...qualificationForm.register("issuingBody")} />
                </div>
                <Button type="submit" variant="outline" disabled={qualificationForm.formState.isSubmitting}>
                  <Plus /> Add
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Assignments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {coach.assignments?.length ? (
                coach.assignments.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between rounded-lg border border-border p-3"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{a.team?.name ?? a.trainingGroup?.name}</span>
                      <StatusBadge status={a.role} />
                      {a.effectiveTo ? <span className="text-xs text-muted-foreground">Ended</span> : null}
                    </div>
                    {!a.effectiveTo ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => void runAction(() => endAssignment.mutateAsync(a.id))}
                      >
                        End
                      </Button>
                    ) : null}
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No assignments yet.</p>
              )}

              <form className="flex items-end gap-2" onSubmit={assignmentForm.handleSubmit(onAddAssignment)} noValidate>
                <div className="w-36 space-y-1.5">
                  <Label>Assign to</Label>
                  <Select {...assignmentForm.register("targetType")}>
                    <option value="team">Team</option>
                    <option value="trainingGroup">Training group</option>
                  </Select>
                </div>
                <div className="flex-1 space-y-1.5">
                  <Label>{targetType === "team" ? "Team" : "Training group"}</Label>
                  <Select defaultValue="" {...assignmentForm.register("targetId")}>
                    <option value="" disabled>
                      Select {targetType === "team" ? "a team" : "a training group"}
                    </option>
                    {(targetType === "team" ? teams : trainingGroups)?.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="w-32 space-y-1.5">
                  <Label>Role</Label>
                  <Select {...assignmentForm.register("role")}>
                    <option value="PRIMARY">Primary</option>
                    <option value="ASSISTANT">Assistant</option>
                  </Select>
                </div>
                <Button type="submit" variant="outline" disabled={assignmentForm.formState.isSubmitting}>
                  <Plus /> Assign
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </DashboardLayout>
  )
}
