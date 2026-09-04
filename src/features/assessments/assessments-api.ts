import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import type { RatingScaleType } from "@/components/ui/rating-input"

export type AssessmentCategory = "TECHNICAL" | "TACTICAL" | "PHYSICAL" | "MENTAL_BEHAVIOURAL"

export interface AssessmentCriteria {
  id: string
  templateId: string
  category: AssessmentCategory
  name: string
  description: string | null
  sortOrder: number
}

export interface AssessmentTemplate {
  id: string
  name: string
  ageCategoryId: string | null
  ratingScale: RatingScaleType
  isActive: boolean
  criteria: AssessmentCriteria[]
}

export interface AssessmentRating {
  id: string
  playerAssessmentId: string
  criteriaId: string | null
  sessionActivityId: string | null
  ratingValue: string
  ratingLabel: string | null
  remarks: string | null
  criteria: AssessmentCriteria | null
  sessionActivity: { id: string; name: string } | null
}

export interface PlayerAssessment {
  id: string
  playerId: string
  templateId: string | null
  trainingSessionId: string | null
  matchId: string | null
  assessedByCoachId: string
  assessmentDate: string
  strengths: string | null
  areasForImprovement: string | null
  developmentGoals: string | null
  ratings: AssessmentRating[]
  assessedByCoach: { id: string; firstName: string; lastName: string }
  template: AssessmentTemplate | null
}

export interface CoachRemark {
  id: string
  playerId: string
  coachId: string
  remark: string
  context: string | null
  createdAt: string
  coach: { id: string; firstName: string; lastName: string }
}

export interface CreateAssessmentTemplateInput {
  name: string
  ratingScale?: RatingScaleType
  criteria?: { category: AssessmentCategory; name: string; description?: string }[]
}

export interface CreatePlayerAssessmentInput {
  templateId?: string
  trainingSessionId?: string
  matchId?: string
  strengths?: string
  areasForImprovement?: string
  developmentGoals?: string
  ratings: { criteriaId?: string; sessionActivityId?: string; ratingValue: number; ratingLabel?: string }[]
}

export interface UpdatePlayerAssessmentInput {
  strengths?: string
  areasForImprovement?: string
  developmentGoals?: string
  ratings: { criteriaId?: string; sessionActivityId?: string; ratingValue: number; ratingLabel?: string }[]
}

export function useAssessmentTemplates() {
  return useQuery({
    queryKey: ["assessments", "templates"] as const,
    queryFn: () => api.get<AssessmentTemplate[]>("/assessments/templates"),
  })
}

export function useCreateAssessmentTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateAssessmentTemplateInput) =>
      api.post<AssessmentTemplate>("/assessments/templates", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["assessments", "templates"] }),
  })
}

export function useAddAssessmentCriteria(templateId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { category: AssessmentCategory; name: string; description?: string }) =>
      api.post<AssessmentTemplate>(`/assessments/templates/${templateId}/criteria`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["assessments", "templates"] }),
  })
}

export interface AssessmentOversightRow extends PlayerAssessment {
  player: { id: string; firstName: string; lastName: string; team: { id: string; name: string } | null }
}

export function useAssessmentOversight(teamId?: string, trainingSessionId?: string) {
  return useQuery({
    queryKey: ["assessments", "oversight", teamId ?? "", trainingSessionId ?? ""] as const,
    queryFn: () => {
      const params = new URLSearchParams()
      if (teamId) params.set("teamId", teamId)
      if (trainingSessionId) params.set("trainingSessionId", trainingSessionId)
      const qs = params.toString()
      return api.get<AssessmentOversightRow[]>(`/assessments/oversight${qs ? `?${qs}` : ""}`)
    },
  })
}

export function usePlayerAssessments(playerId: string | undefined) {
  return useQuery({
    queryKey: ["assessments", "player", playerId ?? ""] as const,
    queryFn: () => api.get<PlayerAssessment[]>(`/assessments/players/${playerId}`),
    enabled: !!playerId,
  })
}

export function useCreatePlayerAssessment(playerId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreatePlayerAssessmentInput) =>
      api.post<PlayerAssessment>(`/assessments/players/${playerId}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["assessments", "player", playerId] }),
  })
}

export function useUpdatePlayerAssessment(playerId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ assessmentId, ...input }: UpdatePlayerAssessmentInput & { assessmentId: string }) =>
      api.patch<PlayerAssessment>(`/assessments/players/${playerId}/${assessmentId}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["assessments", "player", playerId] }),
  })
}

export function usePlayerRemarks(playerId: string | undefined) {
  return useQuery({
    queryKey: ["assessments", "remarks", playerId ?? ""] as const,
    queryFn: () => api.get<CoachRemark[]>(`/assessments/players/${playerId}/remarks`),
    enabled: !!playerId,
  })
}

export function useCreateRemark(playerId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { remark: string; context?: string }) =>
      api.post<CoachRemark>(`/assessments/players/${playerId}/remarks`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["assessments", "remarks", playerId] }),
  })
}
