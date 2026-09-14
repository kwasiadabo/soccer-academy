// The SAMS platform's own mark — distinct from AcademyLogo (which shows the
// signed-in-to academy's own logo/name). Used wherever the platform's own
// identity should show through: the SAMS landing page, the dark SAMS-themed
// chrome around the login screen, and the browser favicon.
//
// Concept: a goal net rendered as a lattice — the one piece of football
// equipment that's already, literally, a grid. It's the visual bridge between
// "football" and "an organized system," which is what SAMS actually does:
// turns a dozen scattered academy operations into one structured net. The
// dark dot settled into one cell is the ball in the net — a goal reached,
// doubling as a nod to hitting the academy's own management goals.
export function SamsMark({ className = "size-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} role="img" aria-label="SAMS">
      <rect width="40" height="40" rx="10" fill="#A3E635" />
      <g clipPath="url(#sams-mark-clip)">
        <g stroke="#0B0F0A" strokeWidth="1.5" opacity="0.85">
          <line x1="-6" y1="4" x2="34" y2="44" />
          <line x1="2" y1="-4" x2="42" y2="36" />
          <line x1="10" y1="-12" x2="50" y2="28" />
          <line x1="18" y1="-20" x2="58" y2="20" />
          <line x1="26" y1="-28" x2="66" y2="12" />
          <line x1="46" y1="4" x2="6" y2="44" />
          <line x1="38" y1="-4" x2="-2" y2="36" />
          <line x1="30" y1="-12" x2="-10" y2="28" />
          <line x1="22" y1="-20" x2="-18" y2="20" />
          <line x1="14" y1="-28" x2="-26" y2="12" />
        </g>
      </g>
      <circle cx="27.5" cy="25.5" r="3" fill="#0B0F0A" />
      <defs>
        <clipPath id="sams-mark-clip">
          <rect width="40" height="40" rx="10" />
        </clipPath>
      </defs>
    </svg>
  )
}
