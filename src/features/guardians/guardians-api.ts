import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api-client"

export interface GuardianPlayerLink {
  playerId: string
  relationship: string
  isPrimary: boolean
  player: { id: string; firstName: string; lastName: string }
}

export interface Guardian {
  id: string
  userId: string | null
  firstName: string
  lastName: string
  phone: string
  email: string | null
  players: GuardianPlayerLink[]
}

const QUERY_KEYS = {
  list: (search?: string) => ["guardians", "list", search ?? ""] as const,
}

export function useGuardians(search: string) {
  return useQuery({
    queryKey: QUERY_KEYS.list(search),
    queryFn: () => api.get<Guardian[]>(`/guardians${search ? `?search=${encodeURIComponent(search)}` : ""}`),
    enabled: search.length > 0,
  })
}

export function useGrantGuardianPortalAccess(guardianId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { email: string }) => api.post<Guardian>(`/guardians/${guardianId}/portal-access`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["guardians", "list"] }),
  })
}
