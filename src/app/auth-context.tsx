import { createContext, useCallback, useContext, useEffect, useState } from "react"
import type { ReactNode } from "react"
import type { AuthResponse, AuthUser } from "@soccer-academy/shared-types"
import { api, setAccessToken, setSessionExpiredHandler } from "@/lib/api-client"

interface AuthContextValue {
  user: AuthUser | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<AuthUser>
  logout: () => Promise<void>
  hasRole: (...roles: string[]) => boolean
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const clearSession = useCallback(() => {
    setAccessToken(null)
    setUser(null)
  }, [])

  useEffect(() => {
    setSessionExpiredHandler(clearSession)
    return () => setSessionExpiredHandler(null)
  }, [clearSession])

  // Attempt to restore a session on load via the refresh cookie.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch("/api/auth/refresh", { method: "POST", credentials: "include" })
        if (res.ok) {
          const data = (await res.json()) as { accessToken: string }
          setAccessToken(data.accessToken)
          const me = await api.get<AuthUser>("/auth/me").catch(() => null)
          if (!cancelled) setUser(me)
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const response = await api.post<AuthResponse>("/auth/login", { email, password })
    setAccessToken(response.accessToken)
    setUser(response.user)
    return response.user
  }, [])

  const logout = useCallback(async () => {
    await api.post("/auth/logout").catch(() => undefined)
    clearSession()
  }, [clearSession])

  const hasRole = useCallback(
    (...roles: string[]) => !!user && roles.some((role) => user.roles.includes(role)),
    [user],
  )

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    await api.patch("/auth/change-password", { currentPassword, newPassword })
    setUser((prev) => (prev ? { ...prev, mustChangePassword: false } : prev))
  }, [])

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, hasRole, changePassword }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider")
  return ctx
}
