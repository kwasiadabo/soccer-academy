import { formatDate } from "@/lib/date"
import { useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, Check, Info, Star, Trophy, Users } from "lucide-react"

import { DashboardLayout, type NavItem } from "@/app/dashboard-layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { RatingInput } from "@/components/ui/rating-input"
import { StatusBadge } from "@/design-system/status-badge"
import { LoadingState } from "@/design-system/loading-state"
import { ErrorState } from "@/design-system/error-state"
import { ApiError } from "@/lib/api-client"
import {
  useAddMatchPlayerAssessment,
  useMatch,
  useSetParticipations,
  useUpdateMatch,
  type MatchPlayerAssessment,
  type MatchWithRoster,
} from "./matches-api"

const RATING_FIELDS = [
  ["technicalRating", "Technical", "bg-chart-1/8 border-chart-1/25"],
  ["tacticalRating", "Tactical", "bg-chart-2/8 border-chart-2/25"],
  ["teamContributionRating", "Team contribution", "bg-chart-3/8 border-chart-3/25"],
  ["disciplineRating", "Discipline", "bg-chart-4/8 border-chart-4/25"],
  ["effortRating", "Effort", "bg-chart-5/8 border-chart-5/25"],
  ["overallRating", "Overall", "bg-primary/8 border-primary/25"],
] as const

function MatchAssessmentDialog({
  player,
  matchId,
  existingAssessment,
  onClose,
}: {
  player: { id: string; firstName: string; lastName: string }
  matchId: string
  existingAssessment?: MatchPlayerAssessment
  onClose: () => void
}) {
  const addAssessment = useAddMatchPlayerAssessment(matchId)
  const [ratings, setRatings] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {}
    if (existingAssessment) {
      for (const [key] of RATING_FIELDS) {
        const raw = existingAssessment[key]
        if (raw != null) initial[key] = Number(raw)
      }
    }
    return initial
  })
  const [remarks, setRemarks] = useState(existingAssessment?.remarks ?? "")
  const [serverError, setServerError] = useState<string | null>(null)

  const onSubmit = async () => {
    setServerError(null)
    if (Object.keys(ratings).length === 0) {
      setServerError("Rate at least one dimension")
      return
    }
    try {
      await addAssessment.mutateAsync({ playerId: player.id, ...ratings, remarks: remarks || undefined })
      onClose()
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : "Could not save rating.")
    }
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>
          Rate {player.firstName} {player.lastName}
        </DialogTitle>
        <DialogDescription>
          {existingAssessment
            ? "This player has already been rated for this match. Update the ratings below to override them."
            : "Rate each dimension out of 5 based on how they played this match."}
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-2">
        {existingAssessment ? (
          <div className="flex items-center gap-2 rounded-lg border border-info/25 bg-info/10 px-3 py-2 text-sm text-info">
            <Info className="size-4 shrink-0" aria-hidden />
            Already rated — saving will overwrite the previous ratings.
          </div>
        ) : null}
        {RATING_FIELDS.map(([key, label, colorClass]) => (
          <div key={key} className={`flex items-center justify-between gap-3 rounded-lg border p-2.5 ${colorClass}`}>
            <span className="text-sm font-medium">{label}</span>
            <RatingInput
              scale="SCALE_1_5"
              value={ratings[key]}
              onChange={(value) => setRatings((prev) => ({ ...prev, [key]: value }))}
            />
          </div>
        ))}
        <div className="space-y-1.5">
          <Label>Remarks</Label>
          <Textarea rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
        </div>
        {serverError ? <p className="text-sm text-destructive">{serverError}</p> : null}
        <DialogFooter>
          <Button onClick={() => void onSubmit()} disabled={addAssessment.isPending}>
            {addAssessment.isPending ? "Saving…" : existingAssessment ? "Update rating" : "Save rating"}
          </Button>
        </DialogFooter>
      </div>
    </DialogContent>
  )
}

export function MatchDetailPage({ navItems, backTo }: { navItems: NavItem[]; backTo: string }) {
  const { matchId } = useParams<{ matchId: string }>()
  const navigate = useNavigate()
  const { data: match, isLoading, isError, refetch } = useMatch(matchId)
  const setParticipations = useSetParticipations(matchId ?? "")
  const updateMatch = useUpdateMatch(matchId ?? "")
  const [draft, setDraft] = useState<Record<string, { isStarting: boolean; positionPlayed?: string }>>({})
  const [ratingPlayer, setRatingPlayer] = useState<MatchWithRoster["roster"][number] | null>(null)
  const [homeScore, setHomeScore] = useState("")
  const [awayScore, setAwayScore] = useState("")
  const [actionError, setActionError] = useState<string | null>(null)

  const runAction = async (action: () => Promise<unknown>) => {
    setActionError(null)
    try {
      await action()
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Action failed.")
    }
  }

  const isStartingFor = (playerId: string) =>
    draft[playerId]?.isStarting ?? match?.participations.find((p) => p.playerId === playerId)?.isStarting ?? false

  const onSaveSquad = async () => {
    const records = Object.entries(draft).map(([playerId, v]) => ({ playerId, isStarting: v.isStarting }))
    if (records.length === 0) return
    await runAction(async () => {
      await setParticipations.mutateAsync(records)
      setDraft({})
    })
  }

  const onSaveResult = () =>
    runAction(() =>
      updateMatch.mutateAsync({
        status: "COMPLETED",
        homeScore: homeScore ? Number(homeScore) : undefined,
        awayScore: awayScore ? Number(awayScore) : undefined,
      }),
    )

  return (
    <DashboardLayout title="Matches" navItems={navItems}>
      <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate(backTo)}>
        <ArrowLeft /> Back to matches
      </Button>

      {isLoading ? (
        <LoadingState rows={6} />
      ) : isError || !match ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-chart-4/10 text-chart-4">
                  <Trophy className="size-4.5" />
                </div>
                <div>
                  <CardTitle className="text-base">
                    {match.team.name} vs {match.opponent.name}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">{formatDate(match.matchDate)}</p>
                </div>
              </div>
              <StatusBadge status={match.status} />
            </CardHeader>
            <CardContent className="space-y-3">
              {actionError ? <p className="text-sm text-destructive">{actionError}</p> : null}
              {match.status === "SCHEDULED" ? (
                <div className="flex items-end gap-2">
                  <div className="space-y-1.5">
                    <Label>Home score</Label>
                    <Input
                      type="number"
                      min={0}
                      className="w-24"
                      value={homeScore}
                      onChange={(e) => setHomeScore(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Away score</Label>
                    <Input
                      type="number"
                      min={0}
                      className="w-24"
                      value={awayScore}
                      onChange={(e) => setAwayScore(e.target.value)}
                    />
                  </div>
                  <Button variant="outline" onClick={() => void onSaveResult()} disabled={updateMatch.isPending}>
                    Mark completed
                  </Button>
                </div>
              ) : (
                <p className="text-sm">
                  Result: {match.homeScore ?? "–"} : {match.awayScore ?? "–"}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center gap-3 space-y-0">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-chart-2/10 text-chart-2">
                <Users className="size-4.5" />
              </div>
              <div>
                <CardTitle className="text-base">Squad</CardTitle>
                <CardDescription>Mark who's starting or on the bench, then rate players after the match.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {match.roster.length === 0 ? (
                <p className="text-sm text-muted-foreground">No active players are assigned to this team yet.</p>
              ) : (
                <>
                  {match.roster.map((player) => {
                    const existingAssessment = match.matchPlayerAssessments.find((a) => a.playerId === player.id)
                    return (
                      <div
                        key={player.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {player.firstName} {player.lastName}
                          </span>
                          {existingAssessment ? (
                            <Badge variant="success">
                              <Check /> Rated
                            </Badge>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-2">
                          <Select
                            className="w-32"
                            value={isStartingFor(player.id) ? "starting" : "bench"}
                            onChange={(e) =>
                              setDraft((prev) => ({
                                ...prev,
                                [player.id]: { isStarting: e.target.value === "starting" },
                              }))
                            }
                          >
                            <option value="bench">Bench</option>
                            <option value="starting">Starting XI</option>
                          </Select>
                          <Button variant="outline" size="sm" onClick={() => setRatingPlayer(player)}>
                            <Star /> {existingAssessment ? "Edit rating" : "Rate"}
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                  <Button
                    disabled={Object.keys(draft).length === 0 || setParticipations.isPending}
                    onClick={() => void onSaveSquad()}
                  >
                    {setParticipations.isPending ? "Saving…" : "Save squad"}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <Dialog open={!!ratingPlayer} onOpenChange={(o) => !o && setRatingPlayer(null)}>
        {ratingPlayer && matchId ? (
          <MatchAssessmentDialog
            key={ratingPlayer.id}
            player={ratingPlayer}
            matchId={matchId}
            existingAssessment={match?.matchPlayerAssessments.find((a) => a.playerId === ratingPlayer.id)}
            onClose={() => setRatingPlayer(null)}
          />
        ) : null}
      </Dialog>
    </DashboardLayout>
  )
}
