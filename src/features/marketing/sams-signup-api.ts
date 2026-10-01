import { useMutation } from "@tanstack/react-query"
import { api, apiUpload } from "@/lib/api-client"

export interface SignupAcademyInput {
  slug: string
  name: string
  brandName?: string
  adminEmail: string
  adminFirstName: string
  adminLastName: string
  adminPassword: string
  logo?: File
}

export interface SignupAcademyResult {
  academy: { id: string; slug: string; name: string }
}

export function useSignupAcademy() {
  return useMutation({
    mutationFn: (input: SignupAcademyInput) => {
      const { logo, ...fields } = input
      const formData = new FormData()
      for (const [key, value] of Object.entries(fields)) {
        if (value !== undefined) formData.append(key, value)
      }
      if (logo) formData.append("logo", logo)
      return apiUpload<SignupAcademyResult>("/platform/signup", formData)
    },
  })
}

export interface InitializeSignupInput {
  name: string
  slug: string
  adminFirstName: string
  adminLastName: string
  adminEmail: string
  adminPassword: string
  callbackUrl: string
}

export interface InitializeSignupPaymentResult {
  authorizationUrl: string
  reference: string
}

// Step one of the paid signup flow — charges the one-time signup fee and,
// the instant that's initialized, the backend persists these details as a
// PendingAcademySignup (not a real account) so the signup survives however
// long it takes to actually pay, including closing the browser entirely.
export function useInitializeSignupPayment() {
  return useMutation({
    mutationFn: (input: InitializeSignupInput) =>
      api.post<InitializeSignupPaymentResult>("/platform/signup/initialize-payment", input),
  })
}

// The link in the resume/reminder/deletion-warning emails — issues a fresh
// Paystack checkout for an existing PendingAcademySignup.
export function useResumeSignupPayment() {
  return useMutation({
    mutationFn: (input: { resumeToken: string; callbackUrl: string }) =>
      api.post<InitializeSignupPaymentResult>("/platform/signup/resume", input),
  })
}

// Step two — verifies the payment actually succeeded and, only then, creates
// the academy from the PendingAcademySignup this reference belongs to. The
// academy/admin details themselves no longer travel through the browser
// here — they were already persisted in step one.
export function useVerifyAndCreateSignup() {
  return useMutation({
    mutationFn: (input: { reference: string }) =>
      api.post<SignupAcademyResult>("/platform/signup/verify-and-create", input),
  })
}
