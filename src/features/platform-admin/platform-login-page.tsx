import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Navigate, useLocation, useNavigate } from "react-router-dom"
import type { Location } from "react-router-dom"
import { motion } from "framer-motion"
import { Mail, Lock, ShieldCheck } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SamsMark } from "@/design-system/sams-mark"
import { usePlatformAuth } from "@/app/platform-auth-context"
import { PlatformApiError } from "@/lib/platform-api-client"

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
})

type LoginFormValues = z.infer<typeof loginSchema>

export function PlatformLoginPage() {
  const { admin, login } = usePlatformAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: Location } | null)?.from
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) })

  if (admin) {
    return <Navigate to={from ? `${from.pathname}${from.search}${from.hash}` : "/platform"} replace />
  }

  const onSubmit = async (values: LoginFormValues) => {
    setServerError(null)
    try {
      await login(values.email, values.password)
      navigate(from ? `${from.pathname}${from.search}${from.hash}` : "/platform", { replace: true })
    } catch (err) {
      if (err instanceof PlatformApiError && err.status === 429) {
        setServerError("Too many sign-in attempts. Please wait a minute and try again.")
      } else {
        setServerError(err instanceof PlatformApiError ? err.message : "Unable to sign in. Please try again.")
      }
    }
  }

  return (
    <div className="dark flex min-h-dvh items-center justify-center bg-[#0B0F0A] p-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#0E1310] p-8 shadow-2xl"
      >
        <div className="flex items-center gap-2.5">
          <SamsMark className="size-10" />
          <span className="text-base font-bold tracking-wide text-white">SAMS</span>
        </div>

        <div className="mt-6 flex items-center gap-2 text-lime-400">
          <ShieldCheck className="size-4" aria-hidden />
          <p className="text-xs font-bold tracking-[0.2em] uppercase">Platform Console</p>
        </div>
        <p className="mt-2 text-sm text-white/60">
          Operator access — onboard, suspend, and monitor every academy on SAMS.
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
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
            {errors.email ? <p className="text-xs text-destructive">{errors.email.message}</p> : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                aria-invalid={!!errors.password}
                className="pl-9"
                {...register("password")}
              />
            </div>
            {errors.password ? <p className="text-xs text-destructive">{errors.password.message}</p> : null}
          </div>

          {serverError ? (
            <p role="alert" aria-live="polite" className="text-sm text-destructive">
              {serverError}
            </p>
          ) : null}

          <Button type="submit" className="w-full bg-lime-400 text-[#0B0F0A] hover:bg-lime-300" disabled={isSubmitting}>
            {isSubmitting ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </motion.div>
    </div>
  )
}
