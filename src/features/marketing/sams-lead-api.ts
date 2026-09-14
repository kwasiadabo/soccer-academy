import { useMutation } from "@tanstack/react-query"
import { api } from "@/lib/api-client"

export interface SubmitPlatformLeadInput {
  academyName: string
  trainingLocation: string
  contactName: string
  contactEmail: string
  contactPhone: string
  message?: string
}

export function useSubmitPlatformLead() {
  return useMutation({
    mutationFn: (input: SubmitPlatformLeadInput) => api.post("/platform/leads", input),
  })
}
