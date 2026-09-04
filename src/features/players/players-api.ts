import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api, apiUpload } from "@/lib/api-client"
import type { AgeCategory, Team, TrainingGroup } from "@/features/dashboard-admin/academy-config-api"

export type Gender = "MALE" | "FEMALE" | "OTHER"
export type DominantFoot = "LEFT" | "RIGHT" | "BOTH"
export type GuardianRelationship = "MOTHER" | "FATHER" | "GUARDIAN" | "OTHER"
export type PaymentMethod = "CASH" | "BANK_TRANSFER" | "MOBILE_MONEY" | "CARD" | "ONLINE_GATEWAY" | "OTHER"

export interface Guardian {
  id: string
  firstName: string
  lastName: string
  phone: string
  email: string | null
  address: string | null
}

export interface PlayerGuardianLink {
  id: string
  relationship: GuardianRelationship
  isPrimary: boolean
  guardian: Guardian
}

export interface PlayerRegistration {
  id: string
  status: string
  submittedAt: string | null
  reviewedAt: string | null
  registrationFeeInvoiceId: string | null
}

export interface Player {
  id: string
  playerCode: string | null
  firstName: string
  middleName: string | null
  lastName: string
  dateOfBirth: string
  gender: Gender
  nationality: string | null
  residentialAddress: string | null
  medicalNotes: string | null
  previousExperience: string | null
  preferredPosition: string | null
  dominantFoot: DominantFoot | null
  emergencyContactName: string | null
  emergencyContactPhone: string | null
  status: string
  photoDocumentId: string | null
  ageCategoryId: string | null
  ageCategory: AgeCategory | null
  team: Team | null
  trainingGroup: TrainingGroup | null
  guardians: PlayerGuardianLink[]
  registrations: PlayerRegistration[]
}

export interface CreatePlayerInput {
  firstName: string
  middleName?: string
  lastName: string
  dateOfBirth: string
  gender: Gender
  nationality?: string
  residentialAddress?: string
  medicalNotes?: string
  previousExperience?: string
  preferredPosition?: string
  dominantFoot?: DominantFoot
  emergencyContactName?: string
  emergencyContactPhone?: string
  ageCategoryId?: string
  guardians: {
    firstName: string
    lastName: string
    phone: string
    email?: string
    relationship: GuardianRelationship
    isPrimary?: boolean
  }[]
}

const QUERY_KEYS = {
  list: (filter: { status?: string; search?: string; teamId?: string }) => ["players", "list", filter] as const,
  detail: (id: string) => ["players", "detail", id] as const,
}

export function usePlayers(filter: { status?: string; search?: string; teamId?: string } = {}) {
  return useQuery({
    queryKey: QUERY_KEYS.list(filter),
    queryFn: () => {
      const params = new URLSearchParams()
      if (filter.status) params.set("status", filter.status)
      if (filter.search) params.set("search", filter.search)
      if (filter.teamId) params.set("teamId", filter.teamId)
      const qs = params.toString()
      return api.get<Player[]>(`/players${qs ? `?${qs}` : ""}`)
    },
  })
}

export interface UpcomingBirthday {
  id: string
  firstName: string
  lastName: string
  playerCode: string | null
  dateOfBirth: string
  daysUntil: number
}

export function useUpcomingBirthdays(withinDays = 30) {
  return useQuery({
    queryKey: ["players", "birthdays", withinDays] as const,
    queryFn: () => api.get<UpcomingBirthday[]>(`/players/birthdays?withinDays=${withinDays}`),
  })
}

export function usePlayer(id: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.detail(id ?? ""),
    queryFn: () => api.get<Player>(`/players/${id}`),
    enabled: !!id,
  })
}

export function useCreatePlayer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreatePlayerInput) => api.post<Player>("/players", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["players", "list"] }),
  })
}

function useInvalidatePlayer(id: string) {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.detail(id) })
    queryClient.invalidateQueries({ queryKey: ["players", "list"] })
  }
}

export interface UpdatePlayerInput {
  firstName?: string
  middleName?: string
  lastName?: string
  dateOfBirth?: string
  gender?: Gender
  nationality?: string
  residentialAddress?: string
  medicalNotes?: string
  previousExperience?: string
  preferredPosition?: string
  dominantFoot?: DominantFoot
  emergencyContactName?: string
  emergencyContactPhone?: string
  ageCategoryId?: string
  teamId?: string
  trainingGroupId?: string
}

export function useUpdatePlayer(id: string) {
  const invalidate = useInvalidatePlayer(id)
  return useMutation({
    mutationFn: (input: UpdatePlayerInput) => api.patch<Player>(`/players/${id}`, input),
    onSuccess: invalidate,
  })
}

export interface UpdatePlayerTeamAssignmentInput {
  teamId?: string | null
  trainingGroupId?: string | null
}

export function useUpdatePlayerTeamAssignment(id: string) {
  const invalidate = useInvalidatePlayer(id)
  return useMutation({
    mutationFn: (input: UpdatePlayerTeamAssignmentInput) => api.patch<Player>(`/players/${id}/team`, input),
    onSuccess: invalidate,
  })
}

export type PlayerSettableStatus = "ACTIVE" | "SUSPENDED" | "WITHDRAWN"

export function useUpdatePlayerStatus(id: string) {
  const invalidate = useInvalidatePlayer(id)
  return useMutation({
    mutationFn: (status: PlayerSettableStatus) => api.patch<Player>(`/players/${id}/status`, { status }),
    onSuccess: invalidate,
  })
}

export function useSubmitPlayer(id: string) {
  const invalidate = useInvalidatePlayer(id)
  return useMutation({
    mutationFn: () => api.post<Player>(`/players/${id}/submit`),
    onSuccess: invalidate,
  })
}

export function useApprovePlayer(id: string) {
  const invalidate = useInvalidatePlayer(id)
  return useMutation({
    mutationFn: () => api.post<Player>(`/players/${id}/approve`),
    onSuccess: invalidate,
  })
}

export type MomoProvider = "mtn" | "vod" | "tgo"

export interface PaystackChargeResult {
  reference: string
  status: string
  displayText: string | null
}

export function useInitiatePaystackCharge(id: string) {
  return useMutation({
    mutationFn: (input: { phone: string; provider: MomoProvider }) =>
      api.post<PaystackChargeResult>(`/players/${id}/registration-payment/paystack/charge`, input),
  })
}

export interface VerifyPaystackChargeResult {
  confirmed: boolean
  status: string
  player?: Player
}

export function useVerifyPaystackCharge(id: string) {
  const invalidate = useInvalidatePlayer(id)
  return useMutation({
    mutationFn: (reference: string) =>
      api.post<VerifyPaystackChargeResult>(`/players/${id}/registration-payment/paystack/verify`, { reference }),
    onSuccess: (data) => {
      if (data.confirmed) invalidate()
    },
  })
}

export interface RegistrationPayment {
  id: string
  receiptNumber: string
  amount: string
  method: "CASH" | "MOBILE_MONEY"
  reference: string | null
  paidAt: string
}

export function useConfirmRegistrationPayment(id: string) {
  const invalidate = useInvalidatePlayer(id)
  return useMutation({
    mutationFn: (input: { method: "CASH" | "MOBILE_MONEY"; reference?: string }) =>
      api.post<{ player: Player; payment: RegistrationPayment }>(`/players/${id}/confirm-payment`, input),
    onSuccess: invalidate,
  })
}

export function useUploadPlayerPhoto(id: string) {
  const invalidate = useInvalidatePlayer(id)
  return useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData()
      formData.append("file", file)
      return apiUpload<Player>(`/players/${id}/photo`, formData)
    },
    onSuccess: invalidate,
  })
}
