import { useEffect, useRef, useState } from "react"
import { ImageUp, Save } from "lucide-react"
import { toast } from "sonner"

import { DashboardLayout } from "@/app/dashboard-layout"
import { useAcademyBranding } from "@/app/academy-branding-context"
import { useStaffNavItems } from "@/features/issues/staff-issues-page"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { LoadingState } from "@/design-system/loading-state"
import { ErrorState } from "@/design-system/error-state"
import { ApiError } from "@/lib/api-client"
import { useAcademySettings, useUpdateAcademySettings } from "./academy-settings-api"
import { TrainingScheduleSection } from "./training-schedule-section"

function changedOrUndefined(value: string, original: string | undefined): string | undefined {
  const trimmed = value.trim()
  return trimmed !== "" && trimmed !== (original ?? "") ? trimmed : undefined
}

export function AcademySettingsPage() {
  const { data: settings, isLoading, isError, refetch } = useAcademySettings()
  const updateSettings = useUpdateAcademySettings()
  const { refresh: refreshBranding } = useAcademyBranding()
  const navItems = useStaffNavItems()

  const [name, setName] = useState("")
  const [brandName, setBrandName] = useState("")
  const [contactEmail, setContactEmail] = useState("")
  const [contactPhone, setContactPhone] = useState("")
  const [trainingLocation, setTrainingLocation] = useState("")
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
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
    return () => {
      if (logoPreview) URL.revokeObjectURL(logoPreview)
    }
  }, [logoPreview])

  const onLogoChange = (file: File | null) => {
    if (logoPreview) URL.revokeObjectURL(logoPreview)
    setLogoFile(file)
    setLogoPreview(file ? URL.createObjectURL(file) : null)
  }

  const onSave = async () => {
    try {
      await updateSettings.mutateAsync({
        name: changedOrUndefined(name, settings?.name),
        brandName: changedOrUndefined(brandName, settings?.brandName),
        contactEmail: changedOrUndefined(contactEmail, settings?.contactEmail ?? undefined),
        contactPhone: changedOrUndefined(contactPhone, settings?.contactPhone ?? undefined),
        trainingLocation: changedOrUndefined(trainingLocation, settings?.trainingLocation ?? undefined),
        logo: logoFile ?? undefined,
      })
      onLogoChange(null)
      await refreshBranding()
      toast.success("Saved.")
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not save these settings.")
    }
  }

  const displayedLogo = logoPreview ?? settings?.logoUrl ?? null
  const hasChanges =
    !!logoFile ||
    !!changedOrUndefined(name, settings?.name) ||
    !!changedOrUndefined(brandName, settings?.brandName) ||
    !!changedOrUndefined(contactEmail, settings?.contactEmail ?? undefined) ||
    !!changedOrUndefined(contactPhone, settings?.contactPhone ?? undefined) ||
    !!changedOrUndefined(trainingLocation, settings?.trainingLocation ?? undefined)

  return (
    <DashboardLayout title="Academy Settings" navItems={navItems}>
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

          <TrainingScheduleSection />

          <div className="space-y-2">
            <Button onClick={() => void onSave()} disabled={!hasChanges || updateSettings.isPending}>
              <Save className="size-4" aria-hidden />
              {updateSettings.isPending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
