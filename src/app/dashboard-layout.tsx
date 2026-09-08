import { useEffect, useMemo, useState } from "react"
import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { NavLink, useLocation } from "react-router-dom"
import { ROLE_NAMES } from "@/lib/shared-types"
import {
  AlertOctagon,
  Award,
  Cake,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  CreditCard,
  Dumbbell,
  FileBarChart,
  FileText,
  Heart,
  IdCard,
  Images,
  KeyRound,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Menu,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Shield,
  ShoppingBag,
  Star,
  Tag,
  Trophy,
  Users,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { AcademyLogo } from "@/design-system/academy-logo"
import { PageTransition } from "@/design-system/page-transition"
import { cn } from "@/lib/utils"
import { usePendingOrderCount } from "@/features/merchandise/merchandise-api"
import { useAuth } from "./auth-context"

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
  section?: string
  badge?: number
}

interface DashboardLayoutProps {
  title: string
  children: ReactNode
  navItems?: NavItem[]
}

const ADMIN_NAV_ITEMS: NavItem[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true, section: "Admin" },
  { to: "/admin/staff", label: "Staff", icon: Users, section: "Admin" },
  { to: "/admin/users", label: "Users", icon: KeyRound, section: "Admin" },
  { to: "/issues", label: "Issues", icon: LifeBuoy, section: "Admin" },
  { to: "/merchandise/orders", label: "Orders", icon: ShoppingBag, section: "Admin" },
  { to: "/merchandise/products", label: "Products", icon: Package, section: "Admin" },
  { to: "/gallery/manage", label: "Gallery", icon: Images, section: "Admin" },

  { to: "/receptionist", label: "Players", icon: ClipboardList, end: true, section: "Receptionist" },
  { to: "/receptionist/birthdays", label: "Birthdays", icon: Cake, section: "Receptionist" },
  { to: "/receptionist/finance", label: "Payments & Debtors", icon: CreditCard, section: "Receptionist" },
  { to: "/receptionist/finance/statement", label: "Player Statement", icon: FileText, section: "Receptionist" },
  { to: "/receptionist/finance/monthly-billing", label: "Monthly Billing", icon: CalendarDays, section: "Receptionist" },
  { to: "/receptionist/finance/report", label: "Payments Report", icon: FileBarChart, section: "Receptionist" },
  { to: "/receptionist/finance/aging", label: "Owing Report", icon: AlertOctagon, section: "Receptionist" },
  { to: "/receptionist/finance/fee-types", label: "Fee Types", icon: Tag, section: "Receptionist" },

  { to: "/head-coach", label: "Dashboard", icon: Award, end: true, section: "Head Coach" },
  { to: "/head-coach/approvals", label: "Approvals", icon: CheckCircle2, section: "Head Coach" },
  { to: "/head-coach/players", label: "Players", icon: IdCard, section: "Head Coach" },
  { to: "/receptionist/finance", label: "Payments & Debtors", icon: CreditCard, section: "Head Coach" },
  { to: "/head-coach/teams", label: "Teams", icon: Shield, section: "Head Coach" },
  { to: "/head-coach/coaches", label: "Coaches", icon: Users, section: "Head Coach" },
  { to: "/head-coach/matches", label: "Matches", icon: Trophy, section: "Head Coach" },
  { to: "/head-coach/assessments", label: "Assessments", icon: ClipboardList, section: "Head Coach" },

  { to: "/coach", label: "Dashboard", icon: Dumbbell, end: true, section: "Coach" },
  { to: "/coach/training-plans", label: "Training Plans", icon: ClipboardList, section: "Coach" },
  { to: "/coach/training-sessions", label: "Attendance", icon: ClipboardCheck, section: "Coach" },
  { to: "/coach/assessments", label: "Assessments", icon: Star, section: "Coach" },
  { to: "/coach/player-marks", label: "Player Marks", icon: Award, section: "Coach" },
  { to: "/coach/matches", label: "Matches", icon: Trophy, section: "Coach" },

  { to: "/parent", label: "Parent Portal", icon: Heart, end: true, section: "Parent" },
]

interface NavGroup {
  section: string | undefined
  items: NavItem[]
}

function groupNavItems(items: NavItem[]): NavGroup[] {
  const groups: NavGroup[] = []
  for (const item of items) {
    const last = groups[groups.length - 1]
    if (last && last.section === item.section) {
      last.items.push(item)
    } else {
      groups.push({ section: item.section, items: [item] })
    }
  }
  return groups
}

function isItemActive(item: NavItem, pathname: string): boolean {
  return item.end ? pathname === item.to : pathname === item.to || pathname.startsWith(`${item.to}/`)
}

function SidebarNavLink({
  item,
  collapsed,
  onNavigate,
}: {
  item: NavItem
  collapsed: boolean
  onNavigate?: () => void
}) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          collapsed && "justify-center px-2",
          isActive
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-sidebar-foreground/65 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
        )
      }
    >
      <item.icon className="size-4 shrink-0" aria-hidden />
      {!collapsed ? (
        <span className="flex flex-1 items-center justify-between gap-2">
          {item.label}
          {item.badge ? (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground tabular-nums">
              {item.badge > 99 ? "99+" : item.badge}
            </span>
          ) : null}
        </span>
      ) : null}
    </NavLink>
  )
}

function SidebarNav({
  items,
  onNavigate,
  collapsed = false,
}: {
  items: NavItem[]
  onNavigate?: () => void
  collapsed?: boolean
}) {
  const location = useLocation()
  const groups = useMemo(() => groupNavItems(items), [items])

  const activeSections = useMemo(
    () =>
      new Set(
        groups
          .filter((g) => g.section && g.items.some((item) => isItemActive(item, location.pathname)))
          .map((g) => g.section as string),
      ),
    [groups, location.pathname],
  )

  const [openSections, setOpenSections] = useState<Set<string>>(() => new Set(activeSections))

  useEffect(() => {
    setOpenSections((prev) => {
      const next = new Set(prev)
      let changed = false
      for (const section of activeSections) {
        if (!next.has(section)) {
          next.add(section)
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [activeSections])

  const toggleSection = (section: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev)
      if (next.has(section)) next.delete(section)
      else next.add(section)
      return next
    })
  }

  return (
    <nav className="flex flex-col gap-1 p-3">
      {groups.map((group, index) => {
        if (collapsed || !group.section) {
          return (
            <div key={group.section ?? `ungrouped-${index}`} className="flex flex-col gap-1">
              {!collapsed && group.section ? (
                <p className="mt-3 mb-1 px-3 text-[11px] font-bold tracking-wider text-sidebar-foreground/40 uppercase first:mt-0">
                  {group.section}
                </p>
              ) : null}
              {group.items.map((item) => (
                <SidebarNavLink key={item.to} item={item} collapsed={collapsed} onNavigate={onNavigate} />
              ))}
            </div>
          )
        }

        const isOpen = openSections.has(group.section)
        return (
          <div key={group.section} className={cn(index > 0 && "mt-2")}>
            <button
              type="button"
              onClick={() => toggleSection(group.section as string)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-[11px] font-bold tracking-wider text-sidebar-foreground/40 uppercase transition-colors hover:text-sidebar-foreground/70"
            >
              {group.section}
              <ChevronRight className={cn("size-3.5 transition-transform", isOpen && "rotate-90")} aria-hidden />
            </button>
            {isOpen ? (
              <div className="mt-1 flex flex-col gap-1">
                {group.items.map((item) => (
                  <SidebarNavLink key={item.to} item={item} collapsed={collapsed} onNavigate={onNavigate} />
                ))}
              </div>
            ) : null}
          </div>
        )
      })}
    </nav>
  )
}

function SidebarBrand({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div
      className={cn(
        "flex h-16 items-center gap-2.5 border-b border-sidebar-border",
        collapsed ? "justify-center px-2" : "px-4",
      )}
    >
      <AcademyLogo className="size-9 shrink-0" chip />
      {!collapsed ? <span className="text-sm font-bold tracking-tight text-sidebar-foreground">Kapikids</span> : null}
    </div>
  )
}

function SidebarCollapseToggle({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  return (
    <div className={cn("flex border-b border-sidebar-border p-2", collapsed ? "justify-center" : "justify-end")}>
      <button
        type="button"
        onClick={onToggle}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="flex size-8 shrink-0 items-center justify-center rounded-lg text-sidebar-foreground/65 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
      >
        {collapsed ? (
          <PanelLeftOpen className="size-4 shrink-0" aria-hidden />
        ) : (
          <PanelLeftClose className="size-4 shrink-0" aria-hidden />
        )}
      </button>
    </div>
  )
}

function HeaderBar({
  title,
  onOpenMenu,
  showMenuButton,
}: {
  title: string
  onOpenMenu: () => void
  showMenuButton: boolean
}) {
  const { user, logout } = useAuth()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const onConfirmLogout = async () => {
    setLoggingOut(true)
    try {
      await logout()
    } finally {
      setLoggingOut(false)
      setConfirmOpen(false)
    }
  }

  return (
    <header className="border-b border-border bg-background">
      <div className="flex items-center justify-between px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          {showMenuButton ? (
            <Button
              variant="outline"
              size="icon"
              className="md:hidden"
              onClick={onOpenMenu}
              aria-label="Open menu"
            >
              <Menu className="size-4" aria-hidden />
            </Button>
          ) : null}
          <div>
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Kapikids Soccer Academy</p>
            <h1 className="text-xl font-bold tracking-tight">{title}</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden text-right text-sm sm:block">
            <p className="font-medium">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs text-muted-foreground">{user?.roles.join(", ")}</p>
          </div>
          <Button variant="outline" size="icon" onClick={() => setConfirmOpen(true)} aria-label="Log out">
            <LogOut className="size-4" aria-hidden />
          </Button>
        </div>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign out?</DialogTitle>
            <DialogDescription>You'll need to sign in again to access your dashboard.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={loggingOut}>
              Cancel
            </Button>
            <Button onClick={() => void onConfirmLogout()} disabled={loggingOut}>
              {loggingOut ? "Signing out…" : "Sign out"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  )
}

const SIDEBAR_COLLAPSED_KEY = "kapikids-sidebar-collapsed"

function getStoredSidebarCollapsed(): boolean {
  try {
    return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true"
  } catch {
    return false
  }
}

export function DashboardLayout({ title, children, navItems }: DashboardLayoutProps) {
  const { hasRole } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(getStoredSidebarCollapsed)
  const isAdmin = hasRole(ROLE_NAMES.ADMIN)
  // Admins always get the full aggregated nav, even on pages that hardcode a
  // role-specific navItems list (e.g. COACH_NAV_ITEMS) for non-admin viewers.
  const items = isAdmin ? ADMIN_NAV_ITEMS : navItems

  const showOrdersBadge = items?.some((item) => item.to === "/merchandise/orders") ?? false
  const { data: pendingOrders } = usePendingOrderCount(showOrdersBadge)
  const itemsWithBadges = items?.map((item) =>
    item.to === "/merchandise/orders" && pendingOrders ? { ...item, badge: pendingOrders } : item,
  )

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev
      try {
        window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next))
      } catch {
        // Per-viewer convenience only — fine to silently no-op if storage is unavailable.
      }
      return next
    })
  }

  if (!items) {
    return (
      <div className="min-h-screen bg-muted/30">
        <HeaderBar title={title} onOpenMenu={() => {}} showMenuButton={false} />
        <main className="mx-auto max-w-6xl px-6 py-8">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-muted/30">
      <aside
        className={cn(
          "hidden shrink-0 border-r border-sidebar-border bg-sidebar transition-[width] duration-200 md:flex md:flex-col",
          collapsed ? "w-16" : "w-60",
        )}
      >
        <SidebarBrand collapsed={collapsed} />
        <SidebarCollapseToggle collapsed={collapsed} onToggle={toggleCollapsed} />
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          <SidebarNav items={itemsWithBadges ?? items} collapsed={collapsed} />
        </div>
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-64 flex-col overflow-hidden bg-sidebar shadow-lg">
            <div className="flex h-16 items-center justify-between border-b border-sidebar-border pl-4 pr-2">
              <div className="flex items-center gap-2.5">
                <AcademyLogo className="size-9" chip />
                <span className="text-sm font-bold tracking-tight text-sidebar-foreground">Kapikids</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
              >
                <X className="size-4" aria-hidden />
              </Button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <SidebarNav items={itemsWithBadges ?? items} onNavigate={() => setMobileOpen(false)} />
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <HeaderBar title={title} onOpenMenu={() => setMobileOpen(true)} showMenuButton />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </div>
  )
}
