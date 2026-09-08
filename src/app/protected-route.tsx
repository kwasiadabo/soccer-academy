import { Navigate, Outlet, useLocation } from "react-router-dom"
import { ROLE_NAMES } from "@/lib/shared-types"
import { useAuth } from "./auth-context"

interface ProtectedRouteProps {
  allowedRoles?: string[]
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { user, isLoading, hasRole } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (user.mustChangePassword && location.pathname !== "/change-password") {
    return <Navigate to="/change-password" replace />
  }

  // The System Administrator role can access every portal.
  if (allowedRoles && !hasRole(...allowedRoles) && !hasRole(ROLE_NAMES.ADMIN)) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
