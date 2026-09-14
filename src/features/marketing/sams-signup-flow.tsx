import { useEffect, useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { ArrowRight, CheckCircle2, ImageUp, X } from "lucide-react"

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
import { ApiError } from "@/lib/api-client"
import { useSignupAcademy, type SignupAcademyResult } from "./sams-signup-api"

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

// The real "Sign up" flow — creates the academy and its first Admin account
// immediately, unlike SamsSignupDialog (which only records a "request a
// walkthrough" lead for a human to follow up on).
export function SamsSignupFlow({ trigger }: { trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [result, setResult] = useState<SignupAcademyResult | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const [slugTouched, setSlugTouched] = useState(false)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const signup = useSignupAcademy()

  const {
    register,
    handleSubmit,
    setValue,
    reset,
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
    setServerError(null)
    try {
      // The API's DTO whitelist rejects unknown fields — confirmPassword only
      // exists for client-side validation, never sent to the server.
      const { confirmPassword: _confirmPassword, ...input } = values
      const res = await signup.mutateAsync({ ...input, logo: logoFile ?? undefined })
      setResult(res)
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : "Could not create your academy. Please try again.")
    }
  }

  const onOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) {
      setTimeout(() => {
        setResult(null)
        setSlugTouched(false)
        onLogoChange(null)
        reset()
      }, 200)
    }
  }

  const onContinueToSignIn = () => {
    if (!result) return
    // A real page load, not a client-side navigate: AcademyBrandingProvider
    // only ever fetches once per page load, and needs the slug override (set
    // by login-page.tsx's effect) in place before that fetch fires — which
    // React only guarantees if this is a fresh mount of the whole app.
    window.location.href = `/login?academy=${encodeURIComponent(result.academy.slug)}`
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        {result ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-lime-400/15 text-lime-600">
              <CheckCircle2 className="size-6" aria-hidden />
            </span>
            <DialogTitle>{result.academy.name} is live on SAMS</DialogTitle>
            <DialogDescription>
              Your academy's home is <span className="font-medium text-foreground">{result.academy.slug}.sams.app</span>.
              Sign in with the email and password you just chose.
            </DialogDescription>
            <Button onClick={onContinueToSignIn}>
              Continue to sign in
              <ArrowRight className="size-4" aria-hidden />
            </Button>
          </div>
        ) : (
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

              {serverError ? <p className="text-sm text-destructive">{serverError}</p> : null}

              <DialogFooter>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Creating your academy…" : "Create my academy"}
                  <ArrowRight className="size-4" aria-hidden />
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
