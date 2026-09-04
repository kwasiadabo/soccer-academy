import { HEAD_COACH_NAV_ITEMS } from "@/features/dashboard-head-coach/head-coach-dashboard"
import { CoachProfilePage } from "./coach-profile-page"

export function HeadCoachCoachProfilePage() {
  return <CoachProfilePage backTo="/head-coach/coaches" navItems={HEAD_COACH_NAV_ITEMS} />
}
