import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Footer } from "@/components/Footer";
import { NavLinks } from "@/components/NavLinks";
import { requireAccess } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/actions/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const s = await requireAccess();
  const supabase = await createClient();
  const { data: unread } = await supabase.rpc("unread_conversations");

  return (
    <>
      <header className="sticky top-0 z-30 bg-brand-800">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2.5">
          <Logo href="/suche" />
          <div className="flex items-center gap-2">
            <span className="hidden max-w-[14rem] truncate text-sm text-brand-200 md:block">{s.dealer.company_name}</span>
            <Link href="/inserieren" className="btn btn-primary max-sm:px-3">+ Inserieren</Link>
            <form action={signOut}>
              <button className="btn btn-ghost max-sm:px-2.5" aria-label="Abmelden">
                <span className="hidden sm:inline">Abmelden</span>
                <svg className="sm:hidden" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" />
                </svg>
              </button>
            </form>
          </div>
        </div>
        <NavLinks unread={typeof unread === "number" ? unread : 0} isAdmin={s.dealer.is_admin} />
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">{children}</main>
      <Footer />
    </>
  );
}
