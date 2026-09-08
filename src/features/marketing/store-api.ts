import { useMutation, useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api-client"

export type StoreProductCategory = "JERSEY" | "TRACK_SUIT" | "BOOTS" | "SOCKS" | "OTHER"

export interface StoreProductVariant {
  id: string
  sizeLabel: string
  priceOverride: string | null
  stockQuantity: number
  isActive: boolean
}

export interface StoreProductImage {
  id: string
  sortOrder: number
}

export interface StoreProduct {
  id: string
  name: string
  description: string | null
  category: StoreProductCategory
  basePrice: string
  variants: StoreProductVariant[]
  images: StoreProductImage[]
}

export function useStoreProducts() {
  return useQuery({
    queryKey: ["shop", "public", "products"] as const,
    queryFn: () => api.get<StoreProduct[]>("/shop/products"),
  })
}

export function storeProductImageUrl(productId: string, imageId: string): string {
  return `/api/shop/products/${productId}/images/${imageId}`
}

export interface StorePlayerLookup {
  id: string
  firstName: string
  lastName: string
  team: { name: string } | null
}

// On-demand (not auto-fetched) — the buyer triggers this by entering a player code.
export function useLookupPlayer() {
  return useMutation({
    mutationFn: (playerCode: string) =>
      api.get<StorePlayerLookup>(`/shop/players/lookup?code=${encodeURIComponent(playerCode)}`),
  })
}

export interface CreateGuestOrderInput {
  playerCode: string
  guestName: string
  guestPhone: string
  guestEmail?: string
  items: { productVariantId: string; quantity: number }[]
}

export interface GuestOrderResult {
  id: string
  totalAmount: string
}

export function useCreateGuestOrder() {
  return useMutation({
    mutationFn: (input: CreateGuestOrderInput) => api.post<GuestOrderResult>("/shop/orders", input),
  })
}
