import { useEffect, useState } from "react"
import { Ban, CheckCircle2, LogOut, Save } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { EmptyState } from "@/design-system/empty-state"
import { LoadingState } from "@/design-system/loading-state"
import { ErrorState } from "@/design-system/error-state"
import { SamsMark } from "@/design-system/sams-mark"
import { usePlatformAuth } from "@/app/platform-auth-context"
import { formatCurrency } from "@/lib/currency"
import { formatDate } from "@/lib/date"
import {
  useAcademiesWithHealth,
  useBillingSummary,
  usePlatformLeads,
  usePlatformPricing,
  useSetAcademyStatus,
  useUpdateLeadStatus,
  useUpdatePlatformPricing,
  type AcademyStatus,
  type LeadStatus,
  type SubscriptionStatus,
} from "./platform-admin-api"
import { PlatformApiError } from "@/lib/platform-api-client"

function StatusBadge({ status }: { status: AcademyStatus }) {
  if (status === "ACTIVE") return <Badge variant="success">Active</Badge>
  if (status === "SUSPENDED") return <Badge variant="destructive">Suspended</Badge>
  if (status === "PAST_DUE") return <Badge variant="warning">Past due</Badge>
  return <Badge variant="secondary">Pending</Badge>
}

const LEAD_STATUSES: LeadStatus[] = ["NEW", "CONTACTED", "CONVERTED", "CLOSED"]
const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  CONVERTED: "Converted",
  CLOSED: "Closed",
}

function LeadStatusBadge({ status }: { status: LeadStatus }) {
  if (status === "NEW") return <Badge variant="info">New</Badge>
  if (status === "CONTACTED") return <Badge variant="warning">Contacted</Badge>
  if (status === "CONVERTED") return <Badge variant="success">Converted</Badge>
  return <Badge variant="secondary">Closed</Badge>
}

function subscriptionLabel(status: SubscriptionStatus | null, periodEnd: string | null): string {
  if (!status || !periodEnd) return "—"
  if (status === "PAST_DUE") return "Payment overdue"
  const days = Math.ceil((new Date(periodEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  if (days < 0) return "Payment overdue"
  if (days === 0) return "Due today"
  return `${days} day${days === 1 ? "" : "s"} left`
}

function AcademiesTab() {
  const { data: academies, isLoading, isError, refetch } = useAcademiesWithHealth()
  const setStatus = useSetAcademyStatus()

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {academies?.length ?? 0} academ{academies?.length === 1 ? "y" : "ies"} on SAMS
      </p>

      {isLoading ? (
        <LoadingState rows={4} />
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : !academies?.length ? (
        <EmptyState
          title="No academies yet"
          description="Academies appear here once they sign up and complete the one-time signup fee."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Academy</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Subscription</TableHead>
                <TableHead className="text-right">Active players</TableHead>
                <TableHead>Last login</TableHead>
                <TableHead className="text-right">Subscription paid</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {academies.map((academy) => (
                <TableRow key={academy.id}>
                  <TableCell>
                    <p className="font-medium">{academy.name}</p>
                    <p className="text-xs text-muted-foreground">{academy.slug}.sams.app</p>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={academy.status} />
                  </TableCell>
                  <TableCell
                    className={
                      academy.subscriptionStatus === "PAST_DUE" ? "text-sm font-medium text-destructive" : "text-sm text-muted-foreground"
                    }
                  >
                    {subscriptionLabel(academy.subscriptionStatus, academy.subscriptionPeriodEnd)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{academy.activePlayerCount}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {academy.lastLoginAt ? formatDate(academy.lastLoginAt) : "Never"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(academy.subscriptionPaidToDate)}
                  </TableCell>
                  <TableCell className="text-right">
                    {academy.status === "SUSPENDED" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={setStatus.isPending}
                        onClick={() =>
                          setStatus.mutate(
                            { id: academy.id, status: "ACTIVE" },
                            {
                              onError: (err) =>
                                toast.error(err instanceof PlatformApiError ? err.message : "Could not reactivate this academy."),
                            },
                          )
                        }
                      >
                        <CheckCircle2 className="size-4" aria-hidden />
                        Reactivate
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={setStatus.isPending}
                        onClick={() =>
                          setStatus.mutate(
                            { id: academy.id, status: "SUSPENDED" },
                            {
                              onError: (err) =>
                                toast.error(err instanceof PlatformApiError ? err.message : "Could not suspend this academy."),
                            },
                          )
                        }
                      >
                        <Ban className="size-4" aria-hidden />
                        Suspend
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

function LeadsTab() {
  const { data: leads, isLoading, isError, refetch } = usePlatformLeads()
  const updateStatus = useUpdateLeadStatus()

  if (isLoading) return <LoadingState rows={4} />
  if (isError) return <ErrorState onRetry={() => void refetch()} />
  if (!leads?.length) {
    return <EmptyState title="No leads yet" description="Submissions from the SAMS sign-up form will show up here." />
  }

  const newCount = leads.filter((lead) => lead.status === "NEW").length

  const onStatusChange = async (id: string, status: LeadStatus) => {
    try {
      await updateStatus.mutateAsync({ id, status })
    } catch (err) {
      toast.error(err instanceof PlatformApiError ? err.message : "Could not update lead status.")
    }
  }

  return (
    <div className="space-y-3">
      {newCount > 0 ? (
        <p className="text-sm text-muted-foreground">
          <Badge variant="info">{newCount} new</Badge> awaiting follow-up.
        </p>
      ) : null}
      <div className="overflow-x-auto rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Academy</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Message</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Submitted</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((lead) => (
              <TableRow key={lead.id}>
                <TableCell className="font-medium">{lead.academyName}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{lead.trainingLocation}</TableCell>
                <TableCell>
                  <p>{lead.contactName}</p>
                  <p className="text-xs text-muted-foreground">{lead.contactEmail}</p>
                  {lead.contactPhone ? <p className="text-xs text-muted-foreground">{lead.contactPhone}</p> : null}
                </TableCell>
                <TableCell className="max-w-xs text-sm text-muted-foreground">{lead.message || "—"}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <LeadStatusBadge status={lead.status} />
                    <Select
                      aria-label={`Update status for ${lead.academyName}`}
                      className="h-8 w-auto text-xs"
                      value={lead.status}
                      disabled={updateStatus.isPending}
                      onChange={(e) => void onStatusChange(lead.id, e.target.value as LeadStatus)}
                    >
                      {LEAD_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {LEAD_STATUS_LABELS[status]}
                        </option>
                      ))}
                    </Select>
                  </div>
                </TableCell>
                <TableCell className="text-right text-sm text-muted-foreground">
                  {formatDate(lead.createdAt)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7)
}

function BillingTab() {
  const [month, setMonth] = useState(currentMonth())
  const { data, isLoading, isError, refetch } = useBillingSummary(month)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Amounts academies owe SAMS, by month.</p>
        <Input
          type="month"
          aria-label="Month"
          value={month}
          max={currentMonth()}
          onChange={(e) => setMonth(e.target.value)}
          className="w-40"
        />
      </div>

      {isLoading ? (
        <LoadingState rows={4} />
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : !data?.academies.length ? (
        <EmptyState title="No invoices for this month" description="No academy had a billing period starting in this month." />
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Charged</p>
              <p className="text-xl font-semibold tabular-nums">{formatCurrency(data.totals.amountCharged)}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Paid</p>
              <p className="text-xl font-semibold tabular-nums">{formatCurrency(data.totals.amountPaid)}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Outstanding</p>
              <p
                className={`text-xl font-semibold tabular-nums ${data.totals.outstanding > 0 ? "text-destructive" : ""}`}
              >
                {formatCurrency(data.totals.outstanding)}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Academy</TableHead>
                  <TableHead className="text-right">Invoices</TableHead>
                  <TableHead className="text-right">Charged</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.academies.map((row) => (
                  <TableRow key={row.academyId}>
                    <TableCell className="font-medium">{row.academyName}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.invoiceCount}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(row.amountCharged)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(row.amountPaid)}</TableCell>
                    <TableCell
                      className={`text-right tabular-nums ${row.outstanding > 0 ? "font-medium text-destructive" : ""}`}
                    >
                      {formatCurrency(row.outstanding)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  )
}

function PricingTab() {
  const { data: pricing, isLoading, isError, refetch } = usePlatformPricing()
  const updatePricing = useUpdatePlatformPricing()
  const [pricePerPlayer, setPricePerPlayer] = useState("")
  const [signupFee, setSignupFee] = useState("")

  useEffect(() => {
    if (pricing) {
      setPricePerPlayer(String(pricing.pricePerPlayer))
      setSignupFee(String(pricing.signupFee))
    }
  }, [pricing])

  const onSave = async () => {
    const pricePerPlayerValue = Number(pricePerPlayer)
    const signupFeeValue = Number(signupFee)
    if (!Number.isFinite(pricePerPlayerValue) || pricePerPlayerValue < 0) return
    if (!Number.isFinite(signupFeeValue) || signupFeeValue < 0) return
    try {
      await updatePricing.mutateAsync({ pricePerPlayer: pricePerPlayerValue, signupFee: signupFeeValue })
      toast.success("Pricing updated.")
    } catch (err) {
      toast.error(err instanceof PlatformApiError ? err.message : "Could not update pricing.")
    }
  }

  if (isLoading) return <LoadingState rows={2} />
  if (isError) return <ErrorState onRetry={() => void refetch()} />

  return (
    <div className="max-w-md space-y-6 rounded-xl border border-border bg-card p-6">
      <div className="space-y-1.5">
        <Label htmlFor="pricePerPlayer">GHS / player / month</Label>
        <p className="text-sm text-muted-foreground">
          Every academy is billed monthly at this rate, times its active player count. Changing it only affects
          billing periods that start after the change — invoices already generated keep their own snapshot.
        </p>
        <Input
          id="pricePerPlayer"
          type="number"
          min={0}
          step="0.01"
          value={pricePerPlayer}
          onChange={(e) => setPricePerPlayer(e.target.value)}
          className="w-40"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="signupFee">One-time signup fee (GHS)</Label>
        <p className="text-sm text-muted-foreground">
          Charged once during self-serve signup, before an academy's account is created. Applies to every academy
          that signs up from here on — a value of 0 disables self-serve signup entirely.
        </p>
        <Input
          id="signupFee"
          type="number"
          min={0}
          step="0.01"
          value={signupFee}
          onChange={(e) => setSignupFee(e.target.value)}
          className="w-40"
        />
      </div>
      <Button onClick={() => void onSave()} disabled={updatePricing.isPending || !pricePerPlayer || !signupFee}>
        <Save className="size-4" aria-hidden />
        Save
      </Button>
    </div>
  )
}

export function PlatformDashboardPage() {
  const { admin, logout } = usePlatformAuth()

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <SamsMark className="size-9" />
            <div>
              <h1 className="text-lg tracking-tight uppercase" style={{ fontFamily: "Anton, sans-serif" }}>
                Platform Console
              </h1>
              <p className="text-xs text-muted-foreground">{admin?.email}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={logout}>
            <LogOut className="size-4" aria-hidden />
            Sign out
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <Tabs defaultValue="academies">
          <TabsList>
            <TabsTrigger value="academies">Academies</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
            <TabsTrigger value="leads">Leads</TabsTrigger>
            <TabsTrigger value="pricing">Pricing</TabsTrigger>
          </TabsList>
          <TabsContent value="academies" className="mt-6">
            <AcademiesTab />
          </TabsContent>
          <TabsContent value="billing" className="mt-6">
            <BillingTab />
          </TabsContent>
          <TabsContent value="leads" className="mt-6">
            <LeadsTab />
          </TabsContent>
          <TabsContent value="pricing" className="mt-6">
            <PricingTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
