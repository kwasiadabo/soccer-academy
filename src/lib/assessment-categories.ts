export type AssessmentCategory = "TECHNICAL" | "TACTICAL" | "PHYSICAL" | "MENTAL_BEHAVIOURAL"
export type RatingScaleType = "SCALE_1_5" | "SCALE_1_10" | "QUALITATIVE"

export const CATEGORY_LABELS: Record<AssessmentCategory, string> = {
  TECHNICAL: "Technical Skills",
  TACTICAL: "Tactical Awareness",
  PHYSICAL: "Physical Development",
  MENTAL_BEHAVIOURAL: "Teamwork & Attitude",
}

export function scaleMax(scale: RatingScaleType): number {
  if (scale === "SCALE_1_10") return 10
  if (scale === "QUALITATIVE") return 4
  return 5
}

interface RatingLike {
  ratingValue: string
  criteria: { category: AssessmentCategory } | null
}

interface AssessmentLike {
  ratings: RatingLike[]
  template: { ratingScale: RatingScaleType } | null
  assessmentDate: string
  strengths?: string | null
  areasForImprovement?: string | null
}

// Session-activity ratings (no template, no criteria category) can't be broken down by
// TECHNICAL/TACTICAL/PHYSICAL/MENTAL_BEHAVIOURAL — only template-based ratings contribute here.
export function computeCategoryScores(assessments: AssessmentLike[]): { category: AssessmentCategory; percent: number }[] {
  const sums = new Map<AssessmentCategory, { total: number; count: number }>()

  for (const assessment of assessments) {
    if (!assessment.template) continue
    const max = scaleMax(assessment.template.ratingScale)
    for (const rating of assessment.ratings) {
      if (!rating.criteria) continue
      const value = Number(rating.ratingValue)
      if (Number.isNaN(value)) continue
      const category = rating.criteria.category
      const entry = sums.get(category) ?? { total: 0, count: 0 }
      entry.total += (value / max) * 100
      entry.count += 1
      sums.set(category, entry)
    }
  }

  return (Object.keys(CATEGORY_LABELS) as AssessmentCategory[])
    .filter((category) => sums.has(category))
    .map((category) => {
      const entry = sums.get(category)!
      return { category, percent: entry.total / entry.count }
    })
}

// Session-activity ratings have no per-template scale, but are always recorded on the
// fixed SCALE_1_5 star input (see SessionActivityAssessmentForm), so that's the default here.
export function assessmentAveragePercent(assessment: AssessmentLike): number | null {
  const max = assessment.template ? scaleMax(assessment.template.ratingScale) : scaleMax("SCALE_1_5")
  const values = assessment.ratings.map((r) => Number(r.ratingValue)).filter((v) => !Number.isNaN(v))
  if (values.length === 0) return null
  const avg = values.reduce((sum, v) => sum + v, 0) / values.length
  return (avg / max) * 100
}

export type DevelopmentTrend = "improving" | "declining" | "steady" | "none" | "single"

export interface DevelopmentNote {
  trend: DevelopmentTrend
  text: string
}

export function computeDevelopmentNote(assessments: AssessmentLike[]): DevelopmentNote {
  const sorted = [...assessments].sort(
    (a, b) => new Date(a.assessmentDate).getTime() - new Date(b.assessmentDate).getTime(),
  )
  const scored = sorted
    .map((a) => ({ assessment: a, percent: assessmentAveragePercent(a) }))
    .filter((s): s is { assessment: AssessmentLike; percent: number } => s.percent !== null)

  if (scored.length === 0) {
    return {
      trend: "none",
      text: "No ratings recorded yet — a development trend will appear once assessments are saved.",
    }
  }
  if (scored.length === 1) {
    return {
      trend: "single",
      text: "Only one assessment on record so far — a trend will appear once there are more to compare.",
    }
  }

  const splitSize = Math.max(1, Math.floor(scored.length / 3))
  const earliest = scored.slice(0, splitSize)
  const latest = scored.slice(scored.length - splitSize)
  const avg = (rows: typeof scored) => rows.reduce((sum, r) => sum + r.percent, 0) / rows.length
  const earlyAvg = avg(earliest)
  const lateAvg = avg(latest)
  const delta = lateAvg - earlyAvg

  let trend: DevelopmentTrend
  let trendText: string
  if (delta > 5) {
    trend = "improving"
    trendText = `Ratings have improved over the last ${scored.length} assessments (avg ${earlyAvg.toFixed(0)}% → ${lateAvg.toFixed(0)}%).`
  } else if (delta < -5) {
    trend = "declining"
    trendText = `Ratings have dropped over the last ${scored.length} assessments (avg ${earlyAvg.toFixed(0)}% → ${lateAvg.toFixed(0)}%).`
  } else {
    trend = "steady"
    trendText = `Ratings have stayed fairly steady across the last ${scored.length} assessments (avg around ${lateAvg.toFixed(0)}%).`
  }

  const mostRecent = sorted[sorted.length - 1]
  const notes: string[] = []
  if (mostRecent.strengths) notes.push(`Recent strength: ${mostRecent.strengths}`)
  if (mostRecent.areasForImprovement) notes.push(`Focus area: ${mostRecent.areasForImprovement}`)

  return { trend, text: [trendText, ...notes].join(" ") }
}
