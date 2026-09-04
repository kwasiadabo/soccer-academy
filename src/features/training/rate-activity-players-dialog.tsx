import { useEffect, useState } from "react"
import { Star } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { LoadingState } from "@/design-system/loading-state"
import { EmptyState } from "@/design-system/empty-state"
import { ApiError } from "@/lib/api-client"
import { PlayerPhoto } from "@/features/players/player-photo"
import { useActivityMarks, useUpsertActivityMarks } from "./training-api"

interface RateActivityPlayersDialogProps {
  activityId: string
  activityName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function RateActivityPlayersDialog({
  activityId,
  activityName,
  open,
  onOpenChange,
}: RateActivityPlayersDialogProps) {
  const { data, isLoading } = useActivityMarks(open ? activityId : undefined)
  const upsertMarks = useUpsertActivityMarks(activityId)
  const [ratings, setRatings] = useState<Record<string, string>>({})
  const [remarks, setRemarks] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!data) return
    const nextRatings: Record<string, string> = {}
    const nextRemarks: Record<string, string> = {}
    for (const mark of data.marks) {
      nextRatings[mark.playerId] = String(mark.rating)
      if (mark.remarks) nextRemarks[mark.playerId] = mark.remarks
    }
    setRatings(nextRatings)
    setRemarks(nextRemarks)
  }, [data])

  const onSubmit = async () => {
    setServerError(null)
    setSaved(false)
    const records = Object.entries(ratings)
      .filter(([, value]) => value.trim() !== "")
      .map(([playerId, value]) => ({
        playerId,
        rating: Number(value),
        remarks: remarks[playerId]?.trim() || undefined,
      }))
    if (records.length === 0) {
      setServerError("Enter a rating (1-10) for at least one player")
      return
    }
    try {
      await upsertMarks.mutateAsync(records)
      setSaved(true)
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : "Could not save marks.")
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) {
          setServerError(null)
          setSaved(false)
        }
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="mb-1 flex size-9 shrink-0 items-center justify-center rounded-lg bg-chart-3/10 text-chart-3">
            <Star className="size-4.5" />
          </div>
          <DialogTitle>Rate players — {activityName}</DialogTitle>
          <DialogDescription>Give each player a mark out of 10 for this drill. Leave blank to skip.</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <LoadingState rows={3} />
        ) : !data || data.roster.length === 0 ? (
          <EmptyState title="No roster yet" description="This plan's team/training group has no active players." />
        ) : (
          <div className="max-h-96 space-y-3 overflow-y-auto">
            {data.roster.map((player) => (
              <div key={player.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                <PlayerPhoto playerId={player.id} photoDocumentId={player.photoDocumentId} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {player.firstName} {player.lastName}
                  </p>
                  <Input
                    placeholder="Remarks (optional)"
                    className="mt-1 h-7 text-xs"
                    value={remarks[player.id] ?? ""}
                    onChange={(e) => setRemarks((prev) => ({ ...prev, [player.id]: e.target.value }))}
                  />
                </div>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  placeholder="—"
                  className="w-16 text-center"
                  value={ratings[player.id] ?? ""}
                  onChange={(e) => setRatings((prev) => ({ ...prev, [player.id]: e.target.value }))}
                />
              </div>
            ))}
          </div>
        )}

        {serverError ? <p className="text-sm text-destructive">{serverError}</p> : null}
        {saved ? <p className="text-sm text-success">Marks saved.</p> : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={() => void onSubmit()} disabled={upsertMarks.isPending || isLoading}>
            <Star /> {upsertMarks.isPending ? "Saving…" : "Save marks"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
