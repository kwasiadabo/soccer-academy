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

const IDLE_TIMEOUT_MS = 10 * 60 * 1000
// Enough to catch real activity without resetting the timer on every single
// mousemove/scroll tick.
const ACTIVITY_THROTTLE_MS = 1000
const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"] as const

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

  // Auto-logout after IDLE_TIMEOUT_MS of no mouse/keyboard/touch/scroll activity.
  // ProtectedRoute reacts to `user` becoming null by redirecting to /login with the
  // current location in state, so LoginPage can send the user back where they were.
  useEffect(() => {
    if (!user) return

    let timeoutId: ReturnType<typeof setTimeout>
    let lastReset = 0

    const scheduleLogout = () => {
      timeoutId = setTimeout(() => {
        void logout()
      }, IDLE_TIMEOUT_MS)
    }

    const onActivity = () => {
      const now = Date.now()
      if (now - lastReset < ACTIVITY_THROTTLE_MS) return
      lastReset = now
      clearTimeout(timeoutId)
      scheduleLogout()
    }

    scheduleLogout()
    for (const event of ACTIVITY_EVENTS) window.addEventListener(event, onActivity, { passive: true })

    return () => {
      clearTimeout(timeoutId)
      for (const event of ACTIVITY_EVENTS) window.removeEventListener(event, onActivity)
    }
    // Re-armed per login session (user.id), not on every incidental user-object update
    // (e.g. changePassword mutating mustChangePassword) which would otherwise reset the timer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, logout])

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
