import { useEffect, useRef, useState } from "react"
import { ImageUp, Save } from "lucide-react"

import { DashboardLayout } from "@/app/dashboard-layout"
import { useAcademyBranding } from "@/app/academy-branding-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { LoadingState } from "@/design-system/loading-state"
import { ErrorState } from "@/design-system/error-state"
import { ApiError } from "@/lib/api-client"
import { useAcademySettings, useUpdateAcademySettings } from "./academy-settings-api"
import { useTrainingSchedule, useUpdateTrainingSchedule, WEEKDAY_NAMES } from "@/features/training/training-api"

function changedOrUndefined(value: string, original: string | undefined): string | undefined {
  const trimmed = value.trim()
  return trimmed !== "" && trimmed !== (original ?? "") ? trimmed : undefined
}

function changedNumberOrUndefined(value: number, original: number | undefined): number | undefined {
  return original !== undefined && value !== original ? value : undefined
}

export function AcademySettingsPage() {
  const { data: settings, isLoading, isError, refetch } = useAcademySettings()
  const updateSettings = useUpdateAcademySettings()
  const { data: schedule, isLoading: scheduleLoading, isError: scheduleIsError, refetch: refetchSchedule } =
    useTrainingSchedule()
  const updateSchedule = useUpdateTrainingSchedule()
  const { refresh: refreshBranding } = useAcademyBranding()

  const [name, setName] = useState("")
  const [brandName, setBrandName] = useState("")
  const [contactEmail, setContactEmail] = useState("")
  const [contactPhone, setContactPhone] = useState("")
  const [trainingLocation, setTrainingLocation] = useState("")
  const [trainingDayOfWeek, setTrainingDayOfWeek] = useState(6)
  const [trainingStartTime, setTrainingStartTime] = useState("08:00")
  const [trainingEndTime, setTrainingEndTime] = useState("10:00")
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (settings) {
      setName(settings.name)
      setBrandName(settings.brandName)
      setContactEmail(settings.contactEmail ?? "")
      setContactPhone(settings.contactPhone ?? "")
      setTrainingLocation(settings.trainingLocation ?? "")
    }
  }, [settings])

  useEffect(() => {
    if (schedule) {
      setTrainingDayOfWeek(schedule.dayOfWeek)
      setTrainingStartTime(schedule.startTime)
      setTrainingEndTime(schedule.endTime)
    }
  }, [schedule])

  useEffect(() => {
    return () => {
      if (logoPreview) URL.revokeObjectURL(logoPreview)
    }
  }, [logoPreview])

  const onLogoChange = (file: File | null) => {
    if (logoPreview) URL.revokeObjectURL(logoPreview)
    setLogoFile(file)
    setLogoPreview(file ? URL.createObjectURL(file) : null)
  }

  const hasScheduleChanges =
    !!changedNumberOrUndefined(trainingDayOfWeek, schedule?.dayOfWeek) ||
    !!changedOrUndefined(trainingStartTime, schedule?.startTime) ||
    !!changedOrUndefined(trainingEndTime, schedule?.endTime)

  const onSave = async () => {
    setServerError(null)
    setSuccessMessage(false)
    try {
      await Promise.all([
        updateSettings.mutateAsync({
          name: changedOrUndefined(name, settings?.name),
          brandName: changedOrUndefined(brandName, settings?.brandName),
          contactEmail: changedOrUndefined(contactEmail, settings?.contactEmail ?? undefined),
          contactPhone: changedOrUndefined(contactPhone, settings?.contactPhone ?? undefined),
          trainingLocation: changedOrUndefined(trainingLocation, settings?.trainingLocation ?? undefined),
          logo: logoFile ?? undefined,
        }),
        hasScheduleChanges
          ? updateSchedule.mutateAsync({
              dayOfWeek: changedNumberOrUndefined(trainingDayOfWeek, schedule?.dayOfWeek),
              startTime: changedOrUndefined(trainingStartTime, schedule?.startTime),
              endTime: changedOrUndefined(trainingEndTime, schedule?.endTime),
            })
          : Promise.resolve(),
      ])
      onLogoChange(null)
      await refreshBranding()
      setSuccessMessage(true)
      setTimeout(() => setSuccessMessage(false), 3000)
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : "Could not save these settings.")
    }
  }

  const displayedLogo = logoPreview ?? settings?.logoUrl ?? null
  const hasChanges =
    !!logoFile ||
    !!changedOrUndefined(name, settings?.name) ||
    !!changedOrUndefined(brandName, settings?.brandName) ||
    !!changedOrUndefined(contactEmail, settings?.contactEmail ?? undefined) ||
    !!changedOrUndefined(contactPhone, settings?.contactPhone ?? undefined) ||
    !!changedOrUndefined(trainingLocation, settings?.trainingLocation ?? undefined) ||
    hasScheduleChanges

  return (
    <DashboardLayout title="Academy Settings">
      {isLoading ? (
        <LoadingState rows={3} />
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : (
        <div className="mx-auto max-w-lg space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Academy details</CardTitle>
              <CardDescription>The details set when this academy signed up — change any of them here.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="academyName">Academy name</Label>
                <Input id="academyName" value={name} onChange={(e) => setName(e.target.value)} />
                <p className="text-xs text-muted-foreground">
                  Your academy's own record name — separate from the display name shown to parents below.
                </p>
              </div>

              <div className="flex items-start gap-4">
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-input bg-muted/40 text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
                  aria-label={displayedLogo ? "Change logo" : "Upload logo"}
                >
                  {displayedLogo ? (
                    <img src={displayedLogo} alt="" className="size-full object-cover" />
                  ) : (
                    <ImageUp className="size-6" aria-hidden />
                  )}
                </button>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => onLogoChange(e.target.files?.[0] ?? null)}
                />
                <div className="min-w-0 flex-1 space-y-1.5 pt-1">
                  <Label htmlFor="brandName">Display name</Label>
                  <Input id="brandName" value={brandName} onChange={(e) => setBrandName(e.target.value)} />
                  <p className="truncate text-xs text-muted-foreground">
                    {logoFile ? `New logo: ${logoFile.name}` : "Shown on receipts, the browser tab, and your public page."}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contact &amp; location</CardTitle>
              <CardDescription>Shown to parents on your academy's own public page and login screen.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="contactEmail">Contact email</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="contactPhone">Contact phone</Label>
                  <Input id="contactPhone" type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="trainingLocation">Training location</Label>
                <Input
                  id="trainingLocation"
                  placeholder="e.g. Achimota, Accra"
                  value={trainingLocation}
                  onChange={(e) => setTrainingLocation(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Weekly training schedule</CardTitle>
              <CardDescription>
                The recurring fixture every team's sessions auto-schedule from, e.g. "every Saturday."
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {scheduleLoading ? (
                <LoadingState rows={1} />
              ) : scheduleIsError ? (
                <ErrorState onRetry={() => void refetchSchedule()} />
              ) : (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="trainingDayOfWeek">Day of week</Label>
                    <Select
                      id="trainingDayOfWeek"
                      value={trainingDayOfWeek}
                      onChange={(e) => setTrainingDayOfWeek(Number(e.target.value))}
                      className="w-full sm:w-48"
                    >
                      {WEEKDAY_NAMES.map((weekdayName, value) => (
                        <option key={value} value={value}>
                          {weekdayName}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="trainingStartTime">Start time</Label>
                      <Input
                        id="trainingStartTime"
                        type="time"
                        value={trainingStartTime}
                        onChange={(e) => setTrainingStartTime(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="trainingEndTime">End time</Label>
                      <Input
                        id="trainingEndTime"
                        type="time"
                        value={trainingEndTime}
                        onChange={(e) => setTrainingEndTime(e.target.value)}
                      />
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <div className="space-y-2">
            {serverError ? <p className="text-sm text-destructive">{serverError}</p> : null}
            {successMessage ? <p className="text-sm text-success">Saved.</p> : null}
            <Button
              onClick={() => void onSave()}
              disabled={!hasChanges || updateSettings.isPending || updateSchedule.isPending}
            >
              <Save className="size-4" aria-hidden />
              {updateSettings.isPending || updateSchedule.isPending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
