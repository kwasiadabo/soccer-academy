import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api-client"

export interface SubscriptionInvoice {
  id: string
  periodStart: string
  periodEnd: string
  activePlayerCount: number
  amount: number
  status: "PENDING" | "PAID" | "FAILED"
  paidAt: string | null
  createdAt: string
}

export interface SubscriptionStatus {
  status: "ACTIVE" | "PAST_DUE"
  academyStatus: string
  currentPeriodStart: string
  currentPeriodEnd: string
  daysRemaining: number
  pricePerPlayer: number
  activePlayerCount: number
  estimatedNextAmount: number
  hasPaymentMethod: boolean
  cardType: string | null
  cardLast4: string | null
  invoices: SubscriptionInvoice[]
}

const SUBSCRIPTION_KEY = ["billing", "subscription"]

export function useSubscriptionStatus() {
  return useQuery({
    queryKey: SUBSCRIPTION_KEY,
    queryFn: () => api.get<SubscriptionStatus>("/billing/subscription"),
  })
}

export function useInitializePayment() {
  return useMutation({
    mutationFn: (callbackUrl: string) =>
      api.post<{ authorizationUrl: string; reference: string }>("/billing/payment/initialize", { callbackUrl }),
  })
}

export function useVerifyPayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (reference: string) => api.get<SubscriptionStatus>(`/billing/payment/verify?reference=${encodeURIComponent(reference)}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SUBSCRIPTION_KEY })
    },
  })
}
