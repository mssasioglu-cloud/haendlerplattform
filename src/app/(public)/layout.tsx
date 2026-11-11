import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Footer } from "@/components/Footer";
import { getSession } from "@/lib/auth";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  return (
    <>
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Logo />
          <nav className="flex items-center gap-2">
            <Link href="/preise" className="hidden px-2 text-sm font-medium text-muted hover:text-ink sm:block">Preise</Link>
            {session ? (
              <Link href="/suche" className="btn btn-primary">Zum Händlerbereich</Link>
            ) : (
              <>
                <Link href="/login" className="btn btn-secondary">Anmelden</Link>
                <Link href="/registrieren" className="btn btn-primary">Registrieren</Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
