function ordinal(day: number): string {
  if (day % 10 === 1 && day !== 11) return "st"
  if (day % 10 === 2 && day !== 12) return "nd"
  if (day % 10 === 3 && day !== 13) return "rd"
  return "th"
}

export function formatDate(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value
  const day = date.getDate()
  const month = date.toLocaleDateString("en-US", { month: "short" })
  const year = date.getFullYear()
  return `${day}${ordinal(day)} ${month} ${year}`
}

export function formatMonthYear(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" })
}

export function formatTime(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value
  let hours = date.getHours()
  const minutes = date.getMinutes().toString().padStart(2, "0")
  const suffix = hours >= 12 ? "pm" : "am"
  hours = hours % 12
  if (hours === 0) hours = 12
  return `${hours}:${minutes}${suffix}`
}

export function isSameDay(a: string | Date, b: string | Date): boolean {
  const dateA = typeof a === "string" ? new Date(a) : a
  const dateB = typeof b === "string" ? new Date(b) : b
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  )
}

// Training is a fixed weekly fixture on Saturday (see TrainingService#resolveSaturday on the
// API) — the "current" training day is the most recent Saturday on or before today, not
// necessarily the literal calendar date. A session dated for that day should still read as
// "this week's session" on any day between Saturday and the following Friday.
function resolveCurrentTrainingDate(): Date {
  const now = new Date()
  const daysSinceSaturday = (now.getDay() + 1) % 7 // now.getDay(): 0 Sun..6 Sat
  const d = new Date(now)
  d.setDate(d.getDate() - daysSinceSaturday)
  return d
}

// Coaches can also create one-off sessions on other days (a makeup session, a holiday camp
// slot, etc). Those won't ever match isCurrentTrainingDay, so this widens the window to the
// full training week (Saturday through the following Friday) for "what's on this week" views.
export function isWithinCurrentTrainingWeek(dateStr: string | Date): boolean {
  const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr
  const start = resolveCurrentTrainingDate()
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 7)
  return date >= start && date < end
}

export function isPastDate(dateStr: string | Date): boolean {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr
  return date < startOfToday
}

export function calculateAge(dateOfBirth: string | Date): number {
  const dob = typeof dateOfBirth === "string" ? new Date(dateOfBirth) : dateOfBirth
  const now = new Date()
  let age = now.getFullYear() - dob.getFullYear()
  const hasHadBirthdayThisYear =
    now.getMonth() > dob.getMonth() || (now.getMonth() === dob.getMonth() && now.getDate() >= dob.getDate())
  if (!hasHadBirthdayThisYear) age -= 1
  return age
}
