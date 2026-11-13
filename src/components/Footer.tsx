import Link from "next/link";
import { site } from "@/config/site";
import { LogoMark } from "@/components/Logo";

export function Footer() {
  return (
    <footer className="mt-auto bg-brand-800 text-brand-200">
      <div className="hatch h-1.5" aria-hidden />
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 text-xs sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2">
          <LogoMark size={18} />
          © {new Date().getFullYear()} {site.name} · Nur für Gewerbetreibende
        </p>
        <nav className="flex flex-wrap gap-4">
          <Link href="/preise" className="hover:text-white">Preise</Link>
          <Link href="/agb" className="hover:text-white">AGB</Link>
          <Link href="/datenschutz" className="hover:text-white">Datenschutz</Link>
          <Link href="/impressum" className="hover:text-white">Impressum</Link>
        </nav>
      </div>
    </footer>
  );
}
