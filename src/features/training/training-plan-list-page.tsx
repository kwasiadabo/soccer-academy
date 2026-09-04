import { formatDate } from "@/lib/date"
import { useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useNavigate } from "react-router-dom"
import { ClipboardList, Plus, Search, X } from "lucide-react"

import { DashboardLayout } from "@/app/dashboard-layout"
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
import { StatusBadge } from "@/design-system/status-badge"
import { ApiError } from "@/lib/api-client"
import { useCreateTrainingPlan, useTrainingPlans, useTrainingTeams } from "./training-api"
import { COACH_NAV_ITEMS } from "@/features/dashboard-coach/coach-dashboard"

const schema = z.object({
  teamId: z.string().min(1, "Select a team"),
  title: z.string().min(1, "Title is required"),
  objectives: z.string().optional(),
  scheduledDate: z.string().min(1, "Date is required"),
})
type FormValues = z.infer<typeof schema>

export function TrainingPlanListPage() {
  const navigate = useNavigate()
  const { data, isLoading, isError, refetch } = useTrainingPlans()
  const { data: teams } = useTrainingTeams()
  const createPlan = useCreateTrainingPlan()
  const [open, setOpen] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const [search, setSearch] = useState("")
  const [teamFilter, setTeamFilter] = useState("")

  const hasActiveFilters = search.trim() !== "" || teamFilter !== ""
  const clearFilters = () => {
    setSearch("")
    setTeamFilter("")
  }

  const filteredData = useMemo(() => {
    if (!data) return data
    const query = search.trim().toLowerCase()
    return data.filter((plan) => {
      const matchesSearch = query === "" || plan.title.toLowerCase().includes(query)
      const matchesTeam = teamFilter === "" || plan.team.id === teamFilter
      return matchesSearch && matchesTeam
    })
  }, [data, search, teamFilter])

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const onSubmit = async (values: FormValues) => {
    setServerError(null)
    try {
      const plan = await createPlan.mutateAsync(values)
      reset()
      setOpen(false)
      navigate(`/coach/training-plans/${plan.id}`)
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : "Could not create the training plan.")
    }
  }

  return (
    <DashboardLayout title="Training Plans" navItems={COACH_NAV_ITEMS}>
      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ClipboardList className="size-4.5" />
            </div>
            <div>
              <CardTitle>Training Plans</CardTitle>
              <CardDescription>
                Draft a plan, add activities, then submit it for your head coach's approval.
              </CardDescription>
            </div>
          </div>
          <Dialog
            open={open}
            onOpenChange={(next) => {
              setOpen(next)
              if (!next) setServerError(null)
            }}
          >
            <DialogTrigger asChild>
              <Button size="sm" disabled={!teams?.length}>
                <Plus /> New plan
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create training plan</DialogTitle>
                <DialogDescription>
                  Start a draft with a title, team, and date — you'll add specific activities next, then submit it
                  for approval when ready.
                </DialogDescription>
              </DialogHeader>
              <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
                <div className="space-y-1.5">
                  <Label htmlFor="plan-title">Title</Label>
                  <Input id="plan-title" placeholder="Passing fundamentals" {...register("title")} />
                  {errors.title ? <p className="text-xs text-destructive">{errors.title.message}</p> : null}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="plan-team">Team</Label>
                  <Select id="plan-team" defaultValue="" {...register("teamId")}>
                    <option value="" disabled>
                      Select a team
                    </option>
                    {teams?.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </Select>
                  {errors.teamId ? <p className="text-xs text-destructive">{errors.teamId.message}</p> : null}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="plan-date">Scheduled date</Label>
                  <Input id="plan-date" type="date" {...register("scheduledDate")} />
                  {errors.scheduledDate ? (
                    <p className="text-xs text-destructive">{errors.scheduledDate.message}</p>
                  ) : null}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="plan-objectives">Objectives</Label>
                  <Input id="plan-objectives" {...register("objectives")} />
                </div>
                {serverError ? <p className="text-sm text-destructive">{serverError}</p> : null}
                <DialogFooter>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Creating…" : "Create plan"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {!isLoading && !isError && data && data.length > 0 ? (
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative flex-1 sm:max-w-xs">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by title…"
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
                {teams?.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </Select>
              {hasActiveFilters ? (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
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
            <EmptyState
              title="No training plans yet"
              description="Create a plan to start scheduling sessions for your team."
            />
          ) : !filteredData || filteredData.length === 0 ? (
            <EmptyState title="No matching plans" description="Try adjusting your search or filters." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>Scheduled</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((plan, index) => (
                  <TableRow
                    key={plan.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/coach/training-plans/${plan.id}`)}
                  >
                    <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                    <TableCell className="font-medium">{plan.title}</TableCell>
                    <TableCell>{plan.team.name}</TableCell>
                    <TableCell>{formatDate(plan.scheduledDate)}</TableCell>
                    <TableCell>
                      <StatusBadge status={plan.approvalStatus} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  )
}
