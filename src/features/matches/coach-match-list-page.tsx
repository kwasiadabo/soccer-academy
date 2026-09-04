import { COACH_NAV_ITEMS } from "@/features/dashboard-coach/coach-dashboard"
import { MatchListPage } from "./match-list-page"

export function CoachMatchListPage() {
  return <MatchListPage title="Matches" navItems={COACH_NAV_ITEMS} detailBasePath="/coach/matches" />
}
