import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { EmptyState } from "@/design-system/empty-state"
import { LoadingState } from "@/design-system/loading-state"
import { ErrorState } from "@/design-system/error-state"
import {
  useAddAssessmentCriteria,
  useAssessmentTemplates,
  useCreateAssessmentTemplate,
  type AssessmentCategory,
  type AssessmentTemplate,
} from "./assessments-api"

const createSchema = z.object({
  name: z.string().min(1, "Name is required"),
  ratingScale: z.enum(["SCALE_1_5", "SCALE_1_10", "QUALITATIVE"]),
})
type CreateFormValues = z.infer<typeof createSchema>

const criteriaSchema = z.object({
  category: z.enum(["TECHNICAL", "TACTICAL", "PHYSICAL", "MENTAL_BEHAVIOURAL"]),
  name: z.string().min(1, "Name is required"),
})
type CriteriaFormValues = z.infer<typeof criteriaSchema>

function AddCriteriaForm({ template }: { template: AssessmentTemplate }) {
  const addCriteria = useAddAssessmentCriteria(template.id)
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<CriteriaFormValues>({
    resolver: zodResolver(criteriaSchema),
    defaultValues: { category: "TECHNICAL" },
  })

  const onSubmit = async (values: CriteriaFormValues) => {
    await addCriteria.mutateAsync(values)
    reset({ category: values.category, name: "" })
  }

  return (
    <form className="flex items-end gap-2" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="w-40 space-y-1.5">
        <Label>Category</Label>
        <Select {...register("category")}>
          <option value="TECHNICAL">Technical</option>
          <option value="TACTICAL">Tactical</option>
          <option value="PHYSICAL">Physical</option>
          <option value="MENTAL_BEHAVIOURAL">Mental / Behavioural</option>
        </Select>
      </div>
      <div className="flex-1 space-y-1.5">
        <Label>Criteria name</Label>
        <Input placeholder="Ball control" {...register("name")} />
      </div>
      <Button type="submit" variant="outline" disabled={isSubmitting}>
        <Plus /> Add
      </Button>
    </form>
  )
}

const CATEGORY_LABEL: Record<AssessmentCategory, string> = {
  TECHNICAL: "Technical",
  TACTICAL: "Tactical",
  PHYSICAL: "Physical",
  MENTAL_BEHAVIOURAL: "Mental / Behavioural",
}

export function AssessmentTemplateSection() {
  const { data, isLoading, isError, refetch } = useAssessmentTemplates()
  const createTemplate = useCreateAssessmentTemplate()
  const [open, setOpen] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { ratingScale: "SCALE_1_5" },
  })

  const onSubmit = async (values: CreateFormValues) => {
    const template = await createTemplate.mutateAsync(values)
    reset()
    setOpen(false)
    setExpandedId(template.id)
  }

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
        <div>
          <CardTitle>Assessment Templates</CardTitle>
          <CardDescription>Rubrics coaches use to rate players</CardDescription>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus /> New template
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create assessment template</DialogTitle>
              <DialogDescription>Add criteria after creating the template.</DialogDescription>
            </DialogHeader>
            <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="template-name">Name</Label>
                <Input id="template-name" placeholder="Standard Skills Review" {...register("name")} />
                {errors.name ? <p className="text-xs text-destructive">{errors.name.message}</p> : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="template-scale">Rating scale</Label>
                <Select id="template-scale" {...register("ratingScale")}>
                  <option value="SCALE_1_5">1–5 stars</option>
                  <option value="SCALE_1_10">1–10 stars</option>
                  <option value="QUALITATIVE">Qualitative labels</option>
                </Select>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Creating…" : "Create template"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <LoadingState rows={3} />
        ) : isError ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : !data || data.length === 0 ? (
          <EmptyState title="No templates yet" description="Create a template so coaches can rate players." />
        ) : (
          data.map((template) => (
            <div key={template.id} className="rounded-lg border border-border p-4">
              <button
                type="button"
                className="flex w-full items-center justify-between text-left"
                onClick={() => setExpandedId(expandedId === template.id ? null : template.id)}
              >
                <div>
                  <p className="text-sm font-medium">{template.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {template.ratingScale.replace("_", " ")} · {template.criteria.length} criteria
                  </p>
                </div>
              </button>
              {expandedId === template.id ? (
                <div className="mt-3 space-y-3 border-t border-border pt-3">
                  {template.criteria.length > 0 ? (
                    <ul className="space-y-1 text-sm">
                      {template.criteria.map((c) => (
                        <li key={c.id} className="flex items-center justify-between">
                          <span>{c.name}</span>
                          <span className="text-xs text-muted-foreground">{CATEGORY_LABEL[c.category]}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-muted-foreground">No criteria yet.</p>
                  )}
                  <AddCriteriaForm template={template} />
                </div>
              ) : null}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
