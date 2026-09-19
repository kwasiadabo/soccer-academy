import { useEffect, useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { ArrowLeft, ArrowRight, Banknote, CreditCard, ImageUp, X } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
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
    slug: z
      .string()
      .min(2, "Too short")
      .regex(/^[a-z0-9-]+$/, "Lowercase letters, digits, and hyphens only"),
    brandName: z.string().optional(),
    adminFirstName: z.string().min(1, "Required"),
    adminLastName: z.string().min(1, "Required"),
    adminEmail: z.string().email("Enter a valid email"),
    adminPassword: z.string().min(8, "At least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.adminPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  })
type SignupFormValues = z.infer<typeof signupSchema>

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function PricingStep({ onContinue }: { onContinue: () => void }) {
  const { data: pricing, isLoading } = usePublicPricing()

  return (
    <>
      <DialogHeader>
        <DialogTitle>SAMS pricing</DialogTitle>
        <DialogDescription>Two simple charges — nothing hidden, no per-feature tiers.</DialogDescription>
      </DialogHeader>
      {isLoading ? (
        <LoadingState rows={2} />
      ) : (
        <div className="space-y-3">
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
      <DialogFooter>
        <Button onClick={onContinue} disabled={isLoading}>
          Continue
          <ArrowRight className="size-4" aria-hidden />
        </Button>
      </DialogFooter>
    </>
  )
}

function DetailsStep({ onBack }: { onBack: () => void }) {
  const [slugTouched, setSlugTouched] = useState(false)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const initializePayment = useInitializeSignupPayment()

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>({ resolver: zodResolver(signupSchema) })

  // The preview is a local object URL — nothing is uploaded until submit —
  // so it must be revoked whenever it's replaced or the dialog resets.
  useEffect(() => {
    return () => {
      if (logoPreview) URL.revokeObjectURL(logoPreview)
    }
  }, [logoPreview])

  const onLogoChange = (file: File | null) => {
    if (logoPreview) URL.revokeObjectURL(logoPreview)
    setLogoFile(file)
    setLogoPreview(file ? URL.createObjectURL(file) : null)
  }

  const onSubmit = async (values: SignupFormValues) => {
    try {
      // The API's DTO whitelist rejects unknown fields — confirmPassword only
      // exists for client-side validation, never sent to the server.
      const { confirmPassword: _confirmPassword, ...input } = values
      const pending: SignupAcademyInput = { ...input }

      // Payment happens on Paystack's own hosted page — the browser navigates
      // fully away and back, so these details are carried across that trip in
      // sessionStorage (see pending-signup.ts) rather than kept in memory.
      const logoDataUrl = logoFile ? await fileToDataUrl(logoFile) : undefined
      savePendingSignup({
        ...pending,
        logoDataUrl,
        logoFileName: logoFile?.name,
        logoMimeType: logoFile?.type,
      })

      const callbackUrl = `${window.location.origin}/signup/callback`
      const result = await initializePayment.mutateAsync({ email: values.adminEmail, callbackUrl })
      window.location.href = result.authorizationUrl
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not start payment. Please try again.")
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Bring your academy onto SAMS</DialogTitle>
        <DialogDescription>
          Create your academy's own SAMS workspace right now — no waiting on a callback.
        </DialogDescription>
      </DialogHeader>
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="name">Academy name</Label>
          <Input
            id="name"
            placeholder="Riverside FC"
            {...register("name", {
              onChange: (e) => {
                if (!slugTouched) setValue("slug", slugify(e.target.value as string))
              },
            })}
          />
          {errors.name ? <p className="text-xs text-destructive">{errors.name.message}</p> : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="slug">Your SAMS subdomain</Label>
          <div className="flex items-center gap-1.5">
            <Input
              id="slug"
              placeholder="riverside"
              {...register("slug", { onChange: () => setSlugTouched(true) })}
            />
            <span className="shrink-0 text-sm text-muted-foreground">.sams.app</span>
          </div>
          {errors.slug ? <p className="text-xs text-destructive">{errors.slug.message}</p> : null}
        </div>

        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => logoInputRef.current?.click()}
            className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-input bg-muted/40 text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
            aria-label={logoPreview ? "Change logo" : "Upload logo"}
          >
            {logoPreview ? (
              <img src={logoPreview} alt="" className="size-full object-cover" />
            ) : (
              <ImageUp className="size-5" aria-hidden />
            )}
          </button>
          <input
            ref={logoInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onLogoChange(e.target.files?.[0] ?? null)}
          />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Label htmlFor="brandName">Logo &amp; display name (optional)</Label>
            <Input id="brandName" placeholder="Defaults to academy name" {...register("brandName")} />
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {logoFile ? (
                <>
                  <span className="truncate">{logoFile.name}</span>
                  <button
                    type="button"
                    onClick={() => onLogoChange(null)}
                    className="inline-flex items-center gap-0.5 text-destructive hover:underline"
                  >
                    <X className="size-3" aria-hidden />
                    Remove
                  </button>
                </>
              ) : (
                <span>Shown on receipts, browser tab, and your public page.</span>
              )}
            </div>
          </div>
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

        <DialogFooter className="sm:justify-between">
          <Button type="button" variant="ghost" onClick={onBack}>
            <ArrowLeft className="size-4" aria-hidden />
            Back
          </Button>
          <Button type="submit" disabled={isSubmitting || initializePayment.isPending}>
            {isSubmitting || initializePayment.isPending ? "Starting payment…" : "Continue to payment"}
            <ArrowRight className="size-4" aria-hidden />
          </Button>
        </DialogFooter>
      </form>
    </>
  )
}

// The real "Sign up" flow — creates the academy and its first Admin account,
// gated behind a one-time signup fee. Three stops: a pricing explainer (must
// be seen before anything can be created), the academy/admin details form,
// and then a full navigation away to Paystack and back to
// signup-payment-callback-page.tsx, which is what actually creates the
// account once payment is verified.
export function SamsSignupFlow({ trigger }: { trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<"pricing" | "details">("pricing")

  const onOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) {
      setTimeout(() => setStep("pricing"), 200)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        {step === "pricing" ? (
          <PricingStep onContinue={() => setStep("details")} />
        ) : (
          <DetailsStep onBack={() => setStep("pricing")} />
        )}
      </DialogContent>
    </Dialog>
  )
}
