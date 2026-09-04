import { useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Plus, Search, X } from "lucide-react"

import { Button } from "@/components/ui/button"
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
import { useCreateTrainingGroup, useTeams, useTrainingGroups } from "./academy-config-api"

const schema = z.object({
  name: z.string().min(2, "Name is required"),
  teamId: z.string().min(1, "Select a team"),
})

type FormValues = z.infer<typeof schema>

export function TrainingGroupSection() {
  const { data, isLoading, isError, refetch } = useTrainingGroups()
  const { data: teams } = useTeams()
  const createTrainingGroup = useCreateTrainingGroup()
  const [open, setOpen] = useState(false)

  const [search, setSearch] = useState("")
  const [teamFilter, setTeamFilter] = useState("")

  const hasActiveFilters = search.trim() !== "" || teamFilter !== ""
  const clearFilters = () => {
    setSearch("")
    setTeamFilter("")
  }

  const filteredData = useMemo(() => {
    if (!data) return data
    const query = search.trim().toLowerCase()
    return data.filter((group) => {
      const matchesSearch = query === "" || group.name.toLowerCase().includes(query)
      const matchesTeam = teamFilter === "" || group.team.id === teamFilter
      return matchesSearch && matchesTeam
    })
  }, [data, search, teamFilter])

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const canCreate = !!teams?.length

  const onSubmit = async (values: FormValues) => {
    await createTrainingGroup.mutateAsync(values)
    reset()
    setOpen(false)
  }

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
        <div>
          <CardTitle>Training Groups</CardTitle>
          <CardDescription>Smaller groups within a team for day-to-day training</CardDescription>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" disabled={!canCreate}>
              <Plus /> New group
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create training group</DialogTitle>
              <DialogDescription>Assign a training group to a team.</DialogDescription>
            </DialogHeader>
            <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="tg-name">Name</Label>
                <Input id="tg-name" placeholder="Tuesday/Thursday Group" {...register("name")} />
                {errors.name ? <p className="text-xs text-destructive">{errors.name.message}</p> : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tg-team">Team</Label>
                <Select id="tg-team" defaultValue="" {...register("teamId")}>
                  <option value="" disabled>
                    Select a team
                  </option>
                  {teams?.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </Select>
                {errors.teamId ? <p className="text-xs text-destructive">{errors.teamId.message}</p> : null}
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Creating…" : "Create group"}
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
            className="sm:w-44"
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
            aria-label="Filter by team"
          >
            <option value="">All teams</option>
            {teams?.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
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
            title="No training groups yet"
            description={canCreate ? "Create a training group within a team." : "Create a team first."}
          />
        ) : !filteredData || filteredData.length === 0 ? (
          <EmptyState title="No matching training groups" description="Try adjusting your search or filters." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Team</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((group, index) => (
                <TableRow key={group.id}>
                  <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                  <TableCell className="font-medium">{group.name}</TableCell>
                  <TableCell>{group.team.name}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
