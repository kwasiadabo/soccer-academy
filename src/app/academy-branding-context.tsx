import { createContext, useCallback, useContext, useEffect, useState } from "react"
import type { ReactNode } from "react"
import { api } from "@/lib/api-client"

interface AcademyBranding {
  name: string
  logoUrl: string | null
  contactEmail: string | null
  contactPhone: string | null
  trainingLocation: string | null
}

interface AcademyBrandingContextValue extends AcademyBranding {
  isLoading: boolean
  refresh: () => Promise<void>
}

const DEFAULT_BRANDING: AcademyBranding = {
  name: "SAMS",
  logoUrl: null,
  contactEmail: null,
  contactPhone: null,
  trainingLocation: null,
}

const AcademyBrandingContext = createContext<AcademyBrandingContextValue | undefined>(undefined)

// Fetched once per page load from a public, unauthenticated endpoint (there's
// no session yet on the login screen) — every academy's own name/logo, not
// tied to whether anyone's signed in. `refresh()` lets an authenticated admin
// who just changed it (see academy-settings-page.tsx) see the sidebar/favicon
// update immediately, without waiting for the next full page load.
export function AcademyBrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState<AcademyBranding>(DEFAULT_BRANDING)
  const [isLoading, setIsLoading] = useState(true)

  const fetchBranding = useCallback(async () => {
    try {
      const data = await api.get<AcademyBranding>("/academies/public")
      setBranding(data)
    } catch {
      // Keep whatever branding is already showing rather than blanking it out.
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    fetchBranding().finally(() => {
      if (!cancelled) setIsLoading(false)
    })
    return () => {
      cancelled = true
    }
    // fetchBranding is stable (empty deps) — only ever run once per page load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    document.title = branding.name
    const favicon = document.querySelector<HTMLLinkElement>("link[rel='icon']")
    if (favicon && branding.logoUrl) {
      favicon.href = branding.logoUrl
    }
  }, [branding])

  return (
    <AcademyBrandingContext.Provider value={{ ...branding, isLoading, refresh: fetchBranding }}>
      {children}
    </AcademyBrandingContext.Provider>
  )
}

export function useAcademyBranding() {
  const ctx = useContext(AcademyBrandingContext)
  if (!ctx) throw new Error("useAcademyBranding must be used within an AcademyBrandingProvider")
  return ctx
}
