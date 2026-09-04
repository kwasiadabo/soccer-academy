import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api, apiUpload } from "@/lib/api-client"

export type GalleryPhotoContext = "SATURDAY_TRAINING" | "MATCH"

export interface GalleryPhoto {
  id: string
  context: GalleryPhotoContext
  url: string
  sessionDate: string
  details: string
  createdAt: string
}

export interface ReplaceGalleryPhotosInput {
  files: File[]
  sessionDate: string
  details: string
}

const QUERY_KEY = ["gallery", "public"] as const

export function useGalleryFeed() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => api.get<GalleryPhoto[]>("/gallery/public"),
  })
}

export function useReplaceGalleryPhotos(context: GalleryPhotoContext) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ files, sessionDate, details }: ReplaceGalleryPhotosInput) => {
      const formData = new FormData()
      for (const file of files) formData.append("files", file)
      formData.append("sessionDate", sessionDate)
      formData.append("details", details)
      return apiUpload<GalleryPhoto[]>(`/gallery/${context}/photos`, formData)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}
