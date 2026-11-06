import { Link } from "wouter";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
      <path d="M23 33 C 16 22, 24 6, 44 1 C 48 18, 40 32, 23 33 Z" fill="#9FAE96" />
      <path d="M11 47 C 1 36, 5 19, 22 13 C 30 29, 25 43, 11 47 Z" fill="#A99BBB" />
      <path d="M22 13 C 26 21, 27 28, 25 33 C 21 30, 20 22, 22 13 Z" fill="#E9E6EE" opacity="0.9" />
    </svg>
  );
}

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="logo" aria-label="ConsultaPsi Painel, início">
      <LogoMark />
      <span className="logo__word">
        Consulta<b>Psi</b>
      </span>
      <span className="logo__tag">Painel</span>
    </Link>
  );
}
