import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api-client"

export interface Child {
  id: string
  firstName: string
  lastName: string
  playerCode: string | null
  status: string
  dateOfBirth: string
  photoDocumentId: string | null
  ageCategory: { id: string; name: string } | null
  team: { id: string; name: string } | null
}

export interface ChildAttendanceRow {
  id: string
  status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED" | "INJURED"
  remarks: string | null
  recordedAt: string
  trainingSession: { date: string; team: { name: string } }
}

export type AssessmentCategory = "TECHNICAL" | "TACTICAL" | "PHYSICAL" | "MENTAL_BEHAVIOURAL"
export type RatingScaleType = "SCALE_1_5" | "SCALE_1_10" | "QUALITATIVE"

export interface ChildAssessmentRow {
  id: string
  assessmentDate: string
  strengths: string | null
  areasForImprovement: string | null
  developmentGoals: string | null
  assessedByCoach: { firstName: string; lastName: string }
  template: { name: string; ratingScale: RatingScaleType } | null
  ratings: {
    id: string
    ratingValue: string
    ratingLabel: string | null
    criteria: { name: string; category: AssessmentCategory } | null
    sessionActivity: { name: string } | null
  }[]
}

export interface ChildMatchRow {
  id: string
  isStarting: boolean
  isSubstitute: boolean
  positionPlayed: string | null
  minutesPlayed: number | null
  match: {
    matchDate: string
    status: string
    homeScore: number | null
    awayScore: number | null
    team: { name: string }
    opponent: { name: string }
  }
}

export interface FinanceSummary {
  totalDue: number
  paidToDate: number
  nextDueDate: string | null
  status: "UP_TO_DATE" | "PENDING" | "OVERDUE"
}

export interface StatementInvoiceRow {
  id: string
  invoiceNumber: string
  issuedAt: string
  dueDate: string
  amount: number
  discountAmount: number
  remaining: number
  status: string
  feeTypeName: string
}

export interface StatementPaymentRow {
  paymentId: string
  invoiceId: string
  receiptNumber: string
  paidAt: string
  method: string
  amount: number
  feeTypeName: string
  invoiceNumber: string
}

export interface FinanceStatement {
  invoices: StatementInvoiceRow[]
  payments: StatementPaymentRow[]
}

export interface ChildCoach {
  id: string
  firstName: string
  lastName: string
}

export interface ChildActivityMarkRow {
  id: string
  rating: number
  remarks: string | null
  createdAt: string
  trainingActivity: { name: string; trainingPlan: { title: string; scheduledDate: string } }
}

export interface PlayerOfTheWeekAward {
  id: string
  playerId: string
  teamId: string
  weekOf: string
  averageRating: number
  team: { name: string }
}

export function usePlayerOfTheWeekAwards() {
  return useQuery({
    queryKey: ["parent-portal", "player-of-the-week"] as const,
    queryFn: () => api.get<PlayerOfTheWeekAward[]>("/parent-portal/player-of-the-week"),
  })
}

export function useChildren() {
  return useQuery({
    queryKey: ["parent-portal", "children"] as const,
    queryFn: () => api.get<Child[]>("/parent-portal/children"),
  })
}

export function useChild(playerId: string | undefined) {
  return useQuery({
    queryKey: ["parent-portal", "child", playerId ?? ""] as const,
    queryFn: () => api.get<Child>(`/parent-portal/children/${playerId}`),
    enabled: !!playerId,
  })
}

export function useChildAttendance(playerId: string | undefined) {
  return useQuery({
    queryKey: ["parent-portal", "attendance", playerId ?? ""] as const,
    queryFn: () => api.get<ChildAttendanceRow[]>(`/parent-portal/children/${playerId}/attendance`),
    enabled: !!playerId,
  })
}

export function useChildAssessments(playerId: string | undefined) {
  return useQuery({
    queryKey: ["parent-portal", "assessments", playerId ?? ""] as const,
    queryFn: () => api.get<ChildAssessmentRow[]>(`/parent-portal/children/${playerId}/assessments`),
    enabled: !!playerId,
  })
}

export function useChildActivityMarks(playerId: string | undefined) {
  return useQuery({
    queryKey: ["parent-portal", "activity-marks", playerId ?? ""] as const,
    queryFn: () => api.get<ChildActivityMarkRow[]>(`/parent-portal/children/${playerId}/activity-marks`),
    enabled: !!playerId,
  })
}

export function useChildMatches(playerId: string | undefined) {
  return useQuery({
    queryKey: ["parent-portal", "matches", playerId ?? ""] as const,
    queryFn: () => api.get<ChildMatchRow[]>(`/parent-portal/children/${playerId}/matches`),
    enabled: !!playerId,
  })
}

export function useChildFinanceSummary(playerId: string | undefined) {
  return useQuery({
    queryKey: ["parent-portal", "finance-summary", playerId ?? ""] as const,
    queryFn: () => api.get<FinanceSummary>(`/parent-portal/children/${playerId}/finance-summary`),
    enabled: !!playerId,
  })
}

export function useChildStatement(playerId: string | undefined) {
  return useQuery({
    queryKey: ["parent-portal", "statement", playerId ?? ""] as const,
    queryFn: () => api.get<FinanceStatement>(`/parent-portal/children/${playerId}/statement`),
    enabled: !!playerId,
  })
}

export function useChildCoaches(playerId: string | undefined) {
  return useQuery({
    queryKey: ["parent-portal", "coaches", playerId ?? ""] as const,
    queryFn: () => api.get<ChildCoach[]>(`/parent-portal/children/${playerId}/coaches`),
    enabled: !!playerId,
  })
}

export function useSubmitCoachFeedback(playerId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      coachId: string
      overallRating: number
      comments?: string
      isAnonymous?: boolean
      criteria?: { criterionName: string; rating: number }[]
    }) => api.post(`/parent-portal/children/${playerId}/feedback`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["parent-portal"] }),
  })
}

export type IssueStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED"

export interface IssuePerson {
  id: string
  firstName: string
  lastName: string
}

export interface IssueMessage {
  id: string
  issueId: string
  authorUserId: string
  isStaffReply: boolean
  message: string
  readAt: string | null
  createdAt: string
  author: IssuePerson
}

export interface IssueSummary {
  id: string
  subject: string
  description: string
  status: IssueStatus
  createdAt: string
  updatedAt: string
  guardian: IssuePerson
  submittedBy: IssuePerson
  _count: { messages: number }
}

export interface IssueDetail extends Omit<IssueSummary, "_count"> {
  messages: IssueMessage[]
}

export function useMyIssues() {
  return useQuery({
    queryKey: ["parent-portal", "issues"] as const,
    queryFn: () => api.get<IssueSummary[]>("/parent-portal/issues"),
  })
}

export function useUnreadIssueCount() {
  return useQuery({
    queryKey: ["parent-portal", "issues", "unread-count"] as const,
    queryFn: () => api.get<number>("/parent-portal/issues/unread-count"),
    refetchInterval: 60_000,
  })
}

export function useMyIssue(issueId: string | undefined) {
  return useQuery({
    queryKey: ["parent-portal", "issues", issueId ?? ""] as const,
    queryFn: () => api.get<IssueDetail>(`/parent-portal/issues/${issueId}`),
    enabled: !!issueId,
  })
}

export function useCreateIssue() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { subject: string; description: string }) =>
      api.post<IssueDetail>("/parent-portal/issues", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["parent-portal", "issues"] }),
  })
}

export function useAddMyIssueMessage(issueId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (message: string) =>
      api.post<IssueDetail>(`/parent-portal/issues/${issueId}/messages`, { message }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["parent-portal", "issues"] }),
  })
}
