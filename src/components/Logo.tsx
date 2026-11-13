import Link from "next/link";

// Bildmarke: zwei ineinandergreifende Hälften bilden ein "H" – zwei Händler, ein Deal.
export function LogoMark({ size = 30, onDark = true }: { size?: number; onDark?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <path d="M4 6h14v13l12-9v12L18 31v11H4z" fill="#f2b705" />
      <path d="M44 42H30V29l-12 9V26l12-9V6h14z" fill={onDark ? "#ffffff" : "#12181c"} />
    </svg>
  );
}

export function Logo({ href = "/", onDark = true, size = 28 }: { href?: string; onDark?: boolean; size?: number }) {
  return (
    <Link href={href} className="flex shrink-0 items-center gap-2" aria-label="HändlerDeal – Startseite">
      <LogoMark size={size} onDark={onDark} />
      <span
        className={`font-display text-[21px] font-extrabold uppercase leading-none tracking-wide sm:text-2xl ${onDark ? "text-white" : "text-ink"}`}
      >
        Händler
        <span className={onDark ? "text-accent" : "ml-0.5 bg-accent px-1 text-ink"}>Deal</span>
      </span>
    </Link>
  );
}
