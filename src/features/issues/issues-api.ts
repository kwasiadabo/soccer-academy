import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import type { IssueDetail, IssueStatus, IssueSummary } from "@/features/dashboard-parent/parent-portal-api"

export type { IssueDetail, IssueStatus, IssueSummary }

const QUERY_KEYS = {
  list: ["issues"] as const,
  detail: (id: string) => ["issues", id] as const,
}

export function useAllIssues() {
  return useQuery({
    queryKey: QUERY_KEYS.list,
    queryFn: () => api.get<IssueSummary[]>("/issues"),
  })
}

export function useStaffIssue(issueId: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.detail(issueId ?? ""),
    queryFn: () => api.get<IssueDetail>(`/issues/${issueId}`),
    enabled: !!issueId,
  })
}

function invalidate(queryClient: ReturnType<typeof useQueryClient>, issueId: string) {
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.detail(issueId) })
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.list })
}

export function useAddStaffMessage(issueId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (message: string) => api.post<IssueDetail>(`/issues/${issueId}/messages`, { message }),
    onSuccess: () => invalidate(queryClient, issueId),
  })
}

export function useUpdateIssueStatus(issueId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (status: IssueStatus) => api.patch<IssueDetail>(`/issues/${issueId}/status`, { status }),
    onSuccess: () => invalidate(queryClient, issueId),
  })
}
