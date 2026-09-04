import { useMutation } from "@tanstack/react-query"
import { api } from "@/lib/api-client"

export interface CreateInquiryInput {
  childFirstName: string
  childLastName: string
  childDateOfBirth?: string
  guardianName: string
  guardianPhone: string
  guardianEmail?: string
  preferredProgram?: string
  message?: string
}

export function useSubmitInquiry() {
  return useMutation({
    mutationFn: (input: CreateInquiryInput) => api.post("/inquiries", input),
  })
}
