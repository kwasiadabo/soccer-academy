import { formatDate } from "@/lib/date"
import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Cake, Search } from "lucide-react"

import { DashboardLayout } from "@/app/dashboard-layout"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { EmptyState } from "@/design-system/empty-state"
import { LoadingState } from "@/design-system/loading-state"
import { ErrorState } from "@/design-system/error-state"
import { RECEPTIONIST_NAV_ITEMS } from "@/features/dashboard-receptionist/receptionist-dashboard"
import { useUpcomingBirthdays } from "./players-api"

export function BirthdaysPage() {
  const navigate = useNavigate()
  const { data, isLoading, isError, refetch } = useUpcomingBirthdays(30)
  const [search, setSearch] = useState("")

  const filteredData = useMemo(() => {
    if (!data) return data
    const query = search.trim().toLowerCase()
    if (query === "") return data
    return data.filter((player) => `${player.firstName} ${player.lastName}`.toLowerCase().includes(query))
  }, [data, search])

  return (
    <DashboardLayout title="Birthdays" navItems={RECEPTIONIST_NAV_ITEMS}>
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Birthdays</CardTitle>
          <CardDescription>Active players with a birthday in the next 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          {!isLoading && !isError && data && data.length > 0 ? (
            <div className="mb-4 relative sm:max-w-xs">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name…"
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          ) : null}
          {isLoading ? (
            <LoadingState rows={3} />
          ) : isError ? (
            <ErrorState onRetry={() => void refetch()} />
          ) : !data || data.length === 0 ? (
            <EmptyState title="No upcoming birthdays" description="Nothing in the next 30 days." />
          ) : !filteredData || filteredData.length === 0 ? (
            <EmptyState title="No matching players" description="Try adjusting your search." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Player</TableHead>
                  <TableHead>Date of birth</TableHead>
                  <TableHead>Days until</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((player, index) => (
                  <TableRow
                    key={player.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/receptionist/players/${player.id}`)}
                  >
                    <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                    <TableCell className="font-medium">
                      {player.firstName} {player.lastName}
                    </TableCell>
                    <TableCell>{formatDate(player.dateOfBirth)}</TableCell>
                    <TableCell>
                      {player.daysUntil === 0 ? (
                        <Badge variant="success">
                          <Cake className="size-3" /> Today
                        </Badge>
                      ) : (
                        `${player.daysUntil} day${player.daysUntil === 1 ? "" : "s"}`
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  )
}
