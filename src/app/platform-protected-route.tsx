import { Navigate, Outlet, useLocation } from "react-router-dom"
import { usePlatformAuth } from "./platform-auth-context"

export function PlatformProtectedRoute() {
  const { admin, isLoading } = usePlatformAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    )
  }

  if (!admin) {
    return <Navigate to="/platform/login" replace state={{ from: location }} />
  }

  return <Outlet />
}
