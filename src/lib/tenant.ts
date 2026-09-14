const OVERRIDE_KEY = "sams-academy-slug-override"

// Set right after a self-serve signup on the root SAMS domain (see
// sams-signup-flow.tsx) — there's no real subdomain to land on yet in local
// dev, so this stands in for one until the next real-subdomain visit clears it.
export function setAcademySlugOverride(slug: string) {
  try {
    sessionStorage.setItem(OVERRIDE_KEY, slug)
  } catch {
    // Best-effort convenience only.
  }
}

// Mirrors the backend's TenantResolutionMiddleware: the leftmost label of the
// hostname is the academy's slug (kapikids.sams.app -> "kapikids", and this
// also works against kapikids.lvh.me for local subdomain testing). A host
// with no parseable subdomain (plain localhost, an apex domain) checks the
// signup override above, then falls back to VITE_DEV_ACADEMY_SLUG.
export function getAcademySlug(): string {
  const labels = window.location.hostname.split(".")
  if (labels.length > 2) {
    return labels[0]
  }
  try {
    const override = sessionStorage.getItem(OVERRIDE_KEY)
    if (override) return override
  } catch {
    // Fall through to the static defaults below.
  }
  return import.meta.env.VITE_DEV_ACADEMY_SLUG || "kapikids"
}
