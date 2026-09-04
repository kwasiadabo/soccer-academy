import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Search, X } from "lucide-react"
import { ROLE_NAMES } from "@soccer-academy/shared-types"

import { DashboardLayout, type NavItem } from "@/app/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { StatusBadge } from "@/design-system/status-badge"
import { EmptyState } from "@/design-system/empty-state"
import { LoadingState } from "@/design-system/loading-state"
import { ErrorState } from "@/design-system/error-state"
import { formatDate } from "@/lib/date"
import { useAuth } from "@/app/auth-context"
import { RECEPTIONIST_NAV_ITEMS } from "@/features/dashboard-receptionist/receptionist-dashboard"
import { HEAD_COACH_NAV_ITEMS } from "@/features/dashboard-head-coach/head-coach-dashboard"
import { useAllIssues, type IssueStatus } from "./issues-api"

const ALL_STATUSES: IssueStatus[] = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]

export function useStaffNavItems(): NavItem[] | undefined {
  const { hasRole } = useAuth()
  if (hasRole(ROLE_NAMES.ADMIN)) return undefined
  if (hasRole(ROLE_NAMES.HEAD_COACH)) return HEAD_COACH_NAV_ITEMS
  if (hasRole(ROLE_NAMES.RECEPTIONIST)) return RECEPTIONIST_NAV_ITEMS
  return undefined
}

export function StaffIssuesPage() {
  const navigate = useNavigate()
  const navItems = useStaffNavItems()
  const { data, isLoading, isError, refetch } = useAllIssues()

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")

  const hasActiveFilters = search.trim() !== "" || statusFilter !== ""
  const clearFilters = () => {
    setSearch("")
    setStatusFilter("")
  }

  const filteredData = useMemo(() => {
    if (!data) return data
    const query = search.trim().toLowerCase()
    return data.filter((issue) => {
      const matchesSearch =
        query === "" ||
        issue.subject.toLowerCase().includes(query) ||
        issue.description.toLowerCase().includes(query)
      const matchesStatus = statusFilter === "" || issue.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [data, search, statusFilter])

  return (
    <DashboardLayout title="Issues" navItems={navItems}>
      <Card>
        <CardHeader>
          <CardTitle>Issues</CardTitle>
          <CardDescription>Concerns logged by parents, awaiting or under review</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by subject or description…"
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select
              className="sm:w-40"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by status"
            >
              <option value="">All statuses</option>
              {ALL_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status.charAt(0) + status.slice(1).toLowerCase().replace("_", " ")}
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
            <LoadingState rows={4} />
          ) : isError ? (
            <ErrorState onRetry={() => void refetch()} />
          ) : !data || data.length === 0 ? (
            <EmptyState title="No issues" description="Nothing has been logged by parents yet." />
          ) : !filteredData || filteredData.length === 0 ? (
            <EmptyState title="No matching issues" description="Try adjusting your search or filters." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Guardian</TableHead>
                  <TableHead>Replies</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((issue) => (
                  <TableRow
                    key={issue.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/issues/${issue.id}`)}
                  >
                    <TableCell className="font-medium">{issue.subject}</TableCell>
                    <TableCell>
                      {issue.guardian.firstName} {issue.guardian.lastName}
                    </TableCell>
                    <TableCell className="tabular-nums">{issue._count.messages}</TableCell>
                    <TableCell>{formatDate(issue.updatedAt)}</TableCell>
                    <TableCell>
                      <StatusBadge status={issue.status} />
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
