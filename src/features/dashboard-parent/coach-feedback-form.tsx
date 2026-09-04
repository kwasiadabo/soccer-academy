import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { MessageSquareHeart } from "lucide-react"

import { Button } from "@/components/ui/button"
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
import { RatingInput } from "@/components/ui/rating-input"
import { ApiError } from "@/lib/api-client"
import { useChildCoaches, useSubmitCoachFeedback } from "./parent-portal-api"

const FEEDBACK_CRITERIA = ["Communication", "Punctuality", "Player development"]

const schema = z.object({
  coachId: z.string().min(1, "Select a coach"),
  comments: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

export function CoachFeedbackDialog({ playerId }: { playerId: string }) {
  const { data: coaches } = useChildCoaches(playerId)
  const submitFeedback = useSubmitCoachFeedback(playerId)
  const [open, setOpen] = useState(false)
  const [overallRating, setOverallRating] = useState<number | undefined>()
  const [criteriaRatings, setCriteriaRatings] = useState<Record<string, number>>({})
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const onSubmit = async (values: FormValues) => {
    setServerError(null)
    if (!overallRating) {
      setServerError("Give an overall rating")
      return
    }
    try {
      await submitFeedback.mutateAsync({
        coachId: values.coachId,
        overallRating,
        comments: values.comments || undefined,
        criteria: Object.entries(criteriaRatings).map(([criterionName, rating]) => ({ criterionName, rating })),
      })
      reset()
      setOverallRating(undefined)
      setCriteriaRatings({})
      setOpen(false)
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : "Could not submit feedback.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" disabled={!coaches?.length}>
          <MessageSquareHeart /> Give feedback
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Coach feedback</DialogTitle>
          <DialogDescription>Your feedback helps the academy support its coaching staff.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="space-y-1.5">
            <Label>Coach</Label>
            <Select defaultValue="" {...register("coachId")}>
              <option value="" disabled>
                Select a coach
              </option>
              {coaches?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.firstName} {c.lastName}
                </option>
              ))}
            </Select>
            {errors.coachId ? <p className="text-xs text-destructive">{errors.coachId.message}</p> : null}
          </div>

          <div className="flex items-center justify-between">
            <Label>Overall rating</Label>
            <RatingInput scale="SCALE_1_5" value={overallRating} onChange={setOverallRating} />
          </div>

          {FEEDBACK_CRITERIA.map((criterion) => (
            <div key={criterion} className="flex items-center justify-between">
              <span className="text-sm">{criterion}</span>
              <RatingInput
                scale="SCALE_1_5"
                value={criteriaRatings[criterion]}
                onChange={(value) => setCriteriaRatings((prev) => ({ ...prev, [criterion]: value }))}
              />
            </div>
          ))}

          <div className="space-y-1.5">
            <Label>Comments</Label>
            <Textarea rows={3} {...register("comments")} />
          </div>

          {serverError ? <p className="text-sm text-destructive">{serverError}</p> : null}
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Submitting…" : "Submit feedback"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
