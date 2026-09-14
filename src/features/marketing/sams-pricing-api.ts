import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api-client"

export interface PlatformPricing {
  pricePerPlayer: number
  currency: string
}

// Public — no auth needed, powers the landing page's pricing section.
export function usePublicPricing() {
  return useQuery({
    queryKey: ["platform-pricing", "public"],
    queryFn: () => api.get<PlatformPricing>("/platform/pricing"),
  })
}
