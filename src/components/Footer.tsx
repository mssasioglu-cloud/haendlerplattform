import Link from "next/link";
import { site } from "@/config/site";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-line bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} {site.name} · Nur für Gewerbetreibende</p>
        <nav className="flex flex-wrap gap-4">
          <Link href="/preise" className="hover:text-ink">Preise</Link>
          <Link href="/agb" className="hover:text-ink">AGB</Link>
          <Link href="/datenschutz" className="hover:text-ink">Datenschutz</Link>
          <Link href="/impressum" className="hover:text-ink">Impressum</Link>
        </nav>
      </div>
    </footer>
  );
}
