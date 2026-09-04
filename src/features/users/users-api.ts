import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api-client"

export interface AdminUser {
  id: string
  email: string
  firstName: string
  lastName: string
  phone: string | null
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED"
  mustChangePassword: boolean
  lastLoginAt: string | null
  createdAt: string
  roles: string[]
}

const QUERY_KEY = ["users", "list"] as const

export function useUsers() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => api.get<AdminUser[]>("/users"),
  })
}

export function useCreateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      email: string
      password: string
      firstName: string
      lastName: string
      phone?: string
      roleNames: string[]
      mustChangePassword?: boolean
    }) => api.post<AdminUser>("/users", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}

export function useUpdateUser(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      firstName?: string
      lastName?: string
      email?: string
      phone?: string
      status?: "ACTIVE" | "INACTIVE" | "SUSPENDED"
      roleNames?: string[]
    }) => api.patch<AdminUser>(`/users/${userId}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}

export function useDeleteUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => api.delete<void>(`/users/${userId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}

export function useResetUserPassword(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { password?: string }) =>
      api.post<{ mode: "temporary-password" | "reset-link" }>(`/users/${userId}/reset-password`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}
