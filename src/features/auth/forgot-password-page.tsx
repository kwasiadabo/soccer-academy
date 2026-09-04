import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Link } from "react-router-dom"
import { motion } from "framer-motion"
import { ArrowLeft, Mail, CheckCircle2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AcademyLogo } from "@/design-system/academy-logo"
import { api } from "@/lib/api-client"

const forgotPasswordSchema = z.object({
  email: z.string().email("Enter a valid email address"),
})

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>

export function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordValues>({ resolver: zodResolver(forgotPasswordSchema) })

  const onSubmit = async (values: ForgotPasswordValues) => {
    await api.post<{ message: string }>("/auth/forgot-password", { email: values.email })
    setSubmitted(true)
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

        {submitted ? (
          <div className="space-y-4">
            <div className="flex size-10 items-center justify-center rounded-full bg-success/15 text-success">
              <CheckCircle2 className="size-5" aria-hidden />
            </div>
            <div className="space-y-1">
              <h1 className="text-xl font-semibold text-foreground">Check your email</h1>
              <p className="text-sm text-muted-foreground">
                If an account exists for that email, we&apos;ve sent a link to reset your password.
              </p>
            </div>
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-accent-foreground hover:underline"
            >
              <ArrowLeft className="size-4" aria-hidden />
              Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-6 space-y-1">
              <h1 className="text-xl font-semibold text-foreground">Forgot password?</h1>
              <p className="text-sm text-muted-foreground">
                Enter your email and we&apos;ll send you a link to reset your password.
              </p>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail
                    aria-hidden
                    className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    aria-invalid={!!errors.email}
                    className="pl-9"
                    {...register("email")}
                  />
                </div>
                {errors.email ? (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
                ) : null}
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Sending…" : "Send reset link"}
              </Button>
            </form>

            <Link
              to="/login"
              className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-4" aria-hidden />
              Back to sign in
            </Link>
          </>
        )}
      </motion.div>
    </div>
  )
}
