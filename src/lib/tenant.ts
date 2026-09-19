const OVERRIDE_KEY = "sams-academy-slug-override"

// The platform's own root domains — a request to one of these bare hosts (no
// academy subdomain) is a platform/marketing page, never a tenant. Anything
// else is checked against these as `<slug>.<root>`. Listed explicitly rather
// than inferred from label count: sams.variablexsolutions.com is itself 3
// labels deep, so "more than 2 labels" incorrectly took "sams" as a slug.
const ROOT_HOSTS = ["sams.variablexsolutions.com", "lvh.me"]

// Set right after a self-serve signup on the root SAMS domain (see
// sams-signup-page.tsx) — there's no real subdomain to land on yet in local
// dev, so this stands in for one until the next real-subdomain visit clears it.
export function setAcademySlugOverride(slug: string) {
  try {
    sessionStorage.setItem(OVERRIDE_KEY, slug)
  } catch {
    // Best-effort convenience only.
  }
}

// Mirrors the backend's TenantResolutionMiddleware: the leftmost label of the
// hostname is the academy's slug (kapikids.sams.variablexsolutions.com ->
// "kapikids", and this also works against kapikids.lvh.me for local subdomain
// testing). A host that's a bare root domain (or has no parseable subdomain at
// all, e.g. plain localhost) checks the signup override above, then falls
// back to VITE_DEV_ACADEMY_SLUG.
export function getAcademySlug(): string {
  const hostname = window.location.hostname

  for (const root of ROOT_HOSTS) {
    if (hostname === root) break
    if (hostname.endsWith(`.${root}`)) {
      return hostname.slice(0, hostname.length - root.length - 1)
    }
  }

  try {
    const override = sessionStorage.getItem(OVERRIDE_KEY)
    if (override) return override
  } catch {
    // Fall through to the static defaults below.
  }
  return import.meta.env.VITE_DEV_ACADEMY_SLUG || "kapikids"
}
