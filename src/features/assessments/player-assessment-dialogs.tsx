import { useState } from "react"
import { MessageSquarePlus } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { ApiError } from "@/lib/api-client"
import { useCreateRemark } from "./assessments-api"

export interface AssessablePlayer {
  id: string
  firstName: string
  lastName: string
}

export function RemarkDialog({ player, onClose }: { player: AssessablePlayer; onClose: () => void }) {
  const createRemark = useCreateRemark(player.id)
  const [remark, setRemark] = useState("")

  const onSubmit = async () => {
    if (!remark.trim()) {
      toast.error("Enter a note")
      return
    }
    try {
      await createRemark.mutateAsync({ remark })
      toast.success("Note saved.")
      onClose()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not save note.")
    }
  }

  return (
    <DialogContent>
      <DialogHeader>
        <div className="mb-1 flex size-9 shrink-0 items-center justify-center rounded-lg bg-chart-3/10 text-chart-3">
          <MessageSquarePlus className="size-4.5" />
        </div>
        <DialogTitle>
          Add a note for {player.firstName} {player.lastName}
        </DialogTitle>
        <DialogDescription>A quick, informal remark — not tied to any assessment or session.</DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <Textarea rows={3} placeholder="e.g. Showed great leadership during drills today…" value={remark} onChange={(e) => setRemark(e.target.value)} />
        <DialogFooter>
          <Button onClick={() => void onSubmit()} disabled={createRemark.isPending}>
            {createRemark.isPending ? "Saving…" : "Save note"}
          </Button>
        </DialogFooter>
      </div>
    </DialogContent>
  )
}
