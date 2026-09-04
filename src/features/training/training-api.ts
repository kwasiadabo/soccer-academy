import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api-client"

export type TrainingApprovalStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED" | "CHANGES_REQUESTED"

export interface TrainingActivity {
  id: string
  trainingPlanId: string
  name: string
  description: string | null
  durationMinutes: number | null
  skillsDeveloped: string | null
  sortOrder: number
}

export interface TrainingApproval {
  id: string
  trainingPlanId: string
  submittedByUserId: string
  submittedAt: string
  reviewedByUserId: string | null
  reviewedAt: string | null
  decision: TrainingApprovalStatus
  comments: string | null
}

export interface TrainingPlan {
  id: string
  coachId: string
  teamId: string
  trainingGroupId: string | null
  title: string
  objectives: string | null
  scheduledDate: string
  scheduledStart: string | null
  scheduledEnd: string | null
  location: string | null
  requiredEquipment: string | null
  skillsFocus: string | null
  assessmentCriteria: string | null
  approvalStatus: TrainingApprovalStatus
  version: number
  activities: TrainingActivity[]
  approvals: TrainingApproval[]
  coach: { id: string; firstName: string; lastName: string }
  team: { id: string; name: string }
  trainingGroup: { id: string; name: string } | null
}

export interface CreateTrainingActivityInput {
  name: string
  description?: string
  durationMinutes?: number
  skillsDeveloped?: string
  sortOrder?: number
}

export interface CreateTrainingPlanInput {
  teamId: string
  trainingGroupId?: string
  title: string
  objectives?: string
  scheduledDate: string
  scheduledStart?: string
  scheduledEnd?: string
  location?: string
  requiredEquipment?: string
  skillsFocus?: string
  assessmentCriteria?: string
  activities?: CreateTrainingActivityInput[]
}

const QUERY_KEYS = {
  list: (status?: string) => ["training", "plans", "list", status ?? ""] as const,
  detail: (id: string) => ["training", "plans", "detail", id] as const,
}

function invalidateTrainingPlan(queryClient: ReturnType<typeof useQueryClient>, id: string) {
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.detail(id) })
  queryClient.invalidateQueries({ queryKey: ["training", "plans", "list"] })
}

export function useTrainingTeams(enabled = true) {
  return useQuery({
    queryKey: ["training", "teams"] as const,
    queryFn: () => api.get<{ id: string; name: string }[]>("/training/plans/teams"),
    enabled,
  })
}

export function useTrainingPlans(status?: TrainingApprovalStatus) {
  return useQuery({
    queryKey: QUERY_KEYS.list(status),
    queryFn: () => api.get<TrainingPlan[]>(`/training/plans${status ? `?status=${status}` : ""}`),
  })
}

export function useTrainingPlan(id: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.detail(id ?? ""),
    queryFn: () => api.get<TrainingPlan>(`/training/plans/${id}`),
    enabled: !!id,
  })
}

export function useCreateTrainingPlan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateTrainingPlanInput) => api.post<TrainingPlan>("/training/plans", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["training", "plans", "list"] }),
  })
}

export function useUpdateTrainingPlan(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: Partial<Omit<CreateTrainingPlanInput, "teamId" | "activities">>) =>
      api.patch<TrainingPlan>(`/training/plans/${id}`, input),
    onSuccess: () => invalidateTrainingPlan(queryClient, id),
  })
}

export function useAddTrainingActivity(planId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateTrainingActivityInput) =>
      api.post<TrainingPlan>(`/training/plans/${planId}/activities`, input),
    onSuccess: () => invalidateTrainingPlan(queryClient, planId),
  })
}

export function useRemoveTrainingActivity(planId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (activityId: string) =>
      api.delete<TrainingPlan>(`/training/plans/${planId}/activities/${activityId}`),
    onSuccess: () => invalidateTrainingPlan(queryClient, planId),
  })
}

export function useSubmitTrainingPlan(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.post<TrainingPlan>(`/training/plans/${id}/submit`),
    onSuccess: () => invalidateTrainingPlan(queryClient, id),
  })
}

export function useDecideTrainingPlan(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { decision: "APPROVED" | "REJECTED" | "CHANGES_REQUESTED"; comments?: string }) =>
      api.post<TrainingPlan>(`/training/plans/${id}/decision`, input),
    onSuccess: () => invalidateTrainingPlan(queryClient, id),
  })
}

export type TrainingSessionStatus = "SCHEDULED" | "COMPLETED" | "CANCELLED"
export type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED" | "INJURED"

export interface TrainingAttendance {
  id: string
  trainingSessionId: string
  playerId: string
  status: AttendanceStatus
  remarks: string | null
  recordedAt: string
  player: { id: string; firstName: string; lastName: string; playerCode: string | null; photoDocumentId: string | null }
  recordedByUser: { id: string; firstName: string; lastName: string }
}

export interface TrainingSessionActivity {
  id: string
  trainingSessionId: string
  name: string
  sortOrder: number
}

export interface TrainingSession {
  id: string
  trainingPlanId: string | null
  teamId: string
  trainingGroupId: string | null
  conductedByCoachId: string | null
  date: string
  startTime: string | null
  endTime: string | null
  location: string | null
  status: TrainingSessionStatus
  team: { id: string; name: string }
  trainingGroup: { id: string; name: string } | null
  trainingPlan: { id: string; title: string } | null
  conductedByCoach: { id: string; firstName: string; lastName: string } | null
  attendance: TrainingAttendance[]
  sessionActivities: TrainingSessionActivity[]
}

export interface SessionWithRoster extends TrainingSession {
  roster: { id: string; firstName: string; lastName: string; playerCode: string | null; photoDocumentId: string | null }[]
}

export interface CreateTrainingSessionInput {
  teamId: string
  trainingGroupId?: string
  trainingPlanId?: string
  date: string
  startTime?: string
  endTime?: string
  location?: string
}

const SESSION_QUERY_KEYS = {
  list: ["training", "sessions", "list"] as const,
  detail: (id: string) => ["training", "sessions", "detail", id] as const,
}

function invalidateTrainingSession(queryClient: ReturnType<typeof useQueryClient>, id: string) {
  queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEYS.detail(id) })
  queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEYS.list })
}

export function useTrainingSessions() {
  return useQuery({
    queryKey: SESSION_QUERY_KEYS.list,
    queryFn: () => api.get<TrainingSession[]>("/training/sessions"),
  })
}

export function useTrainingSession(id: string | undefined) {
  return useQuery({
    queryKey: SESSION_QUERY_KEYS.detail(id ?? ""),
    queryFn: () => api.get<SessionWithRoster>(`/training/sessions/${id}`),
    enabled: !!id,
  })
}

// Training only ever happens on a team's fixed Saturday fixture — resolves (auto-provisioning
// if needed) the current one, so a coach never has to pick a session manually.
export function useCurrentTeamSession(teamId: string | undefined) {
  return useQuery({
    queryKey: ["training", "sessions", "current", teamId ?? ""] as const,
    queryFn: () => api.post<SessionWithRoster>("/training/sessions/saturday", { teamId }),
    enabled: !!teamId,
  })
}

export function useCreateTrainingSession() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateTrainingSessionInput) => api.post<TrainingSession>("/training/sessions", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEYS.list }),
  })
}

export interface QuickMarkResult {
  id: string
  status: AttendanceStatus
  recordedAt: string
  player: { id: string; firstName: string; lastName: string; playerCode: string | null }
  recordedByUser: { id: string; firstName: string; lastName: string }
  trainingSession: { id: string; team: { id: string; name: string } }
}

// Search-and-mark: no team selection needed — the player's own team resolves (and
// auto-provisions) their Saturday session behind the scenes.
export function useQuickMarkAttendance() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { playerId: string; status?: AttendanceStatus }) =>
      api.post<QuickMarkResult>("/training/attendance/mark", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEYS.list }),
  })
}

export function useUpdateTrainingSession(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { status?: TrainingSessionStatus }) =>
      api.patch<TrainingSession>(`/training/sessions/${id}`, input),
    onSuccess: () => invalidateTrainingSession(queryClient, id),
  })
}

export function useRecordAttendance(sessionId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (records: { playerId: string; status: AttendanceStatus; remarks?: string }[]) =>
      api.post<TrainingSession>(`/training/sessions/${sessionId}/attendance`, { records }),
    onSuccess: () => invalidateTrainingSession(queryClient, sessionId),
  })
}

export function useAddSessionActivity(sessionId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { name: string }) =>
      api.post<SessionWithRoster>(`/training/sessions/${sessionId}/activities`, input),
    onSuccess: () => invalidateTrainingSession(queryClient, sessionId),
  })
}

export function useRemoveSessionActivity(sessionId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (activityId: string) =>
      api.delete<SessionWithRoster>(`/training/sessions/${sessionId}/activities/${activityId}`),
    onSuccess: () => invalidateTrainingSession(queryClient, sessionId),
  })
}

// --- Activity marks: a coach's quick 1-10 score for one player on one drill/activity ---

export interface TrainingActivityMark {
  id: string
  trainingActivityId: string
  playerId: string
  ratedByCoachId: string
  rating: number
  remarks: string | null
  createdAt: string
  updatedAt: string
  ratedByCoach: { id: string; firstName: string; lastName: string }
}

export interface ActivityMarksResponse {
  activity: TrainingActivity & { trainingPlan: TrainingPlan }
  roster: { id: string; firstName: string; lastName: string; playerCode: string | null; photoDocumentId: string | null }[]
  marks: TrainingActivityMark[]
}

export interface PlayerMark extends TrainingActivityMark {
  trainingActivity: TrainingActivity & { trainingPlan: { title: string; scheduledDate: string } }
}

export interface TeamMarkRow {
  id: string
  playerId: string
  rating: number
  createdAt: string
  trainingActivityId: string
  player: { firstName: string; lastName: string }
}

const MARKS_QUERY_KEYS = {
  activity: (activityId: string) => ["training", "activity-marks", activityId] as const,
  player: (playerId: string) => ["training", "player-marks", playerId] as const,
  team: (teamId: string) => ["training", "team-marks", teamId] as const,
}

export function useActivityMarks(activityId: string | undefined) {
  return useQuery({
    queryKey: MARKS_QUERY_KEYS.activity(activityId ?? ""),
    queryFn: () => api.get<ActivityMarksResponse>(`/training/activities/${activityId}/marks`),
    enabled: !!activityId,
  })
}

export function useUpsertActivityMarks(activityId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (records: { playerId: string; rating: number; remarks?: string }[]) =>
      api.post<ActivityMarksResponse>(`/training/activities/${activityId}/marks`, { records }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MARKS_QUERY_KEYS.activity(activityId) }),
  })
}

export function usePlayerMarks(playerId: string | undefined) {
  return useQuery({
    queryKey: MARKS_QUERY_KEYS.player(playerId ?? ""),
    queryFn: () => api.get<PlayerMark[]>(`/training/players/${playerId}/marks`),
    enabled: !!playerId,
  })
}

export function useTeamMarks(teamId: string | undefined) {
  return useQuery({
    queryKey: MARKS_QUERY_KEYS.team(teamId ?? ""),
    queryFn: () => api.get<TeamMarkRow[]>(`/training/teams/${teamId}/marks`),
    enabled: !!teamId,
  })
}
