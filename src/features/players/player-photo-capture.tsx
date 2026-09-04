import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { AnimatePresence, motion } from "framer-motion"
import { Camera, ImageUp, UserRound, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface PlayerPhotoCaptureProps {
  value: File | null
  onChange: (file: File | null) => void
}

export function PlayerPhotoCapture({ value, onChange }: PlayerPhotoCaptureProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  useEffect(() => {
    if (!value) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(value)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [value])

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (file) onChange(file)
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div
        className="relative shrink-0"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="relative flex size-44 items-center justify-center overflow-hidden rounded-2xl border-4 border-background bg-muted shadow-lg ring-1 ring-border">
          {previewUrl ? (
            <img src={previewUrl} alt="Player" className="absolute inset-0 size-full object-cover" />
          ) : (
            <UserRound className="size-16 text-muted-foreground" strokeWidth={1.25} />
          )}
        </div>
        {createPortal(
          <AnimatePresence>
            {isHovered && previewUrl ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: -6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -6 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="pointer-events-none fixed top-20 right-4 z-50 w-80 origin-top-right overflow-hidden rounded-xl border border-border bg-popover shadow-2xl"
              >
                <img
                  src={previewUrl}
                  alt="Player, enlarged"
                  className="aspect-square w-full bg-muted object-contain"
                />
              </motion.div>
            ) : null}
          </AnimatePresence>,
          document.body,
        )}
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
            <ImageUp /> Upload photo
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setCameraOpen(true)}>
            <Camera /> Use camera
          </Button>
          {value ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
              <X /> Remove
            </Button>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">Optional — JPG, PNG or WEBP. Can be added later too.</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={handleFileChange}
      />
      <CameraCaptureDialog
        open={cameraOpen}
        onOpenChange={setCameraOpen}
        onCapture={(file) => {
          onChange(file)
          setCameraOpen(false)
        }}
      />
    </div>
  )
}

interface CameraCaptureDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCapture: (file: File) => void
}

function CameraCaptureDialog({ open, onOpenChange, onCapture }: CameraCaptureDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setError(null)
    setReady(false)

    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: "user" } })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
        setReady(true)
      })
      .catch(() => {
        if (!cancelled) setError("Could not access the camera. Check permissions and try again.")
      })

    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }, [open])

  const capture = () => {
    const video = videoRef.current
    if (!video || !video.videoWidth) return
    const canvas = document.createElement("canvas")
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    canvas.toBlob(
      (blob) => {
        if (blob) onCapture(new File([blob], `player-photo-${Date.now()}.jpg`, { type: "image/jpeg" }))
      },
      "image/jpeg",
      0.9,
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Take a photo</DialogTitle>
        </DialogHeader>
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="aspect-square w-full rounded-lg bg-black object-cover"
          />
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={!ready || !!error} onClick={capture}>
            <Camera /> Capture
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
