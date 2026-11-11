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
      <header className="sticky top-0 z-30 border-b border-line bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5">
          <Logo href="/suche" />
          <div className="flex items-center gap-2">
            <span className="hidden max-w-[14rem] truncate text-sm text-muted md:block">{s.dealer.company_name}</span>
            <Link href="/inserieren" className="btn btn-primary">+ Inserieren</Link>
            <form action={signOut}><button className="btn btn-secondary">Abmelden</button></form>
          </div>
        </div>
        <NavLinks unread={typeof unread === "number" ? unread : 0} isAdmin={s.dealer.is_admin} />
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
      <Footer />
    </>
  );
}
