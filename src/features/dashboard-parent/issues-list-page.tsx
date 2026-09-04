import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Plus } from "lucide-react"

import { DashboardLayout } from "@/app/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
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
import { EmptyState } from "@/design-system/empty-state"
import { LoadingState } from "@/design-system/loading-state"
import { ErrorState } from "@/design-system/error-state"
import { formatDate } from "@/lib/date"
import { ApiError } from "@/lib/api-client"
import { useParentNavItems } from "./children-list-page"
import { useCreateIssue, useMyIssues } from "./parent-portal-api"

const schema = z.object({
  subject: z.string().min(1, "Subject is required"),
  description: z.string().min(1, "Please describe the issue"),
})
type FormValues = z.infer<typeof schema>

function NewIssueDialog() {
  const [open, setOpen] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const createIssue = useCreateIssue()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const onSubmit = async (values: FormValues) => {
    setServerError(null)
    try {
      await createIssue.mutateAsync(values)
      reset()
      setOpen(false)
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : "Could not submit this issue.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus /> New issue
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log an issue</DialogTitle>
          <DialogDescription>The academy will review it and reply here.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="issue-subject">Subject</Label>
            <Input id="issue-subject" placeholder="e.g. Uniform size wrong" {...register("subject")} />
            {errors.subject ? <p className="text-xs text-destructive">{errors.subject.message}</p> : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="issue-description">Description</Label>
            <Textarea id="issue-description" rows={4} {...register("description")} />
            {errors.description ? <p className="text-xs text-destructive">{errors.description.message}</p> : null}
          </div>
          {serverError ? <p className="text-sm text-destructive">{serverError}</p> : null}
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Submitting…" : "Submit issue"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function IssuesListPage() {
  const navigate = useNavigate()
  const navItems = useParentNavItems()
  const { data, isLoading, isError, refetch } = useMyIssues()

  return (
    <DashboardLayout title="Issues" navItems={navItems}>
      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Issues</CardTitle>
            <CardDescription>Log a concern with the academy and track their replies here</CardDescription>
          </div>
          <NewIssueDialog />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingState rows={3} />
          ) : isError ? (
            <ErrorState onRetry={() => void refetch()} />
          ) : !data || data.length === 0 ? (
            <EmptyState title="No issues yet" description="Anything you log here will be reviewed by the academy." />
          ) : (
            <div className="space-y-2">
              {data.map((issue) => (
                <button
                  key={issue.id}
                  onClick={() => navigate(`/parent/issues/${issue.id}`)}
                  className="flex w-full items-center justify-between gap-3 rounded-lg border border-border p-3 text-left transition-colors hover:bg-muted/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{issue.subject}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(issue.updatedAt)} · {issue._count.messages}{" "}
                      {issue._count.messages === 1 ? "reply" : "replies"}
                    </p>
                  </div>
                  <StatusBadge status={issue.status} />
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  )
}
