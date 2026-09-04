import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api-client"

export interface CoachUser {
  id: string
  email: string
  roles: { role: { name: string } }[]
}

export interface CoachQualification {
  id: string
  title: string
  issuingBody: string | null
  issueDate: string | null
  expiryDate: string | null
}

export interface CoachAssignment {
  id: string
  teamId: string | null
  trainingGroupId: string | null
  role: "PRIMARY" | "ASSISTANT"
  effectiveFrom: string
  effectiveTo: string | null
  team: { id: string; name: string } | null
  trainingGroup: { id: string; name: string } | null
}

export type StaffRole = "COACH" | "KITMAN" | "RECEPTIONIST_CASHIER" | "MEDIA"

export const STAFF_ROLE_LABELS: Record<StaffRole, string> = {
  COACH: "Coach",
  KITMAN: "Kitman",
  RECEPTIONIST_CASHIER: "Receptionist/Cashier",
  MEDIA: "Media",
}

export interface Coach {
  id: string
  userId: string | null
  firstName: string
  middleName: string | null
  lastName: string
  phone: string | null
  email: string | null
  bio: string | null
  role: StaffRole
  isActive: boolean
  user?: CoachUser | null
  qualifications?: CoachQualification[]
  assignments?: CoachAssignment[]
}

const QUERY_KEYS = {
  list: (search?: string) => ["coaches", "list", search ?? ""] as const,
  detail: (id: string) => ["coaches", "detail", id] as const,
}

export function useCoaches(search?: string) {
  return useQuery({
    queryKey: QUERY_KEYS.list(search),
    queryFn: () => api.get<Coach[]>(`/coaches${search ? `?search=${encodeURIComponent(search)}` : ""}`),
  })
}

export function useCoach(id: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.detail(id ?? ""),
    queryFn: () => api.get<Coach>(`/coaches/${id}`),
    enabled: !!id,
  })
}

export function useCreateCoach() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { firstName: string; middleName?: string; lastName: string; phone?: string; email?: string; bio?: string; role?: StaffRole }) =>
      api.post<Coach>("/coaches", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["coaches", "list"] }),
  })
}

export function useUpdateCoach(coachId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { isActive?: boolean; firstName?: string; middleName?: string; lastName?: string; phone?: string; email?: string; bio?: string; role?: StaffRole }) =>
      api.patch<Coach>(`/coaches/${coachId}`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.detail(coachId) })
      queryClient.invalidateQueries({ queryKey: ["coaches", "list"] })
    },
  })
}

export function useGrantCoachPortalAccess(coachId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { email: string; roleNames: string[] }) =>
      api.post<Coach>(`/coaches/${coachId}/portal-access`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.detail(coachId) })
      queryClient.invalidateQueries({ queryKey: ["coaches", "list"] })
    },
  })
}

function invalidateCoach(queryClient: ReturnType<typeof useQueryClient>, coachId: string) {
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.detail(coachId) })
  queryClient.invalidateQueries({ queryKey: ["coaches", "list"] })
}

export function useAddCoachQualification(coachId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { title: string; issuingBody?: string; issueDate?: string; expiryDate?: string }) =>
      api.post<Coach>(`/coaches/${coachId}/qualifications`, input),
    onSuccess: () => invalidateCoach(queryClient, coachId),
  })
}

export function useAddCoachAssignment(coachId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { teamId?: string; trainingGroupId?: string; role: "PRIMARY" | "ASSISTANT" }) =>
      api.post<Coach>(`/coaches/${coachId}/assignments`, input),
    onSuccess: () => invalidateCoach(queryClient, coachId),
  })
}

export function useEndCoachAssignment(coachId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (assignmentId: string) =>
      api.patch<Coach>(`/coaches/${coachId}/assignments/${assignmentId}`, {}),
    onSuccess: () => invalidateCoach(queryClient, coachId),
  })
}
