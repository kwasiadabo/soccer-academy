import { useEffect, useRef, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { ArrowRight, CheckCircle2, XCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { LoadingState } from "@/design-system/loading-state"
import { SamsMark } from "@/design-system/sams-mark"
import { ApiError } from "@/lib/api-client"
import { useVerifyAndCreateSignup, type SignupAcademyResult } from "./sams-signup-api"
import { clearPendingSignup, loadPendingSignup, pendingSignupLogoFile } from "./pending-signup"

type Outcome =
  | { status: "verifying" }
  | { status: "success"; result: SignupAcademyResult }
  | { status: "error"; message: string }

// Where Paystack redirects back to after the signup fee is charged — the
// browser left the app entirely for checkout, so this page recovers the
// academy/admin details from sessionStorage (see pending-signup.ts), then
// asks the backend to verify the payment and, only then, create the account.
export function SignupPaymentCallbackPage() {
  const [searchParams] = useSearchParams()
  const reference = searchParams.get("reference")
  const [outcome, setOutcome] = useState<Outcome>({ status: "verifying" })
  const verifyAndCreate = useVerifyAndCreateSignup()
  const attempted = useRef(false)

  useEffect(() => {
    if (attempted.current) return
    attempted.current = true

    const run = async () => {
      const pending = loadPendingSignup()
      if (!reference || !pending) {
        setOutcome({
          status: "error",
          message: "We couldn't find your signup details. Please start over.",
        })
        return
      }
      try {
        const logo = await pendingSignupLogoFile(pending)
        const { logoDataUrl: _logoDataUrl, logoFileName: _logoFileName, logoMimeType: _logoMimeType, ...fields } =
          pending
        const result = await verifyAndCreate.mutateAsync({ ...fields, logo, reference })
        clearPendingSignup()
        setOutcome({ status: "success", result })
      } catch (err) {
        setOutcome({
          status: "error",
          message: err instanceof ApiError ? err.message : "Payment could not be verified. Please try again.",
        })
      }
    }
    void run()
  }, [reference, verifyAndCreate])

  const onContinueToSignIn = () => {
    if (outcome.status !== "success") return
    window.location.href = `/login?academy=${encodeURIComponent(outcome.result.academy.slug)}`
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-8 text-center shadow-lg sm:p-10">
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <SamsMark className="size-9" />
          <span className="text-sm font-semibold tracking-wide text-foreground">SAMS</span>
        </div>

        {outcome.status === "verifying" ? (
          <div className="space-y-4">
            <LoadingState rows={2} />
            <p className="text-sm text-muted-foreground">Confirming your payment…</p>
          </div>
        ) : outcome.status === "success" ? (
          <div className="flex flex-col items-center gap-3">
            <span className="flex size-12 items-center justify-center rounded-full bg-lime-400/15 text-lime-600">
              <CheckCircle2 className="size-6" aria-hidden />
            </span>
            <h1 className="text-lg font-semibold text-foreground">{outcome.result.academy.name} is live on SAMS</h1>
            <p className="text-sm text-muted-foreground">
              Your academy's home is{" "}
              <span className="font-medium text-foreground">{outcome.result.academy.slug}.sams.app</span>. Sign in
              with the email and password you just chose.
            </p>
            <Button onClick={onContinueToSignIn} className="mt-2">
              Continue to sign in
              <ArrowRight className="size-4" aria-hidden />
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <span className="flex size-12 items-center justify-center rounded-full bg-destructive/15 text-destructive">
              <XCircle className="size-6" aria-hidden />
            </span>
            <h1 className="text-lg font-semibold text-foreground">Something went wrong</h1>
            <p className="text-sm text-muted-foreground">{outcome.message}</p>
            <Button variant="outline" onClick={() => (window.location.href = "/")} className="mt-2">
              Back to SAMS
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
