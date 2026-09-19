import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Pencil, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { EmptyState } from "@/design-system/empty-state"
import { LoadingState } from "@/design-system/loading-state"
import { ErrorState } from "@/design-system/error-state"
import { ApiError } from "@/lib/api-client"
import {
  useTrainingSchedule,
  useAddTrainingScheduleSlot,
  useUpdateTrainingScheduleSlot,
  useRemoveTrainingScheduleSlot,
  WEEKDAY_NAMES,
  type TrainingScheduleSlot,
} from "@/features/training/training-api"

const schema = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6),
    startTime: z.string().min(1, "Start time is required"),
    endTime: z.string().min(1, "End time is required"),
    location: z.string().optional(),
  })
  .refine((v) => v.endTime > v.startTime, {
    message: "End time must be after the start time",
    path: ["endTime"],
  })

type FormValues = z.infer<typeof schema>

function SlotFormDialog({
  slot,
  open,
  onOpenChange,
}: {
  slot?: TrainingScheduleSlot
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const addSlot = useAddTrainingScheduleSlot()
  const updateSlot = useUpdateTrainingScheduleSlot()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      dayOfWeek: slot?.dayOfWeek ?? 6,
      startTime: slot?.startTime ?? "08:00",
      endTime: slot?.endTime ?? "10:00",
      location: slot?.location ?? "",
    },
  })

  const onSubmit = async (values: FormValues) => {
    try {
      const input = { ...values, location: values.location?.trim() || undefined }
      if (slot) {
        await updateSlot.mutateAsync({ id: slot.id, ...input })
      } else {
        await addSlot.mutateAsync(input)
      }
      reset()
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not save this session.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{slot ? "Edit training session" : "Add a weekly training session"}</DialogTitle>
          <DialogDescription>
            Every active team gets one of these sessions auto-scheduled each week.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="slot-day">Day of week</Label>
            <Select id="slot-day" {...register("dayOfWeek", { valueAsNumber: true })}>
              {WEEKDAY_NAMES.map((weekdayName, value) => (
                <option key={value} value={value}>
                  {weekdayName}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="slot-start">Start time</Label>
              <Input id="slot-start" type="time" {...register("startTime")} />
              {errors.startTime ? <p className="text-xs text-destructive">{errors.startTime.message}</p> : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="slot-end">End time</Label>
              <Input id="slot-end" type="time" {...register("endTime")} />
              {errors.endTime ? <p className="text-xs text-destructive">{errors.endTime.message}</p> : null}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="slot-location">Location (optional)</Label>
            <Input id="slot-location" placeholder="e.g. Achimota Astro Pitch" {...register("location")} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : slot ? "Save changes" : "Add session"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function TrainingScheduleSection() {
  const { data: slots, isLoading, isError, refetch } = useTrainingSchedule()
  const removeSlot = useRemoveTrainingScheduleSlot()
  const [addOpen, setAddOpen] = useState(false)
  const [editingSlot, setEditingSlot] = useState<TrainingScheduleSlot | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)

  const onRemove = async (slot: TrainingScheduleSlot) => {
    if (!window.confirm(`Remove the ${WEEKDAY_NAMES[slot.dayOfWeek]} ${slot.startTime}–${slot.endTime} session?`)) {
      return
    }
    setRemovingId(slot.id)
    try {
      await removeSlot.mutateAsync(slot.id)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not remove this session.")
    } finally {
      setRemovingId(null)
    }
  }

  const sorted = [...(slots ?? [])].sort(
    (a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime),
  )

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
        <div>
          <CardTitle>Weekly training schedule</CardTitle>
          <CardDescription>
            The recurring fixture(s) every team's sessions auto-schedule from — an academy can train more than
            once a week.
          </CardDescription>
        </div>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus /> Add session
        </Button>
        <SlotFormDialog open={addOpen} onOpenChange={setAddOpen} />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <LoadingState rows={2} />
        ) : isError ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : sorted.length === 0 ? (
          <EmptyState
            title="No weekly sessions configured"
            description='Add at least one, e.g. "every Saturday, 08:00–10:00," to start auto-scheduling training.'
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Day</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((slot) => (
                <TableRow key={slot.id}>
                  <TableCell className="font-medium">{WEEKDAY_NAMES[slot.dayOfWeek]}</TableCell>
                  <TableCell>
                    {slot.startTime}–{slot.endTime}
                  </TableCell>
                  <TableCell>{slot.location ?? "—"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" aria-label="Edit" onClick={() => setEditingSlot(slot)}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Remove"
                        disabled={removingId === slot.id}
                        onClick={() => void onRemove(slot)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {editingSlot ? (
        <SlotFormDialog
          slot={editingSlot}
          open={!!editingSlot}
          onOpenChange={(open) => !open && setEditingSlot(null)}
        />
      ) : null}
    </Card>
  )
}
