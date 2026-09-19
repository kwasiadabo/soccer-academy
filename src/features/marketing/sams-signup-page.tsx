import "@fontsource/anton"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Link } from "react-router-dom"
import { ArrowLeft, ArrowRight, Banknote, CreditCard } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SamsMark } from "@/design-system/sams-mark"
import { LoadingState } from "@/design-system/loading-state"
import { formatCurrency } from "@/lib/currency"
import { ApiError } from "@/lib/api-client"
import { usePublicPricing } from "./sams-pricing-api"
import { useInitializeSignupPayment, type SignupAcademyInput } from "./sams-signup-api"
import { savePendingSignup } from "./pending-signup"

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

const signupSchema = z
  .object({
    name: z.string().min(2, "Required"),
    adminFirstName: z.string().min(1, "Required"),
    adminLastName: z.string().min(1, "Required"),
    adminEmail: z.string().email("Enter a valid email"),
    adminPassword: z.string().min(8, "At least 8 characters"),
    confirmPassword: z.string().min(1, "Required"),
  })
  .refine((data) => data.adminPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  })
type SignupFormValues = z.infer<typeof signupSchema>

function PricingTab({ onContinue }: { onContinue: () => void }) {
  const { data: pricing, isLoading } = usePublicPricing()

  return (
    <div className="rounded-2xl border border-border bg-background p-6 shadow-lg sm:p-8">
      <h2 className="text-lg font-bold tracking-tight">SAMS pricing</h2>
      <p className="mt-1 text-sm text-muted-foreground">Two simple charges — nothing hidden, no per-feature tiers.</p>

      {isLoading ? (
        <div className="mt-6">
          <LoadingState rows={2} />
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/30 p-4">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-lime-400/15 text-lime-600">
              <CreditCard className="size-4.5" aria-hidden />
            </span>
            <div className="space-y-0.5">
              <p className="text-sm font-semibold">
                {formatCurrency(pricing?.signupFee ?? 0)} — one-time signup fee
              </p>
              <p className="text-sm text-muted-foreground">
                Paid once, right now, before your academy's account is created.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/30 p-4">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-lime-400/15 text-lime-600">
              <Banknote className="size-4.5" aria-hidden />
            </span>
            <div className="space-y-0.5">
              <p className="text-sm font-semibold">
                {formatCurrency(pricing?.pricePerPlayer ?? 0)} / active player / month
              </p>
              <p className="text-sm text-muted-foreground">
                Billed monthly from your admin dashboard, based only on players you've actually registered.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 flex justify-end">
        <Button onClick={onContinue} disabled={isLoading}>
          Continue to academy details
          <ArrowRight className="size-4" aria-hidden />
        </Button>
      </div>
    </div>
  )
}

function DetailsTab({ onBack }: { onBack: () => void }) {
  const initializePayment = useInitializeSignupPayment()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>({ resolver: zodResolver(signupSchema) })

  const onSubmit = async (values: SignupFormValues) => {
    try {
      // The API's DTO whitelist rejects unknown fields — confirmPassword only
      // exists for client-side validation, never sent to the server. The
      // subdomain is no longer collected here, so it's derived from the
      // academy name instead.
      const { confirmPassword: _confirmPassword, ...input } = values
      const pending: SignupAcademyInput = { ...input, slug: slugify(values.name) }

      // Payment happens on Paystack's own hosted page — the browser navigates
      // fully away and back, so these details are carried across that trip in
      // sessionStorage (see pending-signup.ts) rather than kept in memory.
      savePendingSignup(pending)

      const callbackUrl = `${window.location.origin}/signup/callback`
      const result = await initializePayment.mutateAsync({ email: values.adminEmail, callbackUrl })
      window.location.href = result.authorizationUrl
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not start payment. Please try again.")
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-background p-6 shadow-lg sm:p-8">
      <h2 className="text-lg font-bold tracking-tight">Academy details</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Create your academy's own SAMS workspace right now — no waiting on a callback.
      </p>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="name">Academy name</Label>
          <Input id="name" placeholder="Riverside FC" {...register("name")} />
          {errors.name ? <p className="text-xs text-destructive">{errors.name.message}</p> : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="adminFirstName">Your first name</Label>
            <Input id="adminFirstName" {...register("adminFirstName")} />
            {errors.adminFirstName ? (
              <p className="text-xs text-destructive">{errors.adminFirstName.message}</p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="adminLastName">Your last name</Label>
            <Input id="adminLastName" {...register("adminLastName")} />
            {errors.adminLastName ? (
              <p className="text-xs text-destructive">{errors.adminLastName.message}</p>
            ) : null}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="adminEmail">Your email</Label>
          <Input id="adminEmail" type="email" {...register("adminEmail")} />
          {errors.adminEmail ? <p className="text-xs text-destructive">{errors.adminEmail.message}</p> : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="adminPassword">Password</Label>
            <Input id="adminPassword" type="password" {...register("adminPassword")} />
            {errors.adminPassword ? (
              <p className="text-xs text-destructive">{errors.adminPassword.message}</p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <Input id="confirmPassword" type="password" {...register("confirmPassword")} />
            {errors.confirmPassword ? (
              <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
            ) : null}
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <Button type="button" variant="ghost" onClick={onBack}>
            <ArrowLeft className="size-4" aria-hidden />
            Back to pricing
          </Button>
          <Button type="submit" disabled={isSubmitting || initializePayment.isPending}>
            {isSubmitting || initializePayment.isPending ? "Starting payment…" : "Continue to payment"}
            <ArrowRight className="size-4" aria-hidden />
          </Button>
        </div>
      </form>
    </div>
  )
}

// The real "Sign up" flow — creates the academy and its first Admin account,
// gated behind a one-time signup fee. A full page (not a modal) so it can
// carry its own URL: a pricing tab (must be seen before anything can be
// created) and an academy/details tab, then a full navigation away to
// Paystack and back to signup-payment-callback-page.tsx, which is what
// actually creates the account once payment is verified.
export function SamsSignupPage() {
  const [tab, setTab] = useState<"pricing" | "details">("pricing")

  return (
    <div className="min-h-dvh bg-[#0B0F0A] text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex h-16 max-w-2xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <SamsMark />
            <span className="text-base font-bold tracking-tight">SAMS</span>
          </Link>
          <Button asChild variant="ghost" size="sm" className="text-white hover:bg-white/10 hover:text-white">
            <Link to="/">
              <ArrowLeft className="size-4" aria-hidden />
              Back to home
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <h1
          className="text-3xl tracking-tight text-balance sm:text-4xl"
          style={{ fontFamily: "Anton, sans-serif" }}
        >
          BRING YOUR ACADEMY <span className="text-lime-400">ONTO SAMS.</span>
        </h1>
        <p className="mt-3 max-w-lg text-white/70">
          Two steps: see the pricing, then set up your academy's workspace and admin account.
        </p>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "pricing" | "details")} className="mt-8">
          <TabsList className="w-full border border-white/10 bg-white/5 sm:w-fit">
            <TabsTrigger
              value="pricing"
              className="text-white/60 data-[state=active]:bg-lime-400 data-[state=active]:text-[#0B0F0A]"
            >
              1. Pricing
            </TabsTrigger>
            <TabsTrigger
              value="details"
              className="text-white/60 data-[state=active]:bg-lime-400 data-[state=active]:text-[#0B0F0A]"
            >
              2. Academy details
            </TabsTrigger>
          </TabsList>
          <TabsContent value="pricing">
            <PricingTab onContinue={() => setTab("details")} />
          </TabsContent>
          <TabsContent value="details">
            <DetailsTab onBack={() => setTab("pricing")} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
