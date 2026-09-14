import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { CheckCircle2, ArrowRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
import { useSubmitPlatformLead } from "./sams-lead-api"

const leadSchema = z.object({
  academyName: z.string().min(2, "Required"),
  trainingLocation: z.string().min(2, "Required"),
  contactName: z.string().min(2, "Required"),
  contactEmail: z.string().email("Enter a valid email"),
  contactPhone: z.string().min(6, "Required"),
  message: z.string().optional(),
})
type LeadFormValues = z.infer<typeof leadSchema>

// There's no self-serve academy signup yet (onboarding a new academy onto
// SAMS is a platform-operator action) — this is the real "Sign up" behavior:
// a lead-capture form a real person follows up on, not a fake instant-signup flow.
export function SamsSignupDialog({ trigger }: { trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const submitLead = useSubmitPlatformLead()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LeadFormValues>({ resolver: zodResolver(leadSchema) })

  const onSubmit = async (values: LeadFormValues) => {
    setServerError(null)
    try {
      await submitLead.mutateAsync(values)
      setSubmitted(true)
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.")
    }
  }

  const onOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) {
      setTimeout(() => {
        setSubmitted(false)
        reset()
      }, 200)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        {submitted ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-lime-400/15 text-lime-600">
              <CheckCircle2 className="size-6" aria-hidden />
            </span>
            <DialogTitle>Thanks — you're on our radar.</DialogTitle>
            <DialogDescription>
              We'll reach out within 1–2 business days to set up your academy's walkthrough.
            </DialogDescription>
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Bring your academy onto SAMS</DialogTitle>
              <DialogDescription>
                Tell us about your academy and we'll set up a walkthrough with your own coaches and receptionist.
              </DialogDescription>
            </DialogHeader>
            <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="academyName">Academy name</Label>
                  <Input id="academyName" {...register("academyName")} />
                  {errors.academyName ? <p className="text-xs text-destructive">{errors.academyName.message}</p> : null}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="trainingLocation">Training location</Label>
                  <Input id="trainingLocation" placeholder="e.g. Achimota, Accra" {...register("trainingLocation")} />
                  {errors.trainingLocation ? (
                    <p className="text-xs text-destructive">{errors.trainingLocation.message}</p>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="contactName">Your name</Label>
                  <Input id="contactName" {...register("contactName")} />
                  {errors.contactName ? <p className="text-xs text-destructive">{errors.contactName.message}</p> : null}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="contactPhone">Phone</Label>
                  <Input id="contactPhone" type="tel" {...register("contactPhone")} />
                  {errors.contactPhone ? <p className="text-xs text-destructive">{errors.contactPhone.message}</p> : null}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="contactEmail">Email</Label>
                <Input id="contactEmail" type="email" {...register("contactEmail")} />
                {errors.contactEmail ? <p className="text-xs text-destructive">{errors.contactEmail.message}</p> : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="message">Anything else we should know? (optional)</Label>
                <Textarea id="message" rows={3} {...register("message")} />
              </div>

              {serverError ? <p className="text-sm text-destructive">{serverError}</p> : null}

              <DialogFooter>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Sending…" : "Request a walkthrough"}
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
