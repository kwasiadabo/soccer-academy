import { HEAD_COACH_NAV_ITEMS } from "@/features/dashboard-head-coach/head-coach-dashboard"
import { MatchListPage } from "./match-list-page"

export function HeadCoachMatchListPage() {
  return (
    <MatchListPage title="Matches" navItems={HEAD_COACH_NAV_ITEMS} detailBasePath="/head-coach/matches" />
  )
}
