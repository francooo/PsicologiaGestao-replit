// Decorative, non-interactive layer for the login screen ("acolhimento" mockup)

function SpacedPhrase({ lines, className }: { lines: string[]; className: string }) {
  return (
    <div className={className}>
      {lines.map((line) => (
        <p key={line} className="text-[11px] uppercase tracking-[0.45em] text-[#7B7F86] leading-6">
          {line}
        </p>
      ))}
      <div className="mt-4 h-px w-10 bg-[#9AA08F]" />
    </div>
  );
}

export function AuthBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Top-right lilac blob */}
      <svg
        className="absolute -right-24 -top-40 aspect-square h-[62vh] max-h-[560px] min-h-[320px]"
        viewBox="0 0 560 560"
      >
        <path
          d="M120 0 H560 V430 C 500 470, 410 450, 330 380 C 250 310, 150 230, 120 120 C 110 70, 112 30, 120 0 Z"
          fill="#D9D1E2"
        />
        <path
          d="M0 40 C 80 160, 220 200, 330 240 C 430 280, 500 330, 545 470"
          stroke="#D9C2AA"
          strokeWidth="2"
          fill="none"
        />
      </svg>

      {/* Bottom-left sage + sand blobs */}
      <svg
        className="absolute -bottom-10 -left-16 aspect-[760/620] h-[52vh] max-h-[620px] min-h-[300px]"
        viewBox="0 0 760 620"
      >
        <path
          d="M300 620 C 330 470, 470 400, 590 440 C 690 475, 730 560, 740 620 Z"
          fill="#EDE0D2"
        />
        <path
          d="M0 40 C 90 70, 140 160, 170 260 C 200 360, 230 400, 330 410 C 260 470, 250 560, 280 620 H0 Z"
          fill="#C9D0C0"
        />
        <path
          d="M0 260 C 160 300, 330 400, 360 520 C 370 570, 355 600, 330 620"
          stroke="#7E8A77"
          strokeWidth="2"
          fill="none"
        />
      </svg>

      {/* Right plant illustration (wide screens only) */}
      <svg
        className="absolute right-[2%] top-1/2 hidden aspect-[440/460] w-[340px] -translate-y-[42%] xl:block 2xl:right-[3%] 2xl:w-[440px]"
        viewBox="0 0 440 460"
      >
        <path
          d="M40 290 C 20 220, 60 160, 110 150 C 170 140, 200 190, 260 220 C 330 255, 360 320, 300 360 C 240 400, 90 400, 40 290 Z"
          fill="#CFC6D9"
          opacity="0.9"
        />
        <path
          d="M150 160 C 150 80, 210 10, 250 10 C 300 10, 320 90, 320 170 C 320 260, 280 330, 230 330 C 180 330, 150 250, 150 160 Z"
          fill="#B7C0A9"
          opacity="0.85"
        />
        <g stroke="#5F6F5C" strokeWidth="3" fill="none" strokeLinecap="round">
          {/* Stem */}
          <path d="M215 440 C 205 360, 210 300, 240 250 C 270 200, 300 150, 330 100" />
          {/* Large right leaf */}
          <path d="M268 190 C 300 120, 350 80, 410 70 C 390 140, 340 190, 268 190 Z" />
          {/* Left leaf */}
          <path d="M235 260 C 200 200, 170 150, 175 110 C 210 130, 240 190, 235 260 Z" />
          {/* Small inner leaf */}
          <path d="M248 238 C 230 190, 225 150, 235 120 C 255 150, 258 200, 248 238 Z" />
        </g>
      </svg>

      <SpacedPhrase
        lines={["Mais tempo", "para o que importa"]}
        className="absolute bottom-12 left-[4.5%] hidden lg:block"
      />
      <SpacedPhrase
        lines={["Organização", "também cuida"]}
        className="absolute bottom-[14%] right-[5%] hidden xl:block"
      />
    </div>
  );
}
