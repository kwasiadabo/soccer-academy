import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { platformApi } from "@/lib/platform-api-client"

export type AcademyStatus = "ACTIVE" | "SUSPENDED" | "PENDING" | "PAST_DUE"
export type SubscriptionStatus = "ACTIVE" | "PAST_DUE"

export interface AcademyWithHealth {
  id: string
  slug: string
  name: string
  status: AcademyStatus
  createdAt: string
  activePlayerCount: number
  lastLoginAt: string | null
  // What this academy has paid SAMS for its own platform subscription — not
  // to be confused with what its parents pay it, which is that academy's own
  // private business data and never surfaced here.
  subscriptionPaidToDate: number
  subscriptionStatus: SubscriptionStatus | null
  subscriptionPeriodEnd: string | null
}

export interface PlatformPricing {
  pricePerPlayer: number
  signupFee: number
  currency: string
}

export interface OnboardAcademyInput {
  slug: string
  name: string
  brandName?: string
  adminEmail: string
  adminFirstName: string
  adminLastName: string
}

export interface OnboardAcademyResult {
  academy: { id: string; slug: string; name: string; status: AcademyStatus }
  admin: { email: string; temporaryPassword: string }
}

export interface PlatformLead {
  id: string
  academyName: string
  trainingLocation: string
  contactName: string
  contactEmail: string
  contactPhone: string | null
  message: string | null
  createdAt: string
}

const ACADEMIES_KEY = ["platform-admin", "academies"]
const LEADS_KEY = ["platform-admin", "leads"]
const PRICING_KEY = ["platform-admin", "pricing"]

export function useAcademiesWithHealth() {
  return useQuery({
    queryKey: ACADEMIES_KEY,
    queryFn: () => platformApi.get<AcademyWithHealth[]>("/academies"),
  })
}

export function useOnboardAcademy() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: OnboardAcademyInput) => platformApi.post<OnboardAcademyResult>("/academies", input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ACADEMIES_KEY })
    },
  })
}

export function useSetAcademyStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: Extract<AcademyStatus, "ACTIVE" | "SUSPENDED"> }) =>
      platformApi.patch<AcademyWithHealth>(
        `/academies/${id}/${status === "ACTIVE" ? "reactivate" : "suspend"}`,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ACADEMIES_KEY })
    },
  })
}

export function usePlatformLeads() {
  return useQuery({
    queryKey: LEADS_KEY,
    queryFn: () => platformApi.get<PlatformLead[]>("/leads"),
  })
}

export function usePlatformPricing() {
  return useQuery({
    queryKey: PRICING_KEY,
    queryFn: () => platformApi.get<PlatformPricing>("/pricing"),
  })
}

export function useUpdatePlatformPricing() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { pricePerPlayer: number; signupFee: number }) =>
      platformApi.patch<PlatformPricing>("/pricing", input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PRICING_KEY })
    },
  })
}
