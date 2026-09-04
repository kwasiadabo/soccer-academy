import { Navigate, Route, Routes } from "react-router-dom"
import { ROLE_NAMES } from "@soccer-academy/shared-types"

import { useAuth } from "@/app/auth-context"
import { ProtectedRoute } from "@/app/protected-route"
import { homePathForRoles } from "@/app/role-routes"
import { LoginPage } from "@/features/auth/login-page"
import { ForgotPasswordPage } from "@/features/auth/forgot-password-page"
import { ResetPasswordPage } from "@/features/auth/reset-password-page"
import { ForceChangePasswordPage } from "@/features/auth/force-change-password-page"
import { LandingPage } from "@/features/marketing/landing-page"
import { AdminDashboard } from "@/features/dashboard-admin/admin-dashboard"
import { StaffPage } from "@/features/dashboard-admin/staff-page"
import { UsersPage } from "@/features/users/users-page"
import { AdminAssessmentTemplatesPage } from "@/features/assessments/admin-assessment-templates-page"
import { HeadCoachAssessmentTemplatesPage } from "@/features/assessments/head-coach-assessment-templates-page"
import { HeadCoachPlayerRatingsPage } from "@/features/assessments/head-coach-player-ratings-page"
import { HeadCoachPlayerRatingsDetailPage } from "@/features/assessments/head-coach-player-ratings-detail-page"
import { CoachAssessmentsPage } from "@/features/assessments/coach-assessments-page"
import { CoachPlayerAssessPage } from "@/features/assessments/coach-player-assess-page"
import { CoachPlayerMarksPage } from "@/features/training/coach-player-marks-page"
import { AdminCoachProfilePage } from "@/features/coaches/admin-coach-profile-page"
import { HeadCoachCoachesPage } from "@/features/coaches/head-coach-coaches-page"
import { HeadCoachCoachProfilePage } from "@/features/coaches/head-coach-coach-profile-page"
import { CoachMatchListPage } from "@/features/matches/coach-match-list-page"
import { CoachMatchDetailPage } from "@/features/matches/coach-match-detail-page"
import { HeadCoachMatchListPage } from "@/features/matches/head-coach-match-list-page"
import { HeadCoachMatchDetailPage } from "@/features/matches/head-coach-match-detail-page"
import { ReceptionistDashboard } from "@/features/dashboard-receptionist/receptionist-dashboard"
import { ReceptionistStatsPage } from "@/features/dashboard-receptionist/receptionist-stats-page"
import { NewRegistrationPage } from "@/features/players/new-registration-page"
import { PlayerProfilePage } from "@/features/players/player-profile-page"
import { FeeTypesPage } from "@/features/finance/fee-types-page"
import { DebtorsPage } from "@/features/finance/debtors-page"
import { PaymentsReportPage } from "@/features/finance/payments-report-page"
import { MonthlyBillingPage } from "@/features/finance/monthly-billing-page"
import { DebtorsAgingPage } from "@/features/finance/debtors-aging-page"
import { PlayerStatementPage } from "@/features/finance/player-statement-page"
import { BirthdaysPage } from "@/features/players/birthdays-page"
import { HeadCoachDashboard } from "@/features/dashboard-head-coach/head-coach-dashboard"
import { HeadCoachTeamsPage } from "@/features/dashboard-head-coach/head-coach-teams-page"
import { HeadCoachPlayersPage } from "@/features/dashboard-head-coach/head-coach-players-page"
import { TrainingApprovalQueuePage } from "@/features/training/training-approval-queue-page"
import { CoachDashboard } from "@/features/dashboard-coach/coach-dashboard"
import { TrainingPlanListPage } from "@/features/training/training-plan-list-page"
import { TrainingPlanEditorPage } from "@/features/training/training-plan-editor-page"
import { TrainingSessionListPage } from "@/features/training/training-session-list-page"
import { SessionAttendancePage } from "@/features/training/session-attendance-page"
import { ParentDashboard } from "@/features/dashboard-parent/parent-dashboard"
import { ChildDetailPage } from "@/features/dashboard-parent/child-detail-page"
import { IssuesListPage } from "@/features/dashboard-parent/issues-list-page"
import { IssueDetailPage } from "@/features/dashboard-parent/issue-detail-page"
import { StaffIssuesPage } from "@/features/issues/staff-issues-page"
import { StaffGalleryPage } from "@/features/gallery/staff-gallery-page"
import { StaffIssueDetailPage } from "@/features/issues/staff-issue-detail-page"
import { ShopLayout } from "@/features/dashboard-parent/shop/shop-layout"
import { ShopCatalogPage } from "@/features/dashboard-parent/shop/shop-catalog-page"
import { ProductDetailPage } from "@/features/dashboard-parent/shop/product-detail-page"
import { CartReviewPage } from "@/features/dashboard-parent/shop/cart-review-page"
import { MyOrdersListPage } from "@/features/dashboard-parent/shop/my-orders-list-page"
import { MyOrderDetailPage } from "@/features/dashboard-parent/shop/my-order-detail-page"
import { StaffOrdersPage } from "@/features/merchandise/staff-orders-page"
import { StaffOrderDetailPage } from "@/features/merchandise/staff-order-detail-page"
import { StaffProductsPage } from "@/features/merchandise/staff-products-page"

function RootRedirect() {
  const { user, isLoading } = useAuth()
  if (isLoading) return null
  if (user) {
    return <Navigate to={user.mustChangePassword ? "/change-password" : homePathForRoles(user.roles)} replace />
  }
  return <LandingPage />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/" element={<RootRedirect />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/change-password" element={<ForceChangePasswordPage />} />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={[ROLE_NAMES.ADMIN]} />}>
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/staff" element={<StaffPage />} />
        <Route path="/admin/users" element={<UsersPage />} />
        <Route path="/admin/assessment-templates" element={<AdminAssessmentTemplatesPage />} />
        <Route path="/admin/staff/:coachId" element={<AdminCoachProfilePage />} />
      </Route>
      <Route element={<ProtectedRoute allowedRoles={[ROLE_NAMES.RECEPTIONIST, ROLE_NAMES.ADMIN]} />}>
        <Route path="/receptionist" element={<ReceptionistDashboard />} />
        <Route path="/receptionist/dashboard" element={<ReceptionistStatsPage />} />
        <Route path="/receptionist/players/new" element={<NewRegistrationPage />} />
        <Route path="/receptionist/players/:playerId" element={<PlayerProfilePage />} />
        <Route path="/receptionist/finance/fee-types" element={<FeeTypesPage />} />
        <Route path="/receptionist/finance/report" element={<PaymentsReportPage />} />
        <Route path="/receptionist/finance/monthly-billing" element={<MonthlyBillingPage />} />
        <Route path="/receptionist/finance/aging" element={<DebtorsAgingPage />} />
        <Route path="/receptionist/finance/statement" element={<PlayerStatementPage />} />
        <Route path="/receptionist/birthdays" element={<BirthdaysPage />} />
        <Route path="/receptionist/training-sessions" element={<TrainingSessionListPage />} />
        <Route path="/receptionist/training-sessions/:sessionId" element={<SessionAttendancePage />} />
      </Route>
      <Route
        element={<ProtectedRoute allowedRoles={[ROLE_NAMES.RECEPTIONIST, ROLE_NAMES.HEAD_COACH, ROLE_NAMES.ADMIN]} />}
      >
        <Route path="/receptionist/finance" element={<DebtorsPage />} />
      </Route>
      <Route element={<ProtectedRoute allowedRoles={[ROLE_NAMES.HEAD_COACH, ROLE_NAMES.ADMIN]} />}>
        <Route path="/head-coach" element={<HeadCoachDashboard />} />
        <Route path="/head-coach/approvals" element={<TrainingApprovalQueuePage />} />
        <Route path="/head-coach/templates" element={<HeadCoachAssessmentTemplatesPage />} />
        <Route path="/head-coach/teams" element={<HeadCoachTeamsPage />} />
        <Route path="/head-coach/players" element={<HeadCoachPlayersPage />} />
        <Route path="/head-coach/coaches" element={<HeadCoachCoachesPage />} />
        <Route path="/head-coach/coaches/:coachId" element={<HeadCoachCoachProfilePage />} />
        <Route path="/head-coach/matches" element={<HeadCoachMatchListPage />} />
        <Route path="/head-coach/matches/:matchId" element={<HeadCoachMatchDetailPage />} />
        <Route path="/head-coach/assessments" element={<HeadCoachPlayerRatingsPage />} />
        <Route path="/head-coach/players/:playerId/ratings" element={<HeadCoachPlayerRatingsDetailPage />} />
      </Route>
      <Route element={<ProtectedRoute allowedRoles={[ROLE_NAMES.COACH, ROLE_NAMES.ADMIN]} />}>
        <Route path="/coach" element={<CoachDashboard />} />
        <Route path="/coach/training-plans" element={<TrainingPlanListPage />} />
        <Route path="/coach/training-plans/:planId" element={<TrainingPlanEditorPage />} />
        <Route path="/coach/training-sessions" element={<TrainingSessionListPage />} />
        <Route path="/coach/training-sessions/:sessionId" element={<SessionAttendancePage />} />
        <Route path="/coach/assessments" element={<CoachAssessmentsPage />} />
        <Route path="/coach/players/:playerId/assess" element={<CoachPlayerAssessPage />} />
        <Route path="/coach/player-marks" element={<CoachPlayerMarksPage />} />
        <Route path="/coach/matches" element={<CoachMatchListPage />} />
        <Route path="/coach/matches/:matchId" element={<CoachMatchDetailPage />} />
      </Route>
      <Route element={<ProtectedRoute allowedRoles={[ROLE_NAMES.PARENT, ROLE_NAMES.PLAYER, ROLE_NAMES.ADMIN]} />}>
        <Route path="/parent" element={<ParentDashboard />} />
        <Route path="/parent/children/:playerId" element={<ChildDetailPage />} />
        <Route path="/parent/issues" element={<IssuesListPage />} />
        <Route path="/parent/issues/:issueId" element={<IssueDetailPage />} />
        <Route element={<ShopLayout />}>
          <Route path="/parent/shop" element={<ShopCatalogPage />} />
          <Route path="/parent/shop/products/:productId" element={<ProductDetailPage />} />
          <Route path="/parent/shop/cart" element={<CartReviewPage />} />
        </Route>
        <Route path="/parent/shop/orders" element={<MyOrdersListPage />} />
        <Route path="/parent/shop/orders/:orderId" element={<MyOrderDetailPage />} />
      </Route>

      <Route
        element={
          <ProtectedRoute allowedRoles={[ROLE_NAMES.ADMIN, ROLE_NAMES.RECEPTIONIST, ROLE_NAMES.HEAD_COACH]} />
        }
      >
        <Route path="/issues" element={<StaffIssuesPage />} />
        <Route path="/issues/:issueId" element={<StaffIssueDetailPage />} />
        <Route path="/merchandise/orders" element={<StaffOrdersPage />} />
        <Route path="/merchandise/orders/:orderId" element={<StaffOrderDetailPage />} />
        <Route path="/merchandise/products" element={<StaffProductsPage />} />
        <Route path="/gallery/manage" element={<StaffGalleryPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
