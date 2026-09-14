import { useMutation } from "@tanstack/react-query"
import { apiUpload } from "@/lib/api-client"

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
