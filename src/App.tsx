import { Navigate, Outlet, Route, Routes } from "react-router-dom"
import { ROLE_NAMES } from "@/lib/shared-types"

import { useAuth } from "@/app/auth-context"
import { ProtectedRoute } from "@/app/protected-route"
import { PlatformAuthProvider } from "@/app/platform-auth-context"
import { PlatformProtectedRoute } from "@/app/platform-protected-route"
import { PlatformLoginPage } from "@/features/platform-admin/platform-login-page"
import { PlatformDashboardPage } from "@/features/platform-admin/platform-dashboard-page"
import { homePathForRoles } from "@/app/role-routes"
import { LoginPage } from "@/features/auth/login-page"
import { ForgotPasswordPage } from "@/features/auth/forgot-password-page"
import { ResetPasswordPage } from "@/features/auth/reset-password-page"
import { SignupPaymentCallbackPage } from "@/features/marketing/signup-payment-callback-page"
import { SamsSignupPage } from "@/features/marketing/sams-signup-page"
import { ForceChangePasswordPage } from "@/features/auth/force-change-password-page"
import { LandingPage } from "@/features/marketing/landing-page"
import { SamsLandingPage } from "@/features/marketing/sams-landing-page"
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
import { HeadCoachAgeCategoriesPage } from "@/features/dashboard-head-coach/head-coach-age-categories-page"
import { HeadCoachPlayersPage } from "@/features/dashboard-head-coach/head-coach-players-page"
import { TrainingApprovalQueuePage } from "@/features/training/training-approval-queue-page"
import { CoachDashboard } from "@/features/dashboard-coach/coach-dashboard"
import { TrainingPlanListPage } from "@/features/training/training-plan-list-page"
import { TrainingPlanEditorPage } from "@/features/training/training-plan-editor-page"
import { TrainingSessionListPage } from "@/features/training/training-session-list-page"
import { SessionAttendancePage } from "@/features/training/session-attendance-page"
import { SessionManagementPage } from "@/features/training/session-management-page"
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
import { OrdersReportPage } from "@/features/merchandise/orders-report-page"
import { BillingPage } from "@/features/billing/billing-page"
import { AcademySettingsPage } from "@/features/academy-settings/academy-settings-page"

function RootRedirect() {
  const { user, isLoading } = useAuth()
  if (isLoading) return null
  if (user) {
    return <Navigate to={user.mustChangePassword ? "/change-password" : homePathForRoles(user.roles)} replace />
  }
  return <SamsLandingPage />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/signup" element={<SamsSignupPage />} />
      <Route path="/signup/callback" element={<SignupPaymentCallbackPage />} />
      <Route path="/" element={<RootRedirect />} />
      {/* This academy's own public page (gallery, player-of-the-week, "join us") —
          distinct from the SAMS product page now at "/". */}
      <Route path="/about" element={<LandingPage />} />

      {/* The platform-operator control plane — a separate actor type from every
          academy's own users (see PlatformAuthProvider), so it gets its own
          auth provider scoped to just this subtree rather than the app-wide one. */}
      <Route path="/platform" element={<PlatformAuthProvider><Outlet /></PlatformAuthProvider>}>
        <Route path="login" element={<PlatformLoginPage />} />
        <Route element={<PlatformProtectedRoute />}>
          <Route index element={<PlatformDashboardPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route path="/change-password" element={<ForceChangePasswordPage />} />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={[ROLE_NAMES.ADMIN]} />}>
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/staff" element={<StaffPage />} />
        <Route path="/admin/billing" element={<BillingPage />} />
        <Route path="/admin/assessment-templates" element={<AdminAssessmentTemplatesPage />} />
        <Route path="/admin/staff/:coachId" element={<AdminCoachProfilePage />} />
      </Route>
      {/* The "Setup" sidebar section — shared configuration screens every staff
          role (not just Admin) can reach: user accounts, catalog, academy
          branding, fee types, and age categories. */}
      <Route
        element={<ProtectedRoute allowedRoles={[ROLE_NAMES.ADMIN, ROLE_NAMES.RECEPTIONIST, ROLE_NAMES.HEAD_COACH]} />}
      >
        <Route path="/admin/users" element={<UsersPage />} />
        <Route path="/admin/settings" element={<AcademySettingsPage />} />
        <Route path="/receptionist/finance/fee-types" element={<FeeTypesPage />} />
        <Route path="/head-coach/age-categories" element={<HeadCoachAgeCategoriesPage />} />
      </Route>
      <Route element={<ProtectedRoute allowedRoles={[ROLE_NAMES.RECEPTIONIST, ROLE_NAMES.ADMIN]} />}>
        <Route path="/receptionist" element={<ReceptionistDashboard />} />
        <Route path="/receptionist/dashboard" element={<ReceptionistStatsPage />} />
        <Route path="/receptionist/players/new" element={<NewRegistrationPage />} />
        <Route path="/receptionist/players/:playerId" element={<PlayerProfilePage />} />
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
        <Route path="/head-coach/training-sessions" element={<TrainingSessionListPage />} />
        <Route path="/head-coach/training-sessions/:sessionId" element={<SessionAttendancePage />} />
        <Route path="/head-coach/session-management" element={<SessionManagementPage />} />
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
        <Route path="/merchandise/orders/report" element={<OrdersReportPage />} />
        <Route path="/merchandise/orders/:orderId" element={<StaffOrderDetailPage />} />
        <Route path="/merchandise/products" element={<StaffProductsPage />} />
        <Route path="/gallery/manage" element={<StaffGalleryPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
