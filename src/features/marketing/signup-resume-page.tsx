import { useEffect, useRef, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { XCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { LoadingState } from "@/design-system/loading-state"
import { SamsMark } from "@/design-system/sams-mark"
import { ApiError } from "@/lib/api-client"
import { useResumeSignupPayment } from "./sams-signup-api"

type Outcome = { status: "resuming" } | { status: "error"; message: string }

// Where the resume/reminder/deletion-warning emails link to — re-initializes
// a fresh Paystack checkout for a PendingAcademySignup that's still sitting
// unpaid, then follows it straight through, same as a first-time signup.
export function SignupResumePage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get("token")
  const [outcome, setOutcome] = useState<Outcome>({ status: "resuming" })
  const resumePayment = useResumeSignupPayment()
  const attempted = useRef(false)

  useEffect(() => {
    if (attempted.current) return
    attempted.current = true

    const run = async () => {
      if (!token) {
        setOutcome({ status: "error", message: "This link is missing its signup token." })
        return
      }
      try {
        const callbackUrl = `${window.location.origin}/signup/callback`
        const result = await resumePayment.mutateAsync({ resumeToken: token, callbackUrl })
        window.location.href = result.authorizationUrl
      } catch (err) {
        setOutcome({
          status: "error",
          message:
            err instanceof ApiError ? err.message : "This signup link has expired or already been completed.",
        })
      }
    }
    void run()
  }, [token, resumePayment])

  return (
    <div className="flex min-h-dvh items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-8 text-center shadow-lg sm:p-10">
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <SamsMark className="size-9" />
          <span className="text-sm font-semibold tracking-wide text-foreground">SAMS</span>
        </div>

        {outcome.status === "resuming" ? (
          <div className="space-y-4">
            <LoadingState rows={2} />
            <p className="text-sm text-muted-foreground">Taking you back to payment…</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <span className="flex size-12 items-center justify-center rounded-full bg-destructive/15 text-destructive">
              <XCircle className="size-6" aria-hidden />
            </span>
            <h1 className="text-lg font-semibold text-foreground">Couldn't resume signup</h1>
            <p className="text-sm text-muted-foreground">{outcome.message}</p>
            <Button variant="outline" onClick={() => (window.location.href = "/signup")} className="mt-2">
              Start a new signup
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
