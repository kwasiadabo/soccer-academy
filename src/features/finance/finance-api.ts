import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import { formatMonthYear } from "@/lib/date"

export type FeeCategory =
  | "REGISTRATION"
  | "MONTHLY_SUBSCRIPTION"
  | "LEVY"
  | "TOURNAMENT"
  | "UNIFORM_EQUIPMENT"
  | "SPECIAL_ACTIVITY"
  | "DONATION"
  | "OTHER"

export type InvoiceStatus = "PENDING" | "PARTIALLY_PAID" | "PAID" | "OVERDUE" | "WAIVED" | "CANCELLED"
export type PaymentMethod = "CASH" | "BANK_TRANSFER" | "MOBILE_MONEY" | "CARD" | "ONLINE_GATEWAY" | "OTHER"

export interface FeeItem {
  id: string
  name: string
  description: string | null
  defaultAmount: string
  isActive: boolean
}

export interface FeeTypeItem {
  feeItemId: string
  feeItem: FeeItem
}

export interface FeeType {
  id: string
  name: string
  category: FeeCategory
  description: string | null
  isRecurring: boolean
  defaultAmount: string
  isActive: boolean
  items: FeeTypeItem[]
}

export interface PaymentAllocation {
  id: string
  paymentId: string
  invoiceId: string
  amount: string
}

export interface Invoice {
  id: string
  invoiceNumber: string
  playerId: string
  feeTypeId: string
  description: string | null
  amount: string
  discountAmount: string
  dueDate: string
  status: InvoiceStatus
  issuedAt: string
  feeType: FeeType
  allocations: PaymentAllocation[]
}

export interface CreateFeeTypeInput {
  name: string
  category: FeeCategory
  description?: string
  isRecurring?: boolean
}

export interface CreateFeeItemInput {
  name: string
  description?: string
  defaultAmount: number
}

const QUERY_KEYS = {
  feeTypes: ["finance", "fee-types"] as const,
  allFeeTypes: ["finance", "fee-types", "all"] as const,
  feeItems: ["finance", "fee-items"] as const,
  allFeeItems: ["finance", "fee-items", "all"] as const,
  playerInvoices: (playerId: string) => ["finance", "invoices", playerId] as const,
}

export function amountPaid(invoice: Invoice): number {
  return invoice.allocations.reduce((sum, a) => sum + Number(a.amount), 0)
}

export function remainingBalance(invoice: Invoice): number {
  return Number(invoice.amount) - Number(invoice.discountAmount) - amountPaid(invoice)
}

// Recurring monthly-subscription invoices carry no per-month description, so their fee
// type name alone ("Monthly Subscription") doesn't say which month it's for — append it
// from the invoice's issued date. Falls back to the invoice's own description, then the
// bare fee type name for every other (non-recurring) category.
export function invoiceDisplayLabel(invoice: Pick<Invoice, "description" | "issuedAt" | "feeType">): string {
  if (invoice.description) return invoice.description
  if (invoice.feeType.category === "MONTHLY_SUBSCRIPTION") {
    return `${invoice.feeType.name} - ${formatMonthYear(invoice.issuedAt)}`
  }
  return invoice.feeType.name
}

export function useFeeTypes() {
  return useQuery({
    queryKey: QUERY_KEYS.feeTypes,
    queryFn: () => api.get<FeeType[]>("/finance/fee-types"),
  })
}

// Includes inactive fee types — for the management screen only, so retired/disabled
// fee types can still be found and reactivated.
export function useAllFeeTypes() {
  return useQuery({
    queryKey: QUERY_KEYS.allFeeTypes,
    queryFn: () => api.get<FeeType[]>("/finance/fee-types?includeInactive=true"),
  })
}

function useInvalidateFeeTypes() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.feeTypes })
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.allFeeTypes })
  }
}

export function useCreateFeeType() {
  const invalidate = useInvalidateFeeTypes()
  return useMutation({
    mutationFn: (input: CreateFeeTypeInput) => api.post<FeeType>("/finance/fee-types", input),
    onSuccess: invalidate,
  })
}

export function useUpdateFeeType(id: string) {
  const invalidate = useInvalidateFeeTypes()
  return useMutation({
    mutationFn: (
      input: Partial<{
        name: string
        description: string
        isRecurring: boolean
        isActive: boolean
      }>,
    ) => api.patch<FeeType>(`/finance/fee-types/${id}`, input),
    onSuccess: invalidate,
  })
}

export function useAddFeeTypeItem() {
  const invalidate = useInvalidateFeeTypes()
  return useMutation({
    mutationFn: ({ feeTypeId, feeItemId }: { feeTypeId: string; feeItemId: string }) =>
      api.post<FeeType>(`/finance/fee-types/${feeTypeId}/items`, { feeItemId }),
    onSuccess: invalidate,
  })
}

export function useRemoveFeeTypeItem() {
  const invalidate = useInvalidateFeeTypes()
  return useMutation({
    mutationFn: ({ feeTypeId, feeItemId }: { feeTypeId: string; feeItemId: string }) =>
      api.delete<FeeType>(`/finance/fee-types/${feeTypeId}/items/${feeItemId}`),
    onSuccess: invalidate,
  })
}

function useInvalidateFeeItems() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.feeItems })
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.allFeeItems })
    // Item price changes ripple into every Fee that includes them.
    invalidateFeeTypesQueries(queryClient)
  }
}

function invalidateFeeTypesQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.feeTypes })
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.allFeeTypes })
}

// Includes inactive fee items — for the management screen only.
export function useAllFeeItems() {
  return useQuery({
    queryKey: QUERY_KEYS.allFeeItems,
    queryFn: () => api.get<FeeItem[]>("/finance/fee-items?includeInactive=true"),
  })
}

export function useFeeItems() {
  return useQuery({
    queryKey: QUERY_KEYS.feeItems,
    queryFn: () => api.get<FeeItem[]>("/finance/fee-items"),
  })
}

export function useCreateFeeItem() {
  const invalidate = useInvalidateFeeItems()
  return useMutation({
    mutationFn: (input: CreateFeeItemInput) => api.post<FeeItem>("/finance/fee-items", input),
    onSuccess: invalidate,
  })
}

export function useUpdateFeeItem(id: string) {
  const invalidate = useInvalidateFeeItems()
  return useMutation({
    mutationFn: (input: Partial<{ name: string; description: string; defaultAmount: number; isActive: boolean }>) =>
      api.patch<FeeItem>(`/finance/fee-items/${id}`, input),
    onSuccess: invalidate,
  })
}

export function usePlayerInvoices(playerId: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.playerInvoices(playerId ?? ""),
    queryFn: () => api.get<Invoice[]>(`/finance/invoices?playerId=${playerId}`),
    enabled: !!playerId,
  })
}

export interface DebtorInvoiceRow {
  id: string
  invoiceNumber: string
  feeTypeName: string
  dueDate: string
  remaining: number
  isOverdue: boolean
}

export interface DebtorRow {
  player: { id: string; firstName: string; lastName: string; playerCode: string | null; status: string }
  invoices: DebtorInvoiceRow[]
  totalOwed: number
  hasOverdue: boolean
}

export interface TeamStatsRow {
  teamId: string | null
  teamName: string
  activePlayers: number
  owingMonthlySubscription: number
  paidUpToDate: number
}

export interface TeamStats {
  teams: TeamStatsRow[]
  totals: { activePlayers: number; owingMonthlySubscription: number; paidUpToDate: number }
}

export function useTeamStats() {
  return useQuery({
    queryKey: ["finance", "stats", "teams"] as const,
    queryFn: () => api.get<TeamStats>("/finance/stats/teams"),
  })
}

export function useDebtors() {
  return useQuery({
    queryKey: ["finance", "debtors"] as const,
    queryFn: () => api.get<DebtorRow[]>("/finance/invoices/debtors"),
  })
}

export interface DebtorAgingRow extends DebtorRow {
  oldestDueDate: string
  monthsOwing: number
}

export function useDebtorsAging(minMonths: number) {
  return useQuery({
    queryKey: ["finance", "debtors-aging", minMonths] as const,
    queryFn: () => api.get<DebtorAgingRow[]>(`/finance/invoices/debtors/aging?minMonths=${minMonths}`),
  })
}

export interface PaymentReportRow {
  paymentId: string
  receiptNumber: string
  paidAt: string
  method: PaymentMethod
  reference: string | null
  player: { id: string; firstName: string; lastName: string }
  invoiceId: string
  invoiceNumber: string
  feeTypeId: string
  feeTypeName: string
  feeTypeCategory: FeeCategory
  amount: number
}

export interface PaymentReport {
  rows: PaymentReportRow[]
  summary: {
    totalAmount: number
    count: number
    byFeeType: { feeTypeId: string; feeTypeName: string; total: number }[]
    byMethod: { method: PaymentMethod; total: number }[]
  }
}

export interface PaymentsReportFilters {
  from?: string
  to?: string
  feeTypeId?: string
  playerId?: string
}

export function usePaymentsReport(filters: PaymentsReportFilters) {
  return useQuery({
    queryKey: ["finance", "payments-report", filters] as const,
    queryFn: () => {
      const params = new URLSearchParams()
      if (filters.from) params.set("from", filters.from)
      if (filters.to) params.set("to", filters.to)
      if (filters.feeTypeId) params.set("feeTypeId", filters.feeTypeId)
      if (filters.playerId) params.set("playerId", filters.playerId)
      const qs = params.toString()
      return api.get<PaymentReport>(`/finance/payments/report${qs ? `?${qs}` : ""}`)
    },
  })
}

// A player's payment history — same shape as the academy-wide payments report, scoped
// to one player. Powers the "Payments" side of their bills-and-payments statement.
export function usePlayerPayments(playerId: string | undefined) {
  return useQuery({
    queryKey: ["finance", "payments-report", { playerId }] as const,
    queryFn: () => api.get<PaymentReport>(`/finance/payments/report?playerId=${playerId}`),
    enabled: !!playerId,
  })
}

export interface MonthlyBillingRow {
  id: string
  invoiceNumber: string
  player: { id: string; firstName: string; lastName: string; playerCode: string | null; status: string }
  feeTypeId: string
  feeTypeName: string
  amount: number
  remaining: number
  dueDate: string
  issuedAt: string
  status: InvoiceStatus
}

export interface MonthlyBillingReport {
  month: string
  rows: MonthlyBillingRow[]
  summary: { totalBilled: number; totalCollected: number; totalOutstanding: number; count: number }
}

export function useMonthlyBilling(month: string) {
  return useQuery({
    queryKey: ["finance", "monthly-billing", month] as const,
    queryFn: () => api.get<MonthlyBillingReport>(`/finance/invoices/monthly-billing?month=${month}`),
  })
}

export interface ReminderResult {
  delivered: boolean
  channels: { inApp: boolean; sms: boolean; email: boolean }
}

export function describeReminderResult(result: ReminderResult): string {
  const sent: string[] = []
  if (result.channels.sms) sent.push("SMS")
  if (result.channels.email) sent.push("email")
  if (result.channels.inApp) sent.push("in-app")
  if (sent.length === 0) return "Not delivered — no phone, email, or portal account on file"
  return `Sent via ${sent.join(" + ")}`
}

export function useSendPaymentReminder(playerId: string) {
  return useMutation({
    mutationFn: (invoiceId: string) =>
      api.post<ReminderResult>(`/finance/invoices/${invoiceId}/remind`, {
        playerId,
      }),
  })
}

export interface PaymentResult {
  id: string
  receiptNumber: string
  amount: string
  method: PaymentMethod
}

export function useCreatePayment(playerId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { method: PaymentMethod; reference?: string; allocations: { invoiceId: string; amount: number }[] }) =>
      api.post<PaymentResult>(`/finance/payments`, { ...input, playerId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.playerInvoices(playerId) })
      // A payment recorded here can also activate the player server-side (see
      // players.service.ts#activateAfterRegistrationPayment) — refresh their record too,
      // or the profile page keeps showing a stale pre-payment status.
      queryClient.invalidateQueries({ queryKey: ["players", "detail", playerId] })
      queryClient.invalidateQueries({ queryKey: ["players", "list"] })
      // Every other screen that shows this invoice's status/balance — debtors lists,
      // billing/payment reports, team stats, and merchandise orders — reads from its
      // own query key, so a payment here must invalidate all of them too or they'd
      // keep showing the pre-payment state until an unrelated refetch or reload.
      queryClient.invalidateQueries({ queryKey: ["finance", "debtors"] })
      queryClient.invalidateQueries({ queryKey: ["finance", "debtors-aging"] })
      queryClient.invalidateQueries({ queryKey: ["finance", "monthly-billing"] })
      queryClient.invalidateQueries({ queryKey: ["finance", "stats", "teams"] })
      queryClient.invalidateQueries({ queryKey: ["finance", "payments-report"] })
      queryClient.invalidateQueries({ queryKey: ["merchandise", "orders"] })
    },
  })
}
