// Vendored from packages/shared-types (apps/web is its own standalone git repo and
// Docker build context, with no access to sibling monorepo folders) — keep this in
// sync with apps/api/prisma/schema.prisma enums and packages/shared-types/src/index.ts.

export type PlayerStatus =
  | 'DRAFT'
  | 'PENDING_PARENT_INFO'
  | 'SUBMITTED'
  | 'PENDING_APPROVAL'
  | 'PENDING_REGISTRATION_PAYMENT'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'WITHDRAWN';

export type TrainingApprovalStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'CHANGES_REQUESTED';

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED' | 'INJURED';

export type InvoiceStatus =
  | 'PENDING'
  | 'PARTIALLY_PAID'
  | 'PAID'
  | 'OVERDUE'
  | 'WAIVED'
  | 'CANCELLED';

export const ROLE_NAMES = {
  ADMIN: 'System Administrator',
  RECEPTIONIST: 'Receptionist',
  HEAD_COACH: 'Head Coach',
  COACH: 'Coach',
  PARENT: 'Parent',
  PLAYER: 'Player',
} as const;

export type RoleName = (typeof ROLE_NAMES)[keyof typeof ROLE_NAMES];

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  mustChangePassword: boolean;
}

export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}
