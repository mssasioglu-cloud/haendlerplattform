import { Logo } from "@/components/Logo";
import { Footer } from "@/components/Footer";
import { signOut } from "@/app/actions/auth";

export default function GateLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Logo />
          <form action={signOut}><button className="btn btn-secondary">Abmelden</button></form>
        </div>
      </header>
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">{children}</main>
      <Footer />
    </>
  );
}
