import { useRef, useState } from "react"
import { ImagePlus, Images } from "lucide-react"

import { DashboardLayout } from "@/app/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { EmptyState } from "@/design-system/empty-state"
import { LoadingState } from "@/design-system/loading-state"
import { ErrorState } from "@/design-system/error-state"
import { formatDate } from "@/lib/date"
import { useStaffNavItems } from "@/features/issues/staff-issues-page"
import { useGalleryFeed, useReplaceGalleryPhotos, type GalleryPhotoContext } from "./gallery-api"

const SECTIONS: { context: GalleryPhotoContext; title: string; description: string }[] = [
  {
    context: "SATURDAY_TRAINING",
    title: "Saturday Training Photos",
    description: "Shown in the marketing site's gallery. Uploading a new batch replaces all photos below.",
  },
  {
    context: "MATCH",
    title: "Match Day Photos",
    description: "Shown in the marketing site's gallery. Uploading a new batch replaces all photos below.",
  },
]

function GallerySection({ context, title, description }: { context: GalleryPhotoContext; title: string; description: string }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const { data, isLoading, isError, refetch } = useGalleryFeed()
  const replacePhotos = useReplaceGalleryPhotos(context)
  const [pendingFiles, setPendingFiles] = useState<File[] | null>(null)
  const [sessionDate, setSessionDate] = useState("")
  const [details, setDetails] = useState("")

  const photos = (data ?? []).filter((p) => p.context === context)
  const current = photos[0]

  const onPick = (files: FileList | null) => {
    if (!files || files.length === 0) return
    setPendingFiles(Array.from(files))
  }

  const onCancel = () => {
    setPendingFiles(null)
    setSessionDate("")
    setDetails("")
  }

  const canConfirm = !!pendingFiles && sessionDate.trim() !== "" && details.trim() !== ""

  const onConfirmReplace = () => {
    if (!canConfirm || !pendingFiles) return
    replacePhotos.mutate(
      { files: pendingFiles, sessionDate, details },
      { onSuccess: onCancel },
    )
  }

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="sr-only"
          onChange={(e) => {
            onPick(e.target.files)
            e.target.value = ""
          }}
        />
        <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()}>
          <ImagePlus /> Choose photos
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {pendingFiles ? (
          <div className="space-y-3 rounded-lg border border-warning/30 bg-warning/5 p-4">
            <p className="text-sm">
              Replace all {photos.length} current photo{photos.length === 1 ? "" : "s"} with{" "}
              <strong>{pendingFiles.length}</strong> new photo{pendingFiles.length === 1 ? "" : "s"}? This can't be undone.
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor={`${context}-session-date`}>Session date</Label>
                <Input
                  id={`${context}-session-date`}
                  type="date"
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`${context}-details`}>Session details</Label>
                <Input
                  id={`${context}-details`}
                  placeholder='e.g. "vs Rangers FC — Home win 3-1"'
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={onCancel} disabled={replacePhotos.isPending}>
                Cancel
              </Button>
              <Button size="sm" onClick={onConfirmReplace} disabled={!canConfirm || replacePhotos.isPending}>
                {replacePhotos.isPending ? "Uploading…" : "Confirm replace"}
              </Button>
            </div>
          </div>
        ) : null}

        {isLoading ? (
          <LoadingState rows={2} />
        ) : isError ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : photos.length === 0 ? (
          <EmptyState icon={Images} title="No photos yet" description="Choose photos above to publish this section." />
        ) : (
          <>
            {current ? (
              <p className="text-sm text-muted-foreground">
                {formatDate(current.sessionDate)} · {current.details}
              </p>
            ) : null}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {photos.map((photo) => (
                <div key={photo.id} className="aspect-square overflow-hidden rounded-lg border border-border bg-muted">
                  <img src={photo.url} alt="" className="size-full object-cover" />
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

export function StaffGalleryPage() {
  const navItems = useStaffNavItems()

  return (
    <DashboardLayout title="Gallery" navItems={navItems}>
      <div className="space-y-6">
        {SECTIONS.map((section) => (
          <GallerySection key={section.context} {...section} />
        ))}
      </div>
    </DashboardLayout>
  )
}
