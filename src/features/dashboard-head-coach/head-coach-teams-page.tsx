import { useState } from "react"
import { ArrowRightLeft, Search, Users, X } from "lucide-react"

import { DashboardLayout } from "@/app/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { EmptyState } from "@/design-system/empty-state"
import { LoadingState } from "@/design-system/loading-state"
import { ErrorState } from "@/design-system/error-state"
import { ApiError } from "@/lib/api-client"
import { PlayerPhoto } from "@/features/players/player-photo"
import { usePlayers, useUpdatePlayerTeamAssignment, type Player } from "@/features/players/players-api"
import { useTrainingGroups } from "@/features/dashboard-admin/academy-config-api"
import { useTrainingTeams } from "@/features/training/training-api"
import { TeamSection } from "@/features/dashboard-admin/team-section"
import { HEAD_COACH_NAV_ITEMS } from "./head-coach-dashboard"

function ReassignPlayerDialog({ player, onClose }: { player: Player; onClose: () => void }) {
  const { data: teams } = useTrainingTeams()
  const { data: trainingGroups } = useTrainingGroups()
  const updateAssignment = useUpdatePlayerTeamAssignment(player.id)
  const [teamId, setTeamId] = useState(player.team?.id ?? "")
  const [trainingGroupId, setTrainingGroupId] = useState(player.trainingGroup?.id ?? "")
  const [serverError, setServerError] = useState<string | null>(null)

  const groupsForTeam = (trainingGroups ?? []).filter((g) => !teamId || g.teamId === teamId)

  const onTeamChange = (value: string) => {
    setTeamId(value)
    // A training group belongs to exactly one team — clear it if it no longer matches.
    if (trainingGroupId && !(trainingGroups ?? []).some((g) => g.id === trainingGroupId && g.teamId === value)) {
      setTrainingGroupId("")
    }
  }

  const save = async (nextTeamId: string | null, nextTrainingGroupId: string | null) => {
    setServerError(null)
    try {
      await updateAssignment.mutateAsync({ teamId: nextTeamId, trainingGroupId: nextTrainingGroupId })
      onClose()
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : "Could not update team assignment.")
    }
  }

  return (
    <DialogContent>
      <DialogHeader>
        <div className="mb-1 flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <ArrowRightLeft className="size-4.5" />
        </div>
        <DialogTitle>
          Reassign {player.firstName} {player.lastName}
        </DialogTitle>
        <DialogDescription>Move this player to a different team, or remove them from their current one.</DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="reassign-team">Team</Label>
          <Select id="reassign-team" value={teamId} onChange={(e) => onTeamChange(e.target.value)}>
            <option value="">No team</option>
            {teams?.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="reassign-group">Training group</Label>
          <Select id="reassign-group" value={trainingGroupId} onChange={(e) => setTrainingGroupId(e.target.value)}>
            <option value="">No training group</option>
            {groupsForTeam.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </Select>
        </div>
        {serverError ? <p className="text-sm text-destructive">{serverError}</p> : null}
        <DialogFooter className="sm:justify-between">
          <Button
            type="button"
            variant="outline"
            disabled={updateAssignment.isPending || (!player.team && !player.trainingGroup)}
            onClick={() => void save(null, null)}
          >
            Remove from team
          </Button>
          <Button
            type="button"
            disabled={updateAssignment.isPending}
            onClick={() => void save(teamId || null, trainingGroupId || null)}
          >
            {updateAssignment.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </div>
    </DialogContent>
  )
}

function PlayerRosterSection() {
  const [teamId, setTeamId] = useState("")
  const [search, setSearch] = useState("")
  const [reassigningPlayer, setReassigningPlayer] = useState<Player | null>(null)

  const hasActiveFilters = teamId !== "" || search.trim() !== ""
  const clearFilters = () => {
    setTeamId("")
    setSearch("")
  }

  const { data: teams } = useTrainingTeams()
  const {
    data: players,
    isLoading,
    isError,
    refetch,
  } = usePlayers({ status: "ACTIVE", teamId: teamId || undefined, search: search || undefined })

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-3 space-y-0">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-chart-2/10 text-chart-2">
          <Users className="size-4.5" />
        </div>
        <div>
          <CardTitle className="text-base">Players</CardTitle>
          <CardDescription>Reassign a player to a different team, or remove them from their current one.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <Select className="w-full sm:w-56" value={teamId} onChange={(e) => setTeamId(e.target.value)}>
            <option value="">All teams</option>
            {teams?.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search player by name"
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {hasActiveFilters ? (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X /> Clear
            </Button>
          ) : null}
        </div>

        {isLoading ? (
          <LoadingState rows={4} />
        ) : isError ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : !players || players.length === 0 ? (
          hasActiveFilters ? (
            <EmptyState title="No matching players" description="Try adjusting your search or filters." />
          ) : (
            <EmptyState title="No players found" description="Try a different team or search." />
          )
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Player</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>Training group</TableHead>
                <TableHead>Player ID</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {players.map((p, index) => (
                <TableRow key={p.id}>
                  <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <PlayerPhoto playerId={p.id} photoDocumentId={p.photoDocumentId} size={40} />
                      <span className="font-medium">
                        {p.firstName} {p.lastName}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{p.team?.name ?? "—"}</TableCell>
                  <TableCell>{p.trainingGroup?.name ?? "—"}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{p.playerCode ?? "—"}</TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" onClick={() => setReassigningPlayer(p)}>
                      <ArrowRightLeft /> Reassign
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={!!reassigningPlayer} onOpenChange={(o) => !o && setReassigningPlayer(null)}>
        {reassigningPlayer ? (
          <ReassignPlayerDialog player={reassigningPlayer} onClose={() => setReassigningPlayer(null)} />
        ) : null}
      </Dialog>
    </Card>
  )
}

export function HeadCoachTeamsPage() {
  return (
    <DashboardLayout title="Teams" navItems={HEAD_COACH_NAV_ITEMS}>
      <div className="space-y-6">
        <TeamSection />
        <PlayerRosterSection />
      </div>
    </DashboardLayout>
  )
}
