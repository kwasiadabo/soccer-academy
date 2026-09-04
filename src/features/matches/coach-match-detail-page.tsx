import { COACH_NAV_ITEMS } from "@/features/dashboard-coach/coach-dashboard"
import { MatchDetailPage } from "./match-detail-page"

export function CoachMatchDetailPage() {
  return <MatchDetailPage navItems={COACH_NAV_ITEMS} backTo="/coach/matches" />
}
