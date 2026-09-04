import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api-client"

export interface PlayerOfTheWeekEntry {
  id: string
  firstName: string
  lastInitial: string
  teamName: string
  weekOf: string
  averageRating: number
  photoUrl: string
}

export function usePlayerOfTheWeekFeed() {
  return useQuery({
    queryKey: ["marketing", "player-of-the-week"] as const,
    queryFn: () => api.get<PlayerOfTheWeekEntry[]>("/player-of-the-week/public"),
  })
}
