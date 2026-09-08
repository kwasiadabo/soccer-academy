import { ROLE_NAMES } from "@/lib/shared-types"

export const ROLE_HOME_PATH: Record<string, string> = {
  [ROLE_NAMES.ADMIN]: "/admin",
  [ROLE_NAMES.RECEPTIONIST]: "/receptionist",
  [ROLE_NAMES.HEAD_COACH]: "/head-coach",
  [ROLE_NAMES.COACH]: "/coach",
  [ROLE_NAMES.PARENT]: "/parent",
  [ROLE_NAMES.PLAYER]: "/parent",
}

export function homePathForRoles(roles: string[]): string {
  for (const role of roles) {
    if (ROLE_HOME_PATH[role]) return ROLE_HOME_PATH[role]
  }
  return "/login"
}
