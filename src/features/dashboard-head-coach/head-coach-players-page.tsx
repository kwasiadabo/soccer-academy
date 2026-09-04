import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { IdCard, Search, UserCog, X } from "lucide-react"

import { DashboardLayout } from "@/app/dashboard-layout"
import { Badge } from "@/components/ui/badge"
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
import { StatusBadge } from "@/design-system/status-badge"
import { formatCurrency } from "@/lib/currency"
import { ApiError } from "@/lib/api-client"
import { PlayerPhoto } from "@/features/players/player-photo"
import {
  usePlayers,
  useUpdatePlayerStatus,
  type Player,
  type PlayerSettableStatus,
} from "@/features/players/players-api"
import { useTrainingTeams } from "@/features/training/training-api"
import { useDebtors } from "@/features/finance/finance-api"
import { HEAD_COACH_NAV_ITEMS } from "./head-coach-dashboard"

function PlayerStatusDialog({ player, onClose }: { player: Player; onClose: () => void }) {
  const updateStatus = useUpdatePlayerStatus(player.id)
  const [status, setStatus] = useState<PlayerSettableStatus>(
    player.status === "SUSPENDED" || player.status === "WITHDRAWN" ? player.status : "ACTIVE",
  )
  const [serverError, setServerError] = useState<string | null>(null)

  const onSave = async () => {
    setServerError(null)
    try {
      await updateStatus.mutateAsync(status)
      onClose()
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : "Could not update status.")
    }
  }

  return (
    <DialogContent>
      <DialogHeader>
        <div className="mb-1 flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <UserCog className="size-4.5" />
        </div>
        <DialogTitle>
          {player.firstName} {player.lastName}'s status
        </DialogTitle>
        <DialogDescription>
          Suspend or withdraw this player, or reinstate them if they were previously suspended or withdrawn.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="player-status">Status</Label>
          <Select
            id="player-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as PlayerSettableStatus)}
          >
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="WITHDRAWN">Withdrawn</option>
          </Select>
        </div>
        {serverError ? <p className="text-sm text-destructive">{serverError}</p> : null}
        <DialogFooter>
          <Button type="button" disabled={updateStatus.isPending} onClick={() => void onSave()}>
            {updateStatus.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </div>
    </DialogContent>
  )
}

function FinancialStatusBadge({ totalOwed, hasOverdue }: { totalOwed: number | null; hasOverdue: boolean }) {
  if (totalOwed === null) {
    return <Badge variant="success">Paid up</Badge>
  }
  return (
    <Badge variant={hasOverdue ? "destructive" : "warning"}>
      {hasOverdue ? "Overdue" : "Owing"} {formatCurrency(totalOwed)}
    </Badge>
  )
}

const STATUS_EDITABLE = new Set(["ACTIVE", "SUSPENDED", "WITHDRAWN"])

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "ACTIVE", label: "Active" },
  { value: "SUSPENDED", label: "Suspended" },
  { value: "WITHDRAWN", label: "Withdrawn" },
]

export function HeadCoachPlayersPage() {
  const navigate = useNavigate()
  const [teamId, setTeamId] = useState("")
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [statusPlayer, setStatusPlayer] = useState<Player | null>(null)

  const hasActiveFilters = teamId !== "" || search.trim() !== "" || statusFilter !== ""
  const clearFilters = () => {
    setTeamId("")
    setSearch("")
    setStatusFilter("")
  }

  const { data: teams } = useTrainingTeams()
  const {
    data: players,
    isLoading,
    isError,
    refetch,
  } = usePlayers({ teamId: teamId || undefined, search: search || undefined, status: statusFilter || undefined })
  const { data: debtors, isLoading: debtorsLoading } = useDebtors()

  const debtByPlayerId = useMemo(() => {
    const map = new Map<string, { totalOwed: number; hasOverdue: boolean }>()
    for (const row of debtors ?? []) {
      map.set(row.player.id, { totalOwed: row.totalOwed, hasOverdue: row.hasOverdue })
    }
    return map
  }, [debtors])

  return (
    <DashboardLayout title="Players" navItems={HEAD_COACH_NAV_ITEMS}>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Filter</CardTitle>
            <CardDescription>Narrow the roster down to one team, or search by name.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
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
            <Select
              className="w-full sm:w-44"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by status"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            {hasActiveFilters ? (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X /> Clear
              </Button>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center gap-3 space-y-0">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <IdCard className="size-4.5" />
            </div>
            <div>
              <CardTitle className="text-base">Players</CardTitle>
              <CardDescription>Full roster with registration and payment status at a glance.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <LoadingState rows={5} />
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
                    <TableHead>Player ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Financial status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {players.map((p, index) => {
                    const debt = debtByPlayerId.get(p.id)
                    return (
                      <TableRow
                        key={p.id}
                        className="cursor-pointer"
                        onClick={() => navigate(`/head-coach/players/${p.id}/ratings`)}
                      >
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
                        <TableCell className="font-mono text-xs text-muted-foreground">{p.playerCode ?? "—"}</TableCell>
                        <TableCell>
                          <StatusBadge status={p.status} />
                        </TableCell>
                        <TableCell>
                          {debtorsLoading ? (
                            <span className="text-xs text-muted-foreground">Loading…</span>
                          ) : (
                            <FinancialStatusBadge
                              totalOwed={debt?.totalOwed ?? null}
                              hasOverdue={debt?.hasOverdue ?? false}
                            />
                          )}
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={!STATUS_EDITABLE.has(p.status)}
                            onClick={() => setStatusPlayer(p)}
                          >
                            <UserCog /> Status
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!statusPlayer} onOpenChange={(o) => !o && setStatusPlayer(null)}>
        {statusPlayer ? <PlayerStatusDialog player={statusPlayer} onClose={() => setStatusPlayer(null)} /> : null}
      </Dialog>
    </DashboardLayout>
  )
}
