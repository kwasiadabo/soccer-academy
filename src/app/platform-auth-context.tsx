import { createContext, useCallback, useContext, useEffect, useState } from "react"
import type { ReactNode } from "react"
import {
  getStoredPlatformAccessToken,
  platformApi,
  setPlatformAccessToken,
  setPlatformSessionExpiredHandler,
} from "@/lib/platform-api-client"

export interface PlatformAdminSession {
  email: string
}

interface PlatformAuthContextValue {
  admin: PlatformAdminSession | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const PlatformAuthContext = createContext<PlatformAuthContextValue | undefined>(undefined)

// The platform admin JWT payload ({ sub, email }, see PlatformAdminJwtPayload on
// the API) is read here only to show which admin is signed in — never trusted
// for authorization, which the backend re-checks on every request.
function decodeEmail(token: string): string | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1])) as { email?: string }
    return payload.email ?? null
  } catch {
    return null
  }
}

export function PlatformAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<PlatformAdminSession | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const clearSession = useCallback(() => {
    setPlatformAccessToken(null)
    setAdmin(null)
  }, [])

  useEffect(() => {
    setPlatformSessionExpiredHandler(clearSession)
    return () => setPlatformSessionExpiredHandler(null)
  }, [clearSession])

  // There's no refresh-cookie flow for platform admins — just restore the raw
  // access token from sessionStorage (12h TTL) if this tab still has one.
  useEffect(() => {
    const token = getStoredPlatformAccessToken()
    if (token) {
      const email = decodeEmail(token)
      if (email) {
        setPlatformAccessToken(token)
        setAdmin({ email })
      }
    }
    setIsLoading(false)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const response = await platformApi.post<{ accessToken: string }>("/auth/login", { email, password })
    setPlatformAccessToken(response.accessToken)
    setAdmin({ email: decodeEmail(response.accessToken) ?? email })
  }, [])

  const logout = useCallback(() => {
    clearSession()
  }, [clearSession])

  return (
    <PlatformAuthContext.Provider value={{ admin, isLoading, login, logout }}>
      {children}
    </PlatformAuthContext.Provider>
  )
}

export function usePlatformAuth() {
  const ctx = useContext(PlatformAuthContext)
  if (!ctx) throw new Error("usePlatformAuth must be used within a PlatformAuthProvider")
  return ctx
}
