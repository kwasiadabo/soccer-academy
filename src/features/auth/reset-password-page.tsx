import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { motion } from "framer-motion"
import { Lock, Eye, EyeOff, CheckCircle2, ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AcademyLogo } from "@/design-system/academy-logo"
import { api, ApiError } from "@/lib/api-client"

const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Password must be at least 8 characters"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  })

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get("token")
  const navigate = useNavigate()
  const [serverError, setServerError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordValues>({ resolver: zodResolver(resetPasswordSchema) })

  const onSubmit = async (values: ResetPasswordValues) => {
    if (!token) return
    setServerError(null)
    try {
      await api.post<{ success: true }>("/auth/reset-password", { token, password: values.password })
      setSubmitted(true)
    } catch (err) {
      setServerError(
        err instanceof ApiError ? err.message : "Unable to reset your password. Please try again.",
      )
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-muted/40 p-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="w-full max-w-sm rounded-3xl border border-border bg-card p-8 shadow-lg sm:p-10"
      >
        <div className="mb-6 flex items-center gap-2.5">
          <AcademyLogo className="size-9" chip />
          <span className="text-sm font-semibold tracking-wide text-foreground">Kapikids Soccer Academy</span>
        </div>

        {!token ? (
          <div className="space-y-4">
            <div className="space-y-1">
              <h1 className="text-xl font-semibold text-foreground">Invalid reset link</h1>
              <p className="text-sm text-muted-foreground">
                This password reset link is missing or malformed. Request a new one to continue.
              </p>
            </div>
            <Link
              to="/forgot-password"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-accent-foreground hover:underline"
            >
              <ArrowLeft className="size-4" aria-hidden />
              Request a new link
            </Link>
          </div>
        ) : submitted ? (
          <div className="space-y-4">
            <div className="flex size-10 items-center justify-center rounded-full bg-success/15 text-success">
              <CheckCircle2 className="size-5" aria-hidden />
            </div>
            <div className="space-y-1">
              <h1 className="text-xl font-semibold text-foreground">Password updated</h1>
              <p className="text-sm text-muted-foreground">
                Your password has been reset. You can now sign in with your new password.
              </p>
            </div>
            <Button className="w-full" onClick={() => navigate("/login", { replace: true })}>
              Back to sign in
            </Button>
          </div>
        ) : (
          <>
            <div className="mb-6 space-y-1">
              <h1 className="text-xl font-semibold text-foreground">Reset your password</h1>
              <p className="text-sm text-muted-foreground">Choose a new password for your account.</p>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="password">New password</Label>
                <div className="relative">
                  <Lock
                    aria-hidden
                    className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    aria-invalid={!!errors.password}
                    className="pl-9 pr-9"
                    {...register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                    className="absolute right-2.5 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    {showPassword ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
                  </button>
                </div>
                {errors.password ? (
                  <p className="text-xs text-destructive">{errors.password.message}</p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">Confirm new password</Label>
                <div className="relative">
                  <Lock
                    aria-hidden
                    className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    aria-invalid={!!errors.confirmPassword}
                    className="pl-9"
                    {...register("confirmPassword")}
                  />
                </div>
                {errors.confirmPassword ? (
                  <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
                ) : null}
              </div>

              {serverError ? (
                <p role="alert" aria-live="polite" className="text-sm text-destructive">
                  {serverError}
                </p>
              ) : null}

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Resetting…" : "Reset password"}
              </Button>
            </form>
          </>
        )}
      </motion.div>
    </div>
  )
}
