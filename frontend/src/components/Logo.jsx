export default function Logo({ size = "md", className = "" }) {
  const sizeMap = {
    sm: 24,
    md: 40,
    lg: 64,
    xl: 96,
  };

  const px = sizeMap[size] || sizeMap.md;

  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Txilms"
    >
      <defs>
        <linearGradient id="txGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ff1a1a" />
          <stop offset="100%" stopColor="#b30000" />
        </linearGradient>
        <linearGradient id="txShine" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Background rounded square */}
      <rect x="4" y="4" width="112" height="112" rx="28" fill="url(#txGrad)" />
      <rect x="4" y="4" width="112" height="112" rx="28" fill="url(#txShine)" />

      {/* Clapper top bar */}
      <g>
        {/* Clapper hinge base */}
        <rect x="22" y="24" width="76" height="18" rx="4" fill="#fff" opacity="0.95" />
        {/* Clapper stripes */}
        <rect x="28" y="24" width="8" height="18" rx="1" fill="#1a1a2e" opacity="0.85"
              transform="skewX(-12)" />
        <rect x="46" y="24" width="8" height="18" rx="1" fill="#1a1a2e" opacity="0.85"
              transform="skewX(-12)" />
        <rect x="64" y="24" width="8" height="18" rx="1" fill="#1a1a2e" opacity="0.85"
              transform="skewX(-12)" />
        <rect x="82" y="24" width="8" height="18" rx="1" fill="#1a1a2e" opacity="0.85"
              transform="skewX(-12)" />
      </g>

      {/* Film frame / screen area */}
      <rect x="22" y="46" width="76" height="52" rx="6" fill="#fff" opacity="0.95" />

      {/* "T" letter inside the screen */}
      <text
        x="60"
        y="82"
        textAnchor="middle"
        fill="url(#txGrad)"
        fontFamily="Inter, system-ui, sans-serif"
        fontWeight="900"
        fontSize="42"
        letterSpacing="-2"
      >
        T
      </text>
    </svg>
  );
}
