export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="DotMD"
    >
      {/* Violet rounded badge */}
      <rect width="28" height="28" rx="7" fill="#8b5cf6" />
      {/* Dot — centered vertically */}
      <circle cx="7.5" cy="14" r="2" fill="white" />
      {/* "md" — vertically centered */}
      <text
        x="19"
        y="14"
        textAnchor="middle"
        dominantBaseline="central"
        fill="white"
        fontFamily="system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"
        fontSize="11"
        fontWeight="800"
        letterSpacing="-0.4"
      >
        md
      </text>
    </svg>
  )
}
