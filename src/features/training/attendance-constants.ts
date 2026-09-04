import type { AttendanceStatus } from "./training-api"

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  PRESENT: "Present",
  ABSENT: "Absent",
  LATE: "Late",
  EXCUSED: "Excused",
  INJURED: "Injured",
}

export const ATTENDANCE_STATUS_COLORS: Record<AttendanceStatus, string> = {
  PRESENT: "var(--success)",
  ABSENT: "var(--destructive)",
  LATE: "var(--warning)",
  EXCUSED: "var(--primary)",
  INJURED: "var(--muted-foreground)",
}

export const ATTENDANCE_STATUS_BADGE_VARIANT: Record<
  AttendanceStatus,
  "success" | "destructive" | "warning" | "default" | "secondary"
> = {
  PRESENT: "success",
  ABSENT: "destructive",
  LATE: "warning",
  EXCUSED: "default",
  INJURED: "secondary",
}
