import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, Send } from "lucide-react"

import { DashboardLayout } from "@/app/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { StatusBadge } from "@/design-system/status-badge"
import { LoadingState } from "@/design-system/loading-state"
import { ErrorState } from "@/design-system/error-state"
import { formatDate } from "@/lib/date"
import { ApiError } from "@/lib/api-client"
import { useParentNavItems } from "./children-list-page"
import { useAddMyIssueMessage, useMyIssue } from "./parent-portal-api"

export function IssueDetailPage() {
  const { issueId } = useParams<{ issueId: string }>()
  const navigate = useNavigate()
  const navItems = useParentNavItems()
  const queryClient = useQueryClient()
  const { data: issue, isLoading, isError, refetch } = useMyIssue(issueId)
  const addMessage = useAddMyIssueMessage(issueId ?? "")
  const [reply, setReply] = useState("")
  const [serverError, setServerError] = useState<string | null>(null)

  // Fetching the issue marks any staff replies on it read server-side — refresh the
  // sidebar badge count to reflect that immediately.
  useEffect(() => {
    if (issue) {
      queryClient.invalidateQueries({ queryKey: ["parent-portal", "issues", "unread-count"] })
    }
  }, [issue, queryClient])

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
      <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate("/parent/issues")}>
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
              <CardDescription>Logged {formatDate(issue.createdAt)}</CardDescription>
            </div>
            <StatusBadge status={issue.status} />
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
                      {m.isStaffReply ? "Academy" : "You"} · {m.author.firstName} {m.author.lastName}
                    </span>
                    <span>{formatDate(m.createdAt)}</span>
                  </div>
                  <p>{m.message}</p>
                </div>
              ))}
            </div>

            <div className="space-y-2 border-t border-border pt-4">
              <Textarea
                placeholder="Add a follow-up…"
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
