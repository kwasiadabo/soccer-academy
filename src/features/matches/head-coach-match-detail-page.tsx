import { HEAD_COACH_NAV_ITEMS } from "@/features/dashboard-head-coach/head-coach-dashboard"
import { MatchDetailPage } from "./match-detail-page"

export function HeadCoachMatchDetailPage() {
  return <MatchDetailPage navItems={HEAD_COACH_NAV_ITEMS} backTo="/head-coach/matches" />
}
