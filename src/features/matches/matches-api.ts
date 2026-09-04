import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api-client"

export type MatchStatus = "SCHEDULED" | "COMPLETED" | "CANCELLED" | "POSTPONED"

export interface Opponent {
  id: string
  name: string
  contactInfo: string | null
}

export interface MatchParticipation {
  id: string
  matchId: string
  playerId: string
  isStarting: boolean
  isSubstitute: boolean
  positionPlayed: string | null
  minutesPlayed: number | null
  player: { id: string; firstName: string; lastName: string }
}

export interface MatchPlayerAssessment {
  id: string
  matchId: string
  playerId: string
  assessedByCoachId: string
  technicalRating: string | null
  tacticalRating: string | null
  teamContributionRating: string | null
  disciplineRating: string | null
  effortRating: string | null
  overallRating: string | null
  remarks: string | null
  recommendations: string | null
}

export interface Match {
  id: string
  teamId: string
  opponentId: string
  competitionName: string | null
  venue: string | null
  matchDate: string
  status: MatchStatus
  homeScore: number | null
  awayScore: number | null
  notes: string | null
  team: { id: string; name: string }
  opponent: Opponent
  participations: MatchParticipation[]
  matchPlayerAssessments: MatchPlayerAssessment[]
}

export interface MatchWithRoster extends Match {
  roster: { id: string; firstName: string; lastName: string }[]
}

export interface CreateMatchInput {
  teamId: string
  opponentId: string
  competitionName?: string
  venue?: string
  matchDate: string
}

const QUERY_KEYS = {
  list: ["matches", "list"] as const,
  detail: (id: string) => ["matches", "detail", id] as const,
  opponents: ["matches", "opponents"] as const,
}

function invalidateMatch(queryClient: ReturnType<typeof useQueryClient>, id: string) {
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.detail(id) })
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.list })
}

export function useOpponents() {
  return useQuery({
    queryKey: QUERY_KEYS.opponents,
    queryFn: () => api.get<Opponent[]>("/opponents"),
  })
}

export function useCreateOpponent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { name: string; contactInfo?: string }) => api.post<Opponent>("/opponents", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.opponents }),
  })
}

export function useMatches() {
  return useQuery({
    queryKey: QUERY_KEYS.list,
    queryFn: () => api.get<Match[]>("/matches"),
  })
}

export function useMatch(id: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.detail(id ?? ""),
    queryFn: () => api.get<MatchWithRoster>(`/matches/${id}`),
    enabled: !!id,
  })
}

export function useCreateMatch() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateMatchInput) => api.post<Match>("/matches", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.list }),
  })
}

export function useUpdateMatch(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { status?: MatchStatus; homeScore?: number; awayScore?: number; notes?: string }) =>
      api.patch<Match>(`/matches/${id}`, input),
    onSuccess: () => invalidateMatch(queryClient, id),
  })
}

export function useSetParticipations(matchId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (
      records: { playerId: string; isStarting?: boolean; isSubstitute?: boolean; positionPlayed?: string }[],
    ) => api.post<Match>(`/matches/${matchId}/participations`, { records }),
    onSuccess: () => invalidateMatch(queryClient, matchId),
  })
}

export function useAddMatchPlayerAssessment(matchId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      playerId: string
      technicalRating?: number
      tacticalRating?: number
      teamContributionRating?: number
      disciplineRating?: number
      effortRating?: number
      overallRating?: number
      remarks?: string
    }) => api.post<Match>(`/matches/${matchId}/assessments`, input),
    onSuccess: () => invalidateMatch(queryClient, matchId),
  })
}
