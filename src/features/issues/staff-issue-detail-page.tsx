import { useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, Send } from "lucide-react"

import { DashboardLayout } from "@/app/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { StatusBadge } from "@/design-system/status-badge"
import { LoadingState } from "@/design-system/loading-state"
import { ErrorState } from "@/design-system/error-state"
import { formatDate } from "@/lib/date"
import { ApiError } from "@/lib/api-client"
import type { IssueStatus } from "./issues-api"
import { useAddStaffMessage, useStaffIssue, useUpdateIssueStatus } from "./issues-api"
import { useStaffNavItems } from "./staff-issues-page"

const STATUS_OPTIONS: { value: IssueStatus; label: string }[] = [
  { value: "OPEN", label: "Open" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "CLOSED", label: "Closed" },
]

export function StaffIssueDetailPage() {
  const { issueId } = useParams<{ issueId: string }>()
  const navigate = useNavigate()
  const navItems = useStaffNavItems()
  const { data: issue, isLoading, isError, refetch } = useStaffIssue(issueId)
  const addMessage = useAddStaffMessage(issueId ?? "")
  const updateStatus = useUpdateIssueStatus(issueId ?? "")
  const [reply, setReply] = useState("")
  const [serverError, setServerError] = useState<string | null>(null)

  const onReply = async () => {
    if (!reply.trim()) return
    setServerError(null)
    try {
      await addMessage.mutateAsync(reply.trim())
      setReply("")
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : "Could not send your reply.")
    }
  }

  return (
    <DashboardLayout title="Issues" navItems={navItems}>
      <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate("/issues")}>
        <ArrowLeft /> Back to issues
      </Button>

      {isLoading ? (
        <LoadingState rows={6} />
      ) : isError || !issue ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : (
        <Card>
          <CardHeader className="flex-row flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>{issue.subject}</CardTitle>
              <CardDescription>
                {issue.guardian.firstName} {issue.guardian.lastName} · Logged {formatDate(issue.createdAt)}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="issue-status" className="sr-only">
                Status
              </Label>
              <Select
                id="issue-status"
                value={issue.status}
                disabled={updateStatus.isPending}
                onChange={(e) => updateStatus.mutate(e.target.value as IssueStatus)}
                className="w-auto"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
              <StatusBadge status={issue.status} />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">{issue.description}</div>

            <div className="space-y-3">
              {issue.messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex flex-col gap-1 rounded-lg border p-3 text-sm ${
                    m.isStaffReply ? "border-primary/30 bg-primary/5" : "border-border"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {m.isStaffReply ? "Academy" : "Parent"} · {m.author.firstName} {m.author.lastName}
                    </span>
                    <span>{formatDate(m.createdAt)}</span>
                  </div>
                  <p>{m.message}</p>
                </div>
              ))}
            </div>

            <div className="space-y-2 border-t border-border pt-4">
              <Textarea
                placeholder="Reply to the parent…"
                rows={3}
                value={reply}
                onChange={(e) => setReply(e.target.value)}
              />
              {serverError ? <p className="text-sm text-destructive">{serverError}</p> : null}
              <div className="flex justify-end">
                <Button size="sm" onClick={() => void onReply()} disabled={!reply.trim() || addMessage.isPending}>
                  <Send /> {addMessage.isPending ? "Sending…" : "Send"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </DashboardLayout>
  )
}
