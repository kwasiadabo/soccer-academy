import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { CheckCircle2, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
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
import { useSubmitInquiry } from "./inquiries-api"

const inquirySchema = z.object({
  childFirstName: z.string().min(1, "Required"),
  childLastName: z.string().min(1, "Required"),
  childDateOfBirth: z.string().optional(),
  guardianName: z.string().min(1, "Required"),
  guardianPhone: z.string().min(1, "Required"),
  guardianEmail: z.string().email("Enter a valid email").optional().or(z.literal("")),
  preferredProgram: z.string().optional(),
  message: z.string().optional(),
})
type InquiryFormValues = z.infer<typeof inquirySchema>

export function JoinUsDialog({ trigger }: { trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const submitInquiry = useSubmitInquiry()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InquiryFormValues>({ resolver: zodResolver(inquirySchema) })

  const onSubmit = async (values: InquiryFormValues) => {
    setServerError(null)
    try {
      await submitInquiry.mutateAsync({
        ...values,
        guardianEmail: values.guardianEmail || undefined,
        childDateOfBirth: values.childDateOfBirth || undefined,
      })
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
            <span className="flex size-12 items-center justify-center rounded-full bg-primary/15 text-accent-foreground">
              <CheckCircle2 className="size-6" aria-hidden />
            </span>
            <DialogTitle>Thanks for reaching out!</DialogTitle>
            <DialogDescription>
              We've received your details and will contact you within 1–2 business days to get your child started.
            </DialogDescription>
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Join Kapikids Soccer Academy</DialogTitle>
              <DialogDescription>Tell us about your child and we'll be in touch to get started.</DialogDescription>
            </DialogHeader>
            <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="childFirstName">Child's first name</Label>
                  <Input id="childFirstName" {...register("childFirstName")} />
                  {errors.childFirstName ? (
                    <p className="text-xs text-destructive">{errors.childFirstName.message}</p>
                  ) : null}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="childLastName">Child's last name</Label>
                  <Input id="childLastName" {...register("childLastName")} />
                  {errors.childLastName ? (
                    <p className="text-xs text-destructive">{errors.childLastName.message}</p>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="childDateOfBirth">Child's date of birth</Label>
                  <Input id="childDateOfBirth" type="date" {...register("childDateOfBirth")} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="preferredProgram">Preferred program</Label>
                  <Select id="preferredProgram" defaultValue="" {...register("preferredProgram")}>
                    <option value="">Not sure yet</option>
                    <option value="Little Kickers">Little Kickers (Ages 3–5)</option>
                    <option value="Junior Academy">Junior Academy (Ages 6–9)</option>
                    <option value="Elite Development">Elite Development (Ages 10–13)</option>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="guardianName">Your name</Label>
                  <Input id="guardianName" {...register("guardianName")} />
                  {errors.guardianName ? (
                    <p className="text-xs text-destructive">{errors.guardianName.message}</p>
                  ) : null}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="guardianPhone">Phone number</Label>
                  <Input id="guardianPhone" type="tel" {...register("guardianPhone")} />
                  {errors.guardianPhone ? (
                    <p className="text-xs text-destructive">{errors.guardianPhone.message}</p>
                  ) : null}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="guardianEmail">Email (optional)</Label>
                <Input id="guardianEmail" type="email" {...register("guardianEmail")} />
                {errors.guardianEmail ? (
                  <p className="text-xs text-destructive">{errors.guardianEmail.message}</p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="message">Anything else we should know? (optional)</Label>
                <Textarea id="message" rows={3} {...register("message")} />
              </div>

              {serverError ? <p className="text-sm text-destructive">{serverError}</p> : null}

              <DialogFooter>
                <Button type="submit" disabled={isSubmitting}>
                  <Sparkles className="size-4" aria-hidden />
                  {isSubmitting ? "Sending…" : "Submit"}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
