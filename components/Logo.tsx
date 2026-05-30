export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Contextual Labs"
    >
      <defs>
        <linearGradient id="cl-bg" x1="0" y1="0" x2="28" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#5b21b6" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
      </defs>
      {/* Rounded badge */}
      <rect width="28" height="28" rx="7" fill="url(#cl-bg)" />
      {/* Document lines — three rows of text */}
      <path
        d="M7 10.5h14M7 14h14M7 17.5h9"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeOpacity="0.95"
      />
      {/* Sparkle accent */}
      <circle cx="21.5" cy="7" r="3" fill="#c4b5fd" />
      <circle cx="21.5" cy="7" r="1.25" fill="white" />
    </svg>
  )
}
