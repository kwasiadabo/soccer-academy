import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api-client"

export interface Season {
  id: string
  name: string
  startDate: string
  endDate: string
  isActive: boolean
}

export interface AgeCategory {
  id: string
  name: string
  code: string
  minAge: number
  maxAge: number
  sortOrder: number
  isActive: boolean
}

export interface TeamCoachAssignment {
  id: string
  role: "PRIMARY" | "ASSISTANT"
  coach: { id: string; firstName: string; lastName: string }
}

export interface Team {
  id: string
  name: string
  ageCategoryId: string
  seasonId: string
  headCoachId: string | null
  isActive: boolean
  ageCategory: AgeCategory
  season: Season
  headCoach: { id: string; firstName: string; lastName: string } | null
  coachAssignments: TeamCoachAssignment[]
}

export interface TrainingGroup {
  id: string
  name: string
  teamId: string
  isActive: boolean
  team: Team
}

const QUERY_KEYS = {
  seasons: ["academy-config", "seasons"],
  ageCategories: ["academy-config", "age-categories"],
  teams: ["academy-config", "teams"],
  trainingGroups: ["academy-config", "training-groups"],
} as const

export function useSeasons() {
  return useQuery({
    queryKey: QUERY_KEYS.seasons,
    queryFn: () => api.get<Season[]>("/academy-config/seasons"),
  })
}

export function useCreateSeason() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { name: string; startDate: string; endDate: string }) =>
      api.post<Season>("/academy-config/seasons", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.seasons }),
  })
}

export function useAgeCategories() {
  return useQuery({
    queryKey: QUERY_KEYS.ageCategories,
    queryFn: () => api.get<AgeCategory[]>("/academy-config/age-categories"),
  })
}

export function useCreateAgeCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { name: string; code: string; minAge: number; maxAge: number }) =>
      api.post<AgeCategory>("/academy-config/age-categories", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ageCategories }),
  })
}

export function useTeams() {
  return useQuery({
    queryKey: QUERY_KEYS.teams,
    queryFn: () => api.get<Team[]>("/academy-config/teams"),
  })
}

export function useCreateTeam() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { name: string; ageCategoryId: string; seasonId: string }) =>
      api.post<Team>("/academy-config/teams", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.teams }),
  })
}

export function useTrainingGroups() {
  return useQuery({
    queryKey: QUERY_KEYS.trainingGroups,
    queryFn: () => api.get<TrainingGroup[]>("/academy-config/training-groups"),
  })
}

export function useCreateTrainingGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { name: string; teamId: string }) =>
      api.post<TrainingGroup>("/academy-config/training-groups", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.trainingGroups }),
  })
}
