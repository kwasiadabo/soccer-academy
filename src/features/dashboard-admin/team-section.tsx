import { useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useQueryClient } from "@tanstack/react-query"
import { Plus, Search, UserPlus, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import {
  Dialog,
  DialogTrigger,
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
import { useCoaches, useAddCoachAssignment } from "@/features/coaches/coaches-api"
import { useAgeCategories, useCreateTeam, useSeasons, useTeams, type Team } from "./academy-config-api"

const QUERY_KEY_TEAMS = ["academy-config", "teams"]

function AssignCoachDialog({ team }: { team: Team }) {
  const { data: coaches } = useCoaches()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [coachId, setCoachId] = useState("")
  const [role, setRole] = useState<"PRIMARY" | "ASSISTANT">("PRIMARY")
  const [serverError, setServerError] = useState<string | null>(null)
  const addAssignment = useAddCoachAssignment(coachId)

  const activeCoaches = (coaches ?? []).filter((c) => c.isActive)

  const onOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) {
      setCoachId("")
      setRole("PRIMARY")
      setServerError(null)
    }
  }

  const onSubmit = async () => {
    if (!coachId) {
      setServerError("Select a coach")
      return
    }
    setServerError(null)
    try {
      await addAssignment.mutateAsync({ teamId: team.id, role })
      await queryClient.invalidateQueries({ queryKey: QUERY_KEY_TEAMS })
      onOpenChange(false)
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : "Could not assign coach.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <UserPlus /> Assign coach
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign coach to {team.name}</DialogTitle>
          <DialogDescription>Pick a coach and their role on this team.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="assign-coach">Coach</Label>
            <Select id="assign-coach" value={coachId} onChange={(e) => setCoachId(e.target.value)}>
              <option value="">Select a coach</option>
              {activeCoaches.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.firstName} {c.lastName}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="assign-role">Role</Label>
            <Select id="assign-role" value={role} onChange={(e) => setRole(e.target.value as "PRIMARY" | "ASSISTANT")}>
              <option value="PRIMARY">Primary</option>
              <option value="ASSISTANT">Assistant</option>
            </Select>
          </div>
          {serverError ? <p className="text-sm text-destructive">{serverError}</p> : null}
          <DialogFooter>
            <Button onClick={() => void onSubmit()} disabled={addAssignment.isPending}>
              {addAssignment.isPending ? "Assigning…" : "Assign"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}

const schema = z.object({
  name: z.string().min(2, "Name is required"),
  ageCategoryId: z.string().min(1, "Select an age category"),
  seasonId: z.string().min(1, "Select a season"),
})

type FormValues = z.infer<typeof schema>

export function TeamSection() {
  const { data, isLoading, isError, refetch } = useTeams()
  const { data: ageCategories } = useAgeCategories()
  const { data: seasons } = useSeasons()
  const createTeam = useCreateTeam()
  const [open, setOpen] = useState(false)

  const [search, setSearch] = useState("")
  const [ageCategoryFilter, setAgeCategoryFilter] = useState("")
  const [seasonFilter, setSeasonFilter] = useState("")

  const hasActiveFilters = search.trim() !== "" || ageCategoryFilter !== "" || seasonFilter !== ""
  const clearFilters = () => {
    setSearch("")
    setAgeCategoryFilter("")
    setSeasonFilter("")
  }

  const filteredData = useMemo(() => {
    if (!data) return data
    const query = search.trim().toLowerCase()
    return data.filter((team) => {
      const matchesSearch = query === "" || team.name.toLowerCase().includes(query)
      const matchesAgeCategory = ageCategoryFilter === "" || team.ageCategory.id === ageCategoryFilter
      const matchesSeason = seasonFilter === "" || team.season.id === seasonFilter
      return matchesSearch && matchesAgeCategory && matchesSeason
    })
  }, [data, search, ageCategoryFilter, seasonFilter])

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const canCreate = !!ageCategories?.length && !!seasons?.length

  const onSubmit = async (values: FormValues) => {
    await createTeam.mutateAsync(values)
    reset()
    setOpen(false)
  }

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
        <div>
          <CardTitle>Teams</CardTitle>
          <CardDescription>Squads within an age category and season</CardDescription>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" disabled={!canCreate}>
              <Plus /> New team
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create team</DialogTitle>
              <DialogDescription>Assign a team to an age category and season.</DialogDescription>
            </DialogHeader>
            <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="team-name">Name</Label>
                <Input id="team-name" placeholder="U12 Eagles" {...register("name")} />
                {errors.name ? <p className="text-xs text-destructive">{errors.name.message}</p> : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="team-age-category">Age category</Label>
                <Select id="team-age-category" defaultValue="" {...register("ageCategoryId")}>
                  <option value="" disabled>
                    Select an age category
                  </option>
                  {ageCategories?.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </Select>
                {errors.ageCategoryId ? (
                  <p className="text-xs text-destructive">{errors.ageCategoryId.message}</p>
                ) : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="team-season">Season</Label>
                <Select id="team-season" defaultValue="" {...register("seasonId")}>
                  <option value="" disabled>
                    Select a season
                  </option>
                  {seasons?.map((season) => (
                    <option key={season.id} value={season.id}>
                      {season.name}
                    </option>
                  ))}
                </Select>
                {errors.seasonId ? (
                  <p className="text-xs text-destructive">{errors.seasonId.message}</p>
                ) : null}
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Creating…" : "Create team"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name…"
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select
            className="sm:w-48"
            value={ageCategoryFilter}
            onChange={(e) => setAgeCategoryFilter(e.target.value)}
            aria-label="Filter by age category"
          >
            <option value="">All age categories</option>
            {ageCategories?.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
          <Select
            className="sm:w-44"
            value={seasonFilter}
            onChange={(e) => setSeasonFilter(e.target.value)}
            aria-label="Filter by season"
          >
            <option value="">All seasons</option>
            {seasons?.map((season) => (
              <option key={season.id} value={season.id}>
                {season.name}
              </option>
            ))}
          </Select>
          {hasActiveFilters ? (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X /> Clear
            </Button>
          ) : null}
        </div>

        {isLoading ? (
          <LoadingState rows={3} />
        ) : isError ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : !data || data.length === 0 ? (
          <EmptyState
            title="No teams yet"
            description={
              canCreate
                ? "Create a team to start assigning players and coaches."
                : "Create at least one age category and season before adding a team."
            }
          />
        ) : !filteredData || filteredData.length === 0 ? (
          <EmptyState title="No matching teams" description="Try adjusting your search or filters." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Age category</TableHead>
                <TableHead>Season</TableHead>
                <TableHead>Assigned coaches</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((team, index) => (
                <TableRow key={team.id}>
                  <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                  <TableCell className="font-medium">{team.name}</TableCell>
                  <TableCell>{team.ageCategory.name}</TableCell>
                  <TableCell>{team.season.name}</TableCell>
                  <TableCell>
                    {team.coachAssignments.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {team.coachAssignments.map((a) => (
                          <Badge key={a.id} variant={a.role === "PRIMARY" ? "default" : "outline"}>
                            {a.coach.firstName} {a.coach.lastName}
                            {a.role === "ASSISTANT" ? " (Assistant)" : ""}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Unassigned</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <AssignCoachDialog team={team} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
