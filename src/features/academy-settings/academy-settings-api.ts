import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api, apiUpload } from "@/lib/api-client"

export interface AcademySettingsView {
  name: string
  brandName: string
  logoUrl: string | null
  contactEmail: string | null
  contactPhone: string | null
  trainingLocation: string | null
}

const QUERY_KEY = ["academy-settings"]

export function useAcademySettings() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => api.get<AcademySettingsView>("/academies/settings"),
  })
}

export function useUpdateAcademySettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      name?: string
      brandName?: string
      logo?: File
      contactEmail?: string
      contactPhone?: string
      trainingLocation?: string
    }) => {
      const formData = new FormData()
      if (input.name) formData.append("name", input.name)
      if (input.brandName) formData.append("brandName", input.brandName)
      if (input.logo) formData.append("logo", input.logo)
      if (input.contactEmail) formData.append("contactEmail", input.contactEmail)
      if (input.contactPhone) formData.append("contactPhone", input.contactPhone)
      if (input.trainingLocation) formData.append("trainingLocation", input.trainingLocation)
      return apiUpload<AcademySettingsView>("/academies/settings", formData)
    },
    onSuccess: (data) => {
      queryClient.setQueryData(QUERY_KEY, data)
    },
  })
}
