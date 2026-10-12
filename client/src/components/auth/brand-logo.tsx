import { cn } from "@/lib/utils";

type BrandLogoProps = {
  size?: "md" | "lg";
  className?: string;
};

const sizes = {
  md: { icon: "h-11 w-11", text: "text-[34px]" },
  lg: { icon: "h-14 w-14", text: "text-[44px]" },
};

export function BrandLogo({ size = "md", className }: BrandLogoProps) {
  const s = sizes[size];

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <svg className={s.icon} viewBox="0 0 48 48" aria-hidden="true">
        {/* Back leaf (sage) */}
        <path
          d="M23 33 C 16 22, 24 6, 44 1 C 48 18, 40 32, 23 33 Z"
          fill="#9FAE96"
        />
        {/* Front leaf (lilac) */}
        <path
          d="M11 47 C 1 36, 5 19, 22 13 C 30 29, 25 43, 11 47 Z"
          fill="#A99BBB"
        />
        {/* Soft highlight where the leaves overlap */}
        <path
          d="M22 13 C 26 21, 27 28, 25 33 C 21 30, 20 22, 22 13 Z"
          fill="#E9E6EE"
          opacity="0.9"
        />
      </svg>
      <span className={cn("font-medium leading-none tracking-tight text-[#1F3347]", s.text)}>
        Consulta<span className="font-semibold text-[#2E729B]">Psi</span>
      </span>
    </div>
  );
}
