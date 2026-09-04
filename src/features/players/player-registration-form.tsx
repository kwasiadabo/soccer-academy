import { useEffect, useState } from "react"
import { useFieldArray, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useNavigate } from "react-router-dom"
import { Check, Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { ApiError, api, apiUpload } from "@/lib/api-client"
import { useAgeCategories } from "@/features/dashboard-admin/academy-config-api"
import { useCreatePlayer, usePlayer, type Player } from "./players-api"
import { PlayerPhotoCapture } from "./player-photo-capture"
import { RegistrationPaymentCollector } from "./registration-payment-collector"

const guardianSchema = z.object({
  firstName: z.string().min(1, "Required"),
  lastName: z.string().min(1, "Required"),
  phone: z.string().min(6, "Enter a valid phone number"),
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  relationship: z.enum(["MOTHER", "FATHER", "GUARDIAN", "OTHER"]),
})

const schema = z.object({
  firstName: z.string().min(1, "First name is required"),
  middleName: z.string().optional(),
  lastName: z.string().min(1, "Last name is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  ageCategoryId: z.string().min(1, "Select an age category"),
  nationality: z.string().optional(),
  residentialAddress: z.string().optional(),
  preferredPosition: z.string().optional(),
  dominantFoot: z.enum(["LEFT", "RIGHT", "BOTH"]).optional().or(z.literal("")),
  previousExperience: z.string().optional(),
  medicalNotes: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  guardians: z.array(guardianSchema).min(1, "At least one guardian is required"),
  primaryGuardianIndex: z.string().min(1),
})

type FormValues = z.infer<typeof schema>

const STEPS = [
  { label: "Player details", description: "Core profile information" },
  { label: "Guardians", description: "Parent / guardian contacts" },
  { label: "Review", description: "Confirm before submitting" },
  { label: "Payment", description: "Collect the registration fee" },
] as const

const REVIEW_STEP = 2
const PAYMENT_STEP = 3

const STEP_DETAILS_FIELDS = ["firstName", "lastName", "dateOfBirth", "gender", "ageCategoryId"] as const
const STEP_GUARDIAN_FIELDS = ["guardians", "primaryGuardianIndex"] as const

function StepIndicator({ current }: { current: number }) {
  return (
    <ol className="mb-6 flex items-start">
      {STEPS.map((step, index) => {
        const isComplete = index < current
        const isCurrent = index === current
        return (
          <li key={step.label} className="flex flex-1 items-center last:flex-none">
            <div className="flex items-center gap-2.5">
              <div
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                  isComplete
                    ? "bg-primary text-primary-foreground"
                    : isCurrent
                      ? "border-2 border-primary text-primary"
                      : "border border-border text-muted-foreground",
                )}
                aria-hidden
              >
                {isComplete ? <Check className="size-3.5" /> : index + 1}
              </div>
              <div className="hidden sm:block">
                <p className={cn("text-xs font-semibold", isCurrent || isComplete ? "text-foreground" : "text-muted-foreground")}>
                  {step.label}
                </p>
                <p className="text-[11px] text-muted-foreground">{step.description}</p>
              </div>
            </div>
            {index < STEPS.length - 1 ? (
              <div className={cn("mx-3 h-px flex-1", isComplete ? "bg-primary" : "bg-border")} aria-hidden />
            ) : null}
          </li>
        )
      })}
    </ol>
  )
}

const RELATIONSHIP_LABELS: Record<string, string> = {
  MOTHER: "Mother",
  FATHER: "Father",
  GUARDIAN: "Guardian",
  OTHER: "Other",
}

export function PlayerRegistrationForm() {
  const navigate = useNavigate()
  const { data: ageCategories } = useAgeCategories()
  const createPlayer = useCreatePlayer()
  const [serverError, setServerError] = useState<string | null>(null)
  const [step, setStep] = useState(0)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null)
  const [createdPlayer, setCreatedPlayer] = useState<Player | null>(null)
  const { data: livePlayer } = usePlayer(createdPlayer?.id)

  useEffect(() => {
    if (!photoFile) {
      setPhotoPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(photoFile)
    setPhotoPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [photoFile])

  const {
    register,
    control,
    handleSubmit,
    watch,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      guardians: [{ firstName: "", lastName: "", phone: "", email: "", relationship: "MOTHER" }],
      primaryGuardianIndex: "0",
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: "guardians" })
  const primaryGuardianIndex = watch("primaryGuardianIndex")
  const values = watch()

  const goNext = async () => {
    const fieldsToValidate = step === 0 ? STEP_DETAILS_FIELDS : STEP_GUARDIAN_FIELDS
    const valid = await trigger(fieldsToValidate as unknown as (keyof FormValues)[])
    if (valid) setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }

  const goBack = () => setStep((s) => Math.max(s - 1, 0))

  const onSubmit = async (values: FormValues) => {
    if (step !== REVIEW_STEP) return
    setServerError(null)
    try {
      const player = await createPlayer.mutateAsync({
        firstName: values.firstName,
        middleName: values.middleName || undefined,
        lastName: values.lastName,
        dateOfBirth: values.dateOfBirth,
        gender: values.gender,
        ageCategoryId: values.ageCategoryId,
        nationality: values.nationality || undefined,
        residentialAddress: values.residentialAddress || undefined,
        preferredPosition: values.preferredPosition || undefined,
        dominantFoot: values.dominantFoot || undefined,
        previousExperience: values.previousExperience || undefined,
        medicalNotes: values.medicalNotes || undefined,
        emergencyContactName: values.emergencyContactName || undefined,
        emergencyContactPhone: values.emergencyContactPhone || undefined,
        guardians: values.guardians.map((g, index) => ({
          firstName: g.firstName,
          lastName: g.lastName,
          phone: g.phone,
          email: g.email || undefined,
          relationship: g.relationship,
          isPrimary: index === Number(values.primaryGuardianIndex),
        })),
      })

      if (photoFile) {
        try {
          const formData = new FormData()
          formData.append("file", photoFile)
          await apiUpload<Player>(`/players/${player.id}/photo`, formData)
        } catch {
          // Registration already succeeded; the photo can be added later from the player profile.
        }
      }

      // Moves the player straight from bio-data capture to payment collection (generates
      // the registration invoice) — see PlayersService#approve. Nothing else can be done
      // for this player until the Payment step below is completed.
      const approvedPlayer = await api.post<Player>(`/players/${player.id}/approve`)
      setCreatedPlayer(approvedPlayer)
      setStep(PAYMENT_STEP)
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : "Could not create the registration.")
    }
  }

  const selectedAgeCategory = ageCategories?.find((c) => c.id === values.ageCategoryId)

  return (
    <form className="space-y-6" onSubmit={handleSubmit(onSubmit)} noValidate>
      <StepIndicator current={step} />

      {step === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Player Details</CardTitle>
            <CardDescription>Core information captured at registration</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5 sm:col-span-3">
              <Label>Player photo</Label>
              <PlayerPhotoCapture value={photoFile} onChange={setPhotoFile} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="firstName">First name</Label>
              <Input id="firstName" {...register("firstName")} />
              {errors.firstName ? <p className="text-xs text-destructive">{errors.firstName.message}</p> : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="middleName">Middle name</Label>
              <Input id="middleName" {...register("middleName")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName">Last name</Label>
              <Input id="lastName" {...register("lastName")} />
              {errors.lastName ? <p className="text-xs text-destructive">{errors.lastName.message}</p> : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dateOfBirth">Date of birth</Label>
              <Input id="dateOfBirth" type="date" {...register("dateOfBirth")} />
              {errors.dateOfBirth ? (
                <p className="text-xs text-destructive">{errors.dateOfBirth.message}</p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gender">Gender</Label>
              <Select id="gender" {...register("gender")}>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ageCategoryId">Age category</Label>
              <Select id="ageCategoryId" defaultValue="" {...register("ageCategoryId")}>
                <option value="" disabled>
                  Select an age category
                </option>
                {ageCategories?.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
              {errors.ageCategoryId ? (
                <p className="text-xs text-destructive">{errors.ageCategoryId.message}</p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nationality">Nationality</Label>
              <Input id="nationality" {...register("nationality")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="preferredPosition">Preferred position</Label>
              <Input id="preferredPosition" placeholder="Midfielder" {...register("preferredPosition")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dominantFoot">Dominant foot</Label>
              <Select id="dominantFoot" defaultValue="" {...register("dominantFoot")}>
                <option value="">Not specified</option>
                <option value="LEFT">Left</option>
                <option value="RIGHT">Right</option>
                <option value="BOTH">Both</option>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-3">
              <Label htmlFor="residentialAddress">Residential address</Label>
              <Input id="residentialAddress" {...register("residentialAddress")} />
            </div>
            <div className="space-y-1.5 sm:col-span-3">
              <Label htmlFor="previousExperience">Previous football experience</Label>
              <Textarea id="previousExperience" rows={2} {...register("previousExperience")} />
            </div>
            <div className="space-y-1.5 sm:col-span-3">
              <Label htmlFor="medicalNotes">Medical / emergency information</Label>
              <Textarea id="medicalNotes" rows={2} {...register("medicalNotes")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emergencyContactName">Emergency contact name</Label>
              <Input id="emergencyContactName" {...register("emergencyContactName")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emergencyContactPhone">Emergency contact phone</Label>
              <Input id="emergencyContactPhone" {...register("emergencyContactPhone")} />
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 1 ? (
        <Card>
          <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Parent / Guardian Details</CardTitle>
              <CardDescription>At least one guardian is required. Select the primary contact.</CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                append({ firstName: "", lastName: "", phone: "", email: "", relationship: "GUARDIAN" })
              }
            >
              <Plus /> Add guardian
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {errors.guardians?.root ? (
              <p className="text-xs text-destructive">{errors.guardians.root.message}</p>
            ) : null}
            {fields.map((field, index) => (
              <div key={field.id} className="rounded-lg border border-border p-4">
                <div className="mb-3 flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input
                      type="radio"
                      checked={Number(primaryGuardianIndex) === index}
                      value={index}
                      {...register("primaryGuardianIndex")}
                    />
                    Primary contact
                  </label>
                  {fields.length > 1 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Remove guardian ${index + 1}`}
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="text-destructive" />
                    </Button>
                  ) : null}
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>First name</Label>
                    <Input {...register(`guardians.${index}.firstName`)} />
                    {errors.guardians?.[index]?.firstName ? (
                      <p className="text-xs text-destructive">{errors.guardians[index]?.firstName?.message}</p>
                    ) : null}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Last name</Label>
                    <Input {...register(`guardians.${index}.lastName`)} />
                    {errors.guardians?.[index]?.lastName ? (
                      <p className="text-xs text-destructive">{errors.guardians[index]?.lastName?.message}</p>
                    ) : null}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Phone</Label>
                    <Input {...register(`guardians.${index}.phone`)} />
                    {errors.guardians?.[index]?.phone ? (
                      <p className="text-xs text-destructive">{errors.guardians[index]?.phone?.message}</p>
                    ) : null}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Email</Label>
                    <Input type="email" {...register(`guardians.${index}.email`)} />
                    {errors.guardians?.[index]?.email ? (
                      <p className="text-xs text-destructive">{errors.guardians[index]?.email?.message}</p>
                    ) : null}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Relationship</Label>
                    <Select {...register(`guardians.${index}.relationship`)}>
                      <option value="MOTHER">Mother</option>
                      <option value="FATHER">Father</option>
                      <option value="GUARDIAN">Guardian</option>
                      <option value="OTHER">Other</option>
                    </Select>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {step === 2 ? (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Player Details</CardTitle>
              <CardDescription>Review the information below, then submit the registration.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              {photoPreviewUrl ? (
                <div className="sm:col-span-2">
                  <img
                    src={photoPreviewUrl}
                    alt="Player"
                    className="size-20 rounded-2xl border-4 border-background object-cover shadow-lg ring-1 ring-border"
                  />
                </div>
              ) : null}
              <ReviewItem
                label="Name"
                value={[values.firstName, values.middleName, values.lastName].filter(Boolean).join(" ")}
              />
              <ReviewItem label="Date of birth" value={values.dateOfBirth} />
              <ReviewItem label="Gender" value={values.gender} />
              <ReviewItem label="Age category" value={selectedAgeCategory?.name ?? "—"} />
              <ReviewItem label="Nationality" value={values.nationality || "—"} />
              <ReviewItem label="Preferred position" value={values.preferredPosition || "—"} />
              <ReviewItem label="Dominant foot" value={values.dominantFoot || "—"} />
              <ReviewItem label="Residential address" value={values.residentialAddress || "—"} />
              <ReviewItem label="Emergency contact" value={values.emergencyContactName || "—"} />
              <ReviewItem label="Emergency phone" value={values.emergencyContactPhone || "—"} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Guardians</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {values.guardians.map((g, index) => (
                <div key={index} className="rounded-lg border border-border p-3 text-sm">
                  <p className="font-medium">
                    {g.firstName} {g.lastName}
                    {Number(values.primaryGuardianIndex) === index ? (
                      <span className="ml-2 text-xs font-normal text-muted-foreground">(Primary)</span>
                    ) : null}
                  </p>
                  <p className="text-muted-foreground">
                    {RELATIONSHIP_LABELS[g.relationship]} · {g.phone}
                    {g.email ? ` · ${g.email}` : ""}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {step === PAYMENT_STEP && createdPlayer ? (
        <Card>
          <CardHeader>
            <CardTitle>Registration Payment</CardTitle>
            <CardDescription>
              Collect the registration fee to activate {createdPlayer.firstName}'s registration. No other activity
              (team assignment, attendance, assessments) is allowed for this player until payment is complete.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <RegistrationPaymentCollector
              playerId={createdPlayer.id}
              playerName={`${createdPlayer.firstName} ${createdPlayer.lastName}`}
            />
            <div className="flex items-center justify-between border-t border-border pt-4">
              {livePlayer?.status === "ACTIVE" ? (
                <>
                  <span />
                  <Button
                    type="button"
                    onClick={() => navigate(`/receptionist/players/${createdPlayer.id}?tab=team`)}
                  >
                    <Check /> Payment complete — assign team
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => navigate(`/receptionist/players/${createdPlayer.id}`)}
                >
                  I'll collect payment later
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {serverError ? <p className="text-sm text-destructive">{serverError}</p> : null}

      {step < PAYMENT_STEP ? (
        <div className="flex justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => (step === 0 ? navigate(-1) : goBack())}
          >
            {step === 0 ? "Cancel" : "Back"}
          </Button>
          {step < REVIEW_STEP ? (
            <Button key="continue" type="button" onClick={() => void goNext()}>
              Continue
            </Button>
          ) : (
            <Button key="submit" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating…" : "Create registration"}
            </Button>
          )}
        </div>
      ) : null}
    </form>
  )
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value || "—"}</p>
    </div>
  )
}
