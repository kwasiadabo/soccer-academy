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

// Returns the exact root domain this hostname matches (i.e. the bare
// marketing/platform domain, not any specific academy's own subdomain of
// it). Used to recognize when a restored session (see auth-context.tsx)
// needs to be handed off to a different origin rather than rendered here —
// scoped to only the platform's own known roots so navigating to some other
// specific academy's subdomain is never second-guessed this way.
export function getBareRootHost(): string | null {
  const hostname = window.location.hostname
  return ROOT_HOSTS.find((root) => hostname === root) ?? null
}

// Builds the URL for a specific academy's own subdomain, preserving the
// current protocol/port (so this also works for *.lvh.me:5173 in local
// dev). Returns null when the current host isn't one of the platform's own
// root domains — there's no subdomain pattern to build against for a custom
// domain, or plain `localhost`.
export function buildAcademyUrl(slug: string): string | null {
  const root = getBareRootHost()
  if (!root) return null
  const { protocol, port } = window.location
  return `${protocol}//${slug}.${root}${port ? `:${port}` : ""}/`
}
