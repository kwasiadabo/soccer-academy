import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { AlertOctagon, Cake, CalendarCheck, CalendarDays, ClipboardList, CreditCard, FileBarChart, FileText, Images, LayoutDashboard, LifeBuoy, Package, Plus, Search, ShoppingBag, Tag, X } from "lucide-react"

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
import { cn } from "@/lib/utils"
import { usePlayers } from "@/features/players/players-api"

export const RECEPTIONIST_NAV_ITEMS: NavItem[] = [
  { to: "/receptionist/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/receptionist", label: "Players", icon: ClipboardList, end: true },
  { to: "/receptionist/birthdays", label: "Birthdays", icon: Cake },
  { to: "/receptionist/training-sessions", label: "Training Attendance", icon: CalendarCheck },
  { to: "/receptionist/finance", label: "Payments & Debtors", icon: CreditCard },
  { to: "/receptionist/finance/statement", label: "Player Statement", icon: FileText },
  { to: "/receptionist/finance/monthly-billing", label: "Monthly Billing", icon: CalendarDays },
  { to: "/receptionist/finance/report", label: "Payments Report", icon: FileBarChart },
  { to: "/receptionist/finance/aging", label: "Owing Report", icon: AlertOctagon },
  { to: "/receptionist/finance/fee-types", label: "Fee Types", icon: Tag },
  { to: "/issues", label: "Issues", icon: LifeBuoy },
  { to: "/merchandise/orders", label: "Orders", icon: ShoppingBag },
  { to: "/merchandise/products", label: "Products", icon: Package },
  { to: "/gallery/manage", label: "Gallery", icon: Images },
]

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "DRAFT", label: "Draft" },
  { value: "SUBMITTED", label: "Submitted" },
  { value: "PENDING_REGISTRATION_PAYMENT", label: "Pending payment" },
  { value: "ACTIVE", label: "Active" },
  { value: "SUSPENDED", label: "Suspended" },
  { value: "WITHDRAWN", label: "Withdrawn" },
]

const QUICK_FILTERS = [
  { value: "", label: "All" },
  { value: "ACTIVE", label: "Active" },
  { value: "PENDING_REGISTRATION_PAYMENT", label: "Pending payment" },
]

export function ReceptionistDashboard() {
  const navigate = useNavigate()
  const [status, setStatus] = useState("")
  const [search, setSearch] = useState("")
  const { data, isLoading, isError, refetch } = usePlayers({ status: status || undefined, search: search || undefined })

  const hasActiveFilters = status !== "" || search.trim() !== ""
  const clearFilters = () => {
    setStatus("")
    setSearch("")
  }

  return (
    <DashboardLayout title="Receptionist Dashboard" navItems={RECEPTIONIST_NAV_ITEMS}>
      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Player Registrations</CardTitle>
            <CardDescription>Register new players and track their registration status</CardDescription>
          </div>
          <Button size="sm" onClick={() => navigate("/receptionist/players/new")}>
            <Plus /> New registration
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {QUICK_FILTERS.map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => setStatus(filter.value)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  status === filter.value
                    ? "border-primary bg-primary/15 text-accent-foreground"
                    : "border-border text-muted-foreground hover:bg-muted",
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name or player ID"
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={status} onChange={(e) => setStatus(e.target.value)} className="sm:w-56">
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
          </div>

          {isLoading ? (
            <LoadingState rows={4} />
          ) : isError ? (
            <ErrorState onRetry={() => void refetch()} />
          ) : !data || data.length === 0 ? (
            hasActiveFilters ? (
              <EmptyState title="No matching players" description="Try adjusting your search or filters." />
            ) : (
              <EmptyState
                title="No player registrations yet"
                description="Start a new registration to add the academy's first player."
                action={
                  <Button size="sm" onClick={() => navigate("/receptionist/players/new")}>
                    <Plus /> New registration
                  </Button>
                }
              />
            )
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Player ID</TableHead>
                  <TableHead>Age category</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((player, index) => (
                  <TableRow
                    key={player.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/receptionist/players/${player.id}`)}
                  >
                    <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                    <TableCell className="font-medium">
                      {player.firstName} {player.lastName}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{player.playerCode ?? "—"}</TableCell>
                    <TableCell>{player.ageCategory?.name ?? "—"}</TableCell>
                    <TableCell>
                      <StatusBadge status={player.status} />
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
