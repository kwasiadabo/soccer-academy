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

export interface InitializeSignupPaymentResult {
  authorizationUrl: string
  reference: string
}

// Step one of the paid signup flow — charges the one-time signup fee before
// anything is created. Nothing about the academy is sent here; that's carried
// through the Paystack redirect by the caller (see signup-payment-callback-page.tsx).
export function useInitializeSignupPayment() {
  return useMutation({
    mutationFn: (input: { email: string; callbackUrl: string }) =>
      api.post<InitializeSignupPaymentResult>("/platform/signup/initialize-payment", input),
  })
}

// Step two — verifies the payment actually succeeded and, only then, creates
// the academy with the same details the /platform/signup endpoint accepts.
export function useVerifyAndCreateSignup() {
  return useMutation({
    mutationFn: (input: SignupAcademyInput & { reference: string }) => {
      const { logo, ...fields } = input
      const formData = new FormData()
      for (const [key, value] of Object.entries(fields)) {
        if (value !== undefined) formData.append(key, value)
      }
      if (logo) formData.append("logo", logo)
      return apiUpload<SignupAcademyResult>("/platform/signup/verify-and-create", formData)
    },
  })
}
