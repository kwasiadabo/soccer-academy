import { useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { Heart, LifeBuoy, ShoppingBag, Star } from "lucide-react"

import { DashboardLayout, type NavItem } from "@/app/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { StatusBadge } from "@/design-system/status-badge"
import { EmptyState } from "@/design-system/empty-state"
import { LoadingState } from "@/design-system/loading-state"
import { ErrorState } from "@/design-system/error-state"
import { PlayerPhoto } from "@/features/players/player-photo"
import { useChildren, usePlayerOfTheWeekAwards, useUnreadIssueCount } from "./parent-portal-api"

export function useParentNavItems(): NavItem[] {
  const { data: unreadCount } = useUnreadIssueCount()
  return [
    { to: "/parent", label: "My Children", icon: Heart, end: true },
    { to: "/parent/shop", label: "Shop", icon: ShoppingBag },
    { to: "/parent/issues", label: "Issues", icon: LifeBuoy, badge: unreadCount ?? 0 },
  ]
}

export function ChildrenListPage() {
  const navigate = useNavigate()
  const { data, isLoading, isError, refetch } = useChildren()
  const { data: awards } = usePlayerOfTheWeekAwards()
  const navItems = useParentNavItems()

  // "This week's" pick is whichever award has the most recent weekOf in the returned
  // list — every team's Saturday session lands on the same real-world date, so the
  // latest weekOf across all of a guardian's children stands in for "this week."
  const starredPlayerIds = useMemo(() => {
    if (!awards || awards.length === 0) return new Set<string>()
    const latestWeekOf = awards.reduce((max, a) => (a.weekOf > max ? a.weekOf : max), awards[0].weekOf)
    return new Set(awards.filter((a) => a.weekOf === latestWeekOf).map((a) => a.playerId))
  }, [awards])

  return (
    <DashboardLayout title="Parent Dashboard" navItems={navItems}>
      <Card>
        <CardHeader>
          <CardTitle>My Children</CardTitle>
          <CardDescription>View attendance, assessments, matches, and fees</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingState rows={2} />
          ) : isError ? (
            <ErrorState onRetry={() => void refetch()} />
          ) : !data || data.length === 0 ? (
            <EmptyState title="No children linked" description="Contact the academy if this doesn't look right." />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.map((child) => {
                const isStarred = starredPlayerIds.has(child.id)
                return (
                  <button
                    key={child.id}
                    onClick={() => navigate(`/parent/children/${child.id}`)}
                    className="flex items-center gap-3 rounded-xl border border-border p-4 text-left transition-colors hover:bg-muted/50"
                  >
                    <div className="relative shrink-0">
                      <PlayerPhoto
                        playerId={child.id}
                        photoDocumentId={child.photoDocumentId}
                        photoPath={`/parent-portal/children/${child.id}/photo`}
                        size={56}
                      />
                      {isStarred ? (
                        <span
                          className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-warning text-warning-foreground shadow-sm"
                          title="Player of the Week"
                        >
                          <Star className="size-3" fill="currentColor" />
                        </span>
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate font-medium">
                          {child.firstName} {child.lastName}
                        </span>
                        <StatusBadge status={child.status} />
                      </div>
                      {isStarred ? (
                        <p className="truncate text-sm font-medium text-warning">
                          ⭐ Player of the Week — trained hard this week!
                        </p>
                      ) : (
                        <p className="truncate text-sm text-muted-foreground">
                          {child.team?.name ?? "No team"} · {child.ageCategory?.name ?? "No age category"}
                        </p>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  )
}
