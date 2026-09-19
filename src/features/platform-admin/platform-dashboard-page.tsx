import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Ban, CheckCircle2, LogOut, Plus, Save } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
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
  useOnboardAcademy,
  usePlatformLeads,
  usePlatformPricing,
  useSetAcademyStatus,
  useUpdatePlatformPricing,
  type AcademyStatus,
  type OnboardAcademyResult,
  type SubscriptionStatus,
} from "./platform-admin-api"
import { PlatformApiError } from "@/lib/platform-api-client"

const onboardSchema = z.object({
  slug: z
    .string()
    .min(2, "Too short")
    .regex(/^[a-z0-9-]+$/, "Lowercase letters, digits, and hyphens only"),
  name: z.string().min(2, "Too short"),
  brandName: z.string().optional(),
  adminEmail: z.string().email("Enter a valid email address"),
  adminFirstName: z.string().min(1, "Required"),
  adminLastName: z.string().min(1, "Required"),
})

type OnboardFormValues = z.infer<typeof onboardSchema>

function StatusBadge({ status }: { status: AcademyStatus }) {
  if (status === "ACTIVE") return <Badge variant="success">Active</Badge>
  if (status === "SUSPENDED") return <Badge variant="destructive">Suspended</Badge>
  if (status === "PAST_DUE") return <Badge variant="warning">Past due</Badge>
  return <Badge variant="secondary">Pending</Badge>
}

function subscriptionLabel(status: SubscriptionStatus | null, periodEnd: string | null): string {
  if (!status || !periodEnd) return "—"
  if (status === "PAST_DUE") return "Payment overdue"
  const days = Math.ceil((new Date(periodEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  if (days < 0) return "Payment overdue"
  if (days === 0) return "Due today"
  return `${days} day${days === 1 ? "" : "s"} left`
}

function OnboardAcademyDialog({ open, onOpenChange, onOnboarded }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onOnboarded: (result: OnboardAcademyResult) => void
}) {
  const onboard = useOnboardAcademy()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<OnboardFormValues>({ resolver: zodResolver(onboardSchema) })

  const onSubmit = async (values: OnboardFormValues) => {
    try {
      const result = await onboard.mutateAsync({
        ...values,
        brandName: values.brandName || undefined,
      })
      reset()
      onOpenChange(false)
      onOnboarded(result)
    } catch (err) {
      toast.error(err instanceof PlatformApiError ? err.message : "Could not onboard this academy.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Onboard an academy</DialogTitle>
          <DialogDescription>
            Creates the academy, its subdomain, and a first Admin account with a one-time temporary password.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="slug">Subdomain slug</Label>
              <Input id="slug" placeholder="riverside" aria-invalid={!!errors.slug} {...register("slug")} />
              {errors.slug ? <p className="text-xs text-destructive">{errors.slug.message}</p> : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="name">Academy name</Label>
              <Input id="name" placeholder="Riverside FC" aria-invalid={!!errors.name} {...register("name")} />
              {errors.name ? <p className="text-xs text-destructive">{errors.name.message}</p> : null}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="brandName">Brand name (optional)</Label>
            <Input id="brandName" placeholder="Defaults to academy name" {...register("brandName")} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="adminEmail">First admin's email</Label>
            <Input
              id="adminEmail"
              type="email"
              aria-invalid={!!errors.adminEmail}
              {...register("adminEmail")}
            />
            {errors.adminEmail ? <p className="text-xs text-destructive">{errors.adminEmail.message}</p> : null}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="adminFirstName">First name</Label>
              <Input id="adminFirstName" aria-invalid={!!errors.adminFirstName} {...register("adminFirstName")} />
              {errors.adminFirstName ? (
                <p className="text-xs text-destructive">{errors.adminFirstName.message}</p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="adminLastName">Last name</Label>
              <Input id="adminLastName" aria-invalid={!!errors.adminLastName} {...register("adminLastName")} />
              {errors.adminLastName ? (
                <p className="text-xs text-destructive">{errors.adminLastName.message}</p>
              ) : null}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Onboarding…" : "Onboard academy"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function CredentialsDialog({ result, onClose }: { result: OnboardAcademyResult | null; onClose: () => void }) {
  return (
    <Dialog open={!!result} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{result?.academy.name} is live</DialogTitle>
          <DialogDescription>
            Save this temporary password now — it will not be shown again. The admin must change it on first login.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 rounded-lg border border-border bg-muted/40 p-4 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Subdomain</span>
            <span className="font-medium tabular-nums">{result?.academy.slug}.sams.app</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Admin email</span>
            <span className="font-medium">{result?.admin.email}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Temporary password</span>
            <span className="font-mono font-medium">{result?.admin.temporaryPassword}</span>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function AcademiesTab() {
  const { data: academies, isLoading, isError, refetch } = useAcademiesWithHealth()
  const setStatus = useSetAcademyStatus()
  const [onboardOpen, setOnboardOpen] = useState(false)
  const [credentials, setCredentials] = useState<OnboardAcademyResult | null>(null)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {academies?.length ?? 0} academ{academies?.length === 1 ? "y" : "ies"} on SAMS
        </p>
        <Button size="sm" onClick={() => setOnboardOpen(true)}>
          <Plus className="size-4" aria-hidden />
          Onboard academy
        </Button>
      </div>

      {isLoading ? (
        <LoadingState rows={4} />
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : !academies?.length ? (
        <EmptyState title="No academies yet" description="Onboard the first academy to get started." />
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

      <OnboardAcademyDialog open={onboardOpen} onOpenChange={setOnboardOpen} onOnboarded={setCredentials} />
      <CredentialsDialog result={credentials} onClose={() => setCredentials(null)} />
    </div>
  )
}

function LeadsTab() {
  const { data: leads, isLoading, isError, refetch } = usePlatformLeads()

  if (isLoading) return <LoadingState rows={4} />
  if (isError) return <ErrorState onRetry={() => void refetch()} />
  if (!leads?.length) {
    return <EmptyState title="No leads yet" description="Submissions from the SAMS sign-up form will show up here." />
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Academy</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Message</TableHead>
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
              <TableCell className="text-right text-sm text-muted-foreground">
                {formatDate(lead.createdAt)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function PricingTab() {
  const { data: pricing, isLoading, isError, refetch } = usePlatformPricing()
  const updatePricing = useUpdatePlatformPricing()
  const [value, setValue] = useState("")

  useEffect(() => {
    if (pricing) setValue(String(pricing.pricePerPlayer))
  }, [pricing])

  const onSave = async () => {
    const pricePerPlayer = Number(value)
    if (!Number.isFinite(pricePerPlayer) || pricePerPlayer < 0) return
    try {
      await updatePricing.mutateAsync(pricePerPlayer)
      toast.success("Price updated.")
    } catch (err) {
      toast.error(err instanceof PlatformApiError ? err.message : "Could not update the price.")
    }
  }

  if (isLoading) return <LoadingState rows={2} />
  if (isError) return <ErrorState onRetry={() => void refetch()} />

  return (
    <div className="max-w-md space-y-4 rounded-xl border border-border bg-card p-6">
      <div>
        <h2 className="text-sm font-semibold">Price per active player</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Every academy is billed monthly at this rate, times its active player count. Changing it only affects
          billing periods that start after the change — invoices already generated keep their own snapshot.
        </p>
      </div>
      <div className="flex items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="pricePerPlayer">GHS / player / month</Label>
          <Input
            id="pricePerPlayer"
            type="number"
            min={0}
            step="0.01"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-40"
          />
        </div>
        <Button onClick={() => void onSave()} disabled={updatePricing.isPending || !value}>
          <Save className="size-4" aria-hidden />
          Save
        </Button>
      </div>
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
            <TabsTrigger value="leads">Leads</TabsTrigger>
            <TabsTrigger value="pricing">Pricing</TabsTrigger>
          </TabsList>
          <TabsContent value="academies" className="mt-6">
            <AcademiesTab />
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
