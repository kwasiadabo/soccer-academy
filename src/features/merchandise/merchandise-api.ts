import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api, apiUpload } from "@/lib/api-client"
import type {
  MerchandiseOrderStatus,
  ProductCategory,
  ShopOrder,
  ShopProduct,
  ShopProductImage,
  ShopProductVariant,
} from "@/features/dashboard-parent/shop/shop-api"

export type { MerchandiseOrderStatus, ProductCategory, ShopOrder, ShopProduct, ShopProductImage, ShopProductVariant }

const QUERY_KEYS = {
  products: ["merchandise", "products"] as const,
  product: (id: string) => ["merchandise", "products", id] as const,
  orders: ["merchandise", "orders"] as const,
  order: (id: string) => ["merchandise", "orders", id] as const,
}

export function useAllProducts() {
  return useQuery({
    queryKey: QUERY_KEYS.products,
    queryFn: () => api.get<ShopProduct[]>("/merchandise/products"),
  })
}

export function useProduct(productId: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.product(productId ?? ""),
    queryFn: () => api.get<ShopProduct>(`/merchandise/products/${productId}`),
    enabled: !!productId,
  })
}

function invalidateProducts(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products })
  queryClient.invalidateQueries({ queryKey: ["parent-portal", "shop", "products"] })
}

export function useCreateProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { name: string; description?: string; category: ProductCategory; basePrice: number }) =>
      api.post<ShopProduct>("/merchandise/products", input),
    onSuccess: () => invalidateProducts(queryClient),
  })
}

export function useUpdateProduct(productId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: Partial<{ name: string; description: string; category: ProductCategory; basePrice: number; isActive: boolean }>) =>
      api.patch<ShopProduct>(`/merchandise/products/${productId}`, input),
    onSuccess: () => {
      invalidateProducts(queryClient)
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.product(productId) })
    },
  })
}

export function useAddVariant(productId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { sizeLabel: string; priceOverride?: number; stockQuantity?: number }) =>
      api.post<ShopProduct>(`/merchandise/products/${productId}/variants`, input),
    onSuccess: () => {
      invalidateProducts(queryClient)
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.product(productId) })
    },
  })
}

export function useUpdateVariant(productId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      variantId,
      ...input
    }: { variantId: string } & Partial<{ sizeLabel: string; priceOverride: number; stockQuantity: number; isActive: boolean }>) =>
      api.patch<ShopProduct>(`/merchandise/products/${productId}/variants/${variantId}`, input),
    onSuccess: () => {
      invalidateProducts(queryClient)
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.product(productId) })
    },
  })
}

export function useAddProductImage(productId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData()
      formData.append("file", file)
      return apiUpload<ShopProduct>(`/merchandise/products/${productId}/images`, formData)
    },
    onSuccess: () => {
      invalidateProducts(queryClient)
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.product(productId) })
    },
  })
}

export function useRemoveProductImage(productId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (imageId: string) => api.delete<ShopProduct>(`/merchandise/products/${productId}/images/${imageId}`),
    onSuccess: () => {
      invalidateProducts(queryClient)
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.product(productId) })
    },
  })
}

export function useAllOrders(status?: MerchandiseOrderStatus) {
  return useQuery({
    queryKey: [...QUERY_KEYS.orders, status ?? ""] as const,
    queryFn: () => api.get<ShopOrder[]>(`/merchandise/orders${status ? `?status=${status}` : ""}`),
  })
}

export function useOrder(orderId: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.order(orderId ?? ""),
    queryFn: () => api.get<ShopOrder>(`/merchandise/orders/${orderId}`),
    enabled: !!orderId,
  })
}

export function usePendingOrderCount(enabled = true) {
  return useQuery({
    queryKey: ["merchandise", "orders", "pending-count"] as const,
    queryFn: () => api.get<number>("/merchandise/orders/pending-count"),
    refetchInterval: 60_000,
    enabled,
  })
}

export function useUpdateOrderStatus(orderId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { status: MerchandiseOrderStatus; staffNotes?: string }) =>
      api.patch<ShopOrder>(`/merchandise/orders/${orderId}/status`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.orders })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.order(orderId) })
      queryClient.invalidateQueries({ queryKey: ["merchandise", "orders", "pending-count"] })
    },
  })
}
