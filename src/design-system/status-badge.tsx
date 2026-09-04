import { Badge, type badgeVariants } from "@/components/ui/badge"
import type { VariantProps } from "class-variance-authority"

type BadgeVariant = VariantProps<typeof badgeVariants>["variant"]

const STATUS_CONFIG: Record<string, { label: string; variant: BadgeVariant }> = {
  // Player registration lifecycle
  DRAFT: { label: "Draft", variant: "secondary" },
  PENDING_PARENT_INFO: { label: "Pending Parent Info", variant: "warning" },
  SUBMITTED: { label: "Submitted", variant: "info" },
  PENDING_APPROVAL: { label: "Pending Approval", variant: "warning" },
  PENDING_REGISTRATION_PAYMENT: { label: "Pending Payment", variant: "warning" },
  ACTIVE: { label: "Active", variant: "success" },
  SUSPENDED: { label: "Suspended", variant: "destructive" },
  WITHDRAWN: { label: "Withdrawn", variant: "outline" },

  // Training approval
  APPROVED: { label: "Approved", variant: "success" },
  REJECTED: { label: "Rejected", variant: "destructive" },
  CHANGES_REQUESTED: { label: "Changes Requested", variant: "warning" },

  // Invoices / payments
  PENDING: { label: "Pending", variant: "warning" },
  PARTIALLY_PAID: { label: "Partially Paid", variant: "info" },
  PAID: { label: "Paid", variant: "success" },
  OVERDUE: { label: "Overdue", variant: "destructive" },
  WAIVED: { label: "Waived", variant: "outline" },
  CANCELLED: { label: "Cancelled", variant: "outline" },

  // Attendance
  PRESENT: { label: "Present", variant: "success" },
  ABSENT: { label: "Absent", variant: "destructive" },
  LATE: { label: "Late", variant: "warning" },
  EXCUSED: { label: "Excused", variant: "info" },
  INJURED: { label: "Injured", variant: "destructive" },

  // Matches
  SCHEDULED: { label: "Scheduled", variant: "info" },
  COMPLETED: { label: "Completed", variant: "success" },
  POSTPONED: { label: "Postponed", variant: "warning" },
  WIN: { label: "Win", variant: "success" },
  DRAW: { label: "Draw", variant: "warning" },
  LOSS: { label: "Loss", variant: "destructive" },

  // Coach assignment role
  PRIMARY: { label: "Primary", variant: "secondary" },
  ASSISTANT: { label: "Assistant", variant: "outline" },

  // Parent-raised issues
  OPEN: { label: "Open", variant: "warning" },
  IN_PROGRESS: { label: "In Progress", variant: "info" },
  RESOLVED: { label: "Resolved", variant: "success" },
  CLOSED: { label: "Closed", variant: "outline" },

  // Merchandise orders (PENDING/APPROVED/REJECTED/CANCELLED already covered above)
  READY_FOR_PICKUP: { label: "Ready for Pickup", variant: "info" },
  FULFILLED: { label: "Fulfilled", variant: "success" },
}

export function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] ?? { label: status, variant: "secondary" as const }
  return <Badge variant={config.variant}>{config.label}</Badge>
}
