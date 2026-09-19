import type { SignupAcademyInput } from "./sams-signup-api"

const STORAGE_KEY = "sams-pending-signup"

// Carries the signup form across the full-page navigation to Paystack's
// hosted checkout and back — sessionStorage rather than React state because
// that redirect tears down the whole app. The logo (if any) travels as a
// base64 data URL since File objects aren't serializable.
export interface PendingSignup extends Omit<SignupAcademyInput, "logo"> {
  logoDataUrl?: string
  logoFileName?: string
  logoMimeType?: string
}

export function savePendingSignup(data: PendingSignup) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // Best-effort — if storage is unavailable the callback page will just
    // show its "couldn't find your details" fallback.
  }
}

export function loadPendingSignup(): PendingSignup | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as PendingSignup) : null
  } catch {
    return null
  }
}

export function clearPendingSignup() {
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // Nothing to do — worst case a stale entry lingers until overwritten.
  }
}

export async function pendingSignupLogoFile(pending: PendingSignup): Promise<File | undefined> {
  if (!pending.logoDataUrl || !pending.logoFileName || !pending.logoMimeType) return undefined
  const res = await fetch(pending.logoDataUrl)
  const blob = await res.blob()
  return new File([blob], pending.logoFileName, { type: pending.logoMimeType })
}
