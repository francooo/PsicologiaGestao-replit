// Decorative foliage for app pages (same "acolhimento" strokes as the login background)

export function LeafDecor() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Top-right: soft blobs + plant stroke */}
      <svg className="absolute -right-16 -top-24 h-[420px] w-[420px] opacity-90" viewBox="0 0 440 440">
        <path
          d="M140 0 H440 V300 C 400 330, 340 320, 290 270 C 230 210, 170 160, 150 90 C 142 60, 140 30, 140 0 Z"
          fill="#E6E0EE"
          opacity="0.7"
        />
        <path d="M60 0 C 120 40, 150 90, 170 150 C 185 200, 200 240, 230 270" stroke="#9AA08F" strokeWidth="2" fill="none" />
        <path d="M170 150 C 200 110, 250 90, 300 92 C 280 140, 230 160, 170 150 Z" stroke="#7E8A77" strokeWidth="2" fill="#DCE2D3" fillOpacity="0.5" />
        <path d="M150 90 C 120 60, 110 30, 118 0" stroke="#7E8A77" strokeWidth="2" fill="none" />
      </svg>

      {/* Bottom-left: small leaf strokes */}
      <svg className="absolute -bottom-6 left-0 h-[200px] w-[200px] opacity-80" viewBox="0 0 200 200">
        <g stroke="#9AA08F" strokeWidth="2" fill="none" strokeLinecap="round">
          <path d="M40 200 C 50 150, 70 110, 100 80" />
          <path d="M70 130 C 40 110, 25 80, 28 50 C 55 70, 70 100, 70 130 Z" />
          <path d="M85 105 C 95 70, 120 50, 150 45 C 140 80, 115 100, 85 105 Z" />
        </g>
      </svg>
    </div>
  );
}
