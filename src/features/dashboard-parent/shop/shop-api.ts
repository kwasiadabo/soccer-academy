import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api-client"

export type ProductCategory = "JERSEY" | "TRACK_SUIT" | "BOOTS" | "SOCKS" | "OTHER"
export type MerchandiseOrderStatus = "PENDING" | "APPROVED" | "READY_FOR_PICKUP" | "FULFILLED" | "REJECTED" | "CANCELLED"

export interface ShopProductVariant {
  id: string
  productId: string
  sizeLabel: string
  priceOverride: string | null
  stockQuantity: number
  isActive: boolean
}

export interface ShopProductImage {
  id: string
  productId: string
  sortOrder: number
}

export interface ShopProduct {
  id: string
  name: string
  description: string | null
  category: ProductCategory
  basePrice: string
  isActive: boolean
  variants: ShopProductVariant[]
  images: ShopProductImage[]
}

interface OrderPerson {
  id: string
  firstName: string
  lastName: string
}

export interface ShopOrderItem {
  id: string
  productVariantId: string
  quantity: number
  unitPriceAtOrder: string
  lineTotal: string
  productVariant: ShopProductVariant & { product: ShopProduct }
}

export interface ShopOrder {
  id: string
  guardianId: string
  submittedByUserId: string | null
  // Populated only for a guest (unauthenticated) checkout — see submittedBy for a
  // logged-in order's submitter instead.
  guestName: string | null
  guestPhone: string | null
  guestEmail: string | null
  playerId: string
  status: MerchandiseOrderStatus
  totalAmount: string
  invoiceId: string | null
  staffNotes: string | null
  createdAt: string
  updatedAt: string
  guardian: OrderPerson
  submittedBy: OrderPerson | null
  player: { id: string; firstName: string; lastName: string; playerCode: string | null }
  invoice: {
    id: string
    invoiceNumber: string
    status: string
    amount: string
    discountAmount: string
    description: string | null
    dueDate: string
    allocations: { amount: string }[]
  } | null
  items: ShopOrderItem[]
}

export function useShopProducts() {
  return useQuery({
    queryKey: ["parent-portal", "shop", "products"] as const,
    queryFn: () => api.get<ShopProduct[]>("/parent-portal/shop/products"),
  })
}

export function useShopProduct(productId: string | undefined) {
  return useQuery({
    queryKey: ["parent-portal", "shop", "products", productId ?? ""] as const,
    queryFn: () => api.get<ShopProduct>(`/parent-portal/shop/products/${productId}`),
    enabled: !!productId,
  })
}

export function useMyOrders() {
  return useQuery({
    queryKey: ["parent-portal", "shop", "orders"] as const,
    queryFn: () => api.get<ShopOrder[]>("/parent-portal/shop/orders"),
  })
}

export function useMyOrder(orderId: string | undefined) {
  return useQuery({
    queryKey: ["parent-portal", "shop", "orders", orderId ?? ""] as const,
    queryFn: () => api.get<ShopOrder>(`/parent-portal/shop/orders/${orderId}`),
    enabled: !!orderId,
  })
}

export function useSubmitOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { playerId: string; items: { productVariantId: string; quantity: number }[] }) =>
      api.post<ShopOrder>("/parent-portal/shop/orders", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parent-portal", "shop", "orders"] })
      queryClient.invalidateQueries({ queryKey: ["parent-portal", "shop", "products"] })
    },
  })
}
