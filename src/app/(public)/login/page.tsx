import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Anmelden" };

export default async function Login({ searchParams }: { searchParams: Promise<{ fehler?: string }> }) {
  if (await getSession()) redirect("/suche");
  const { fehler } = await searchParams;
  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="h1">Anmelden</h1>
      {fehler === "link" && <p className="notice notice-error mt-4">Der Bestätigungslink ist ungültig oder abgelaufen.</p>}
      <div className="card mt-6 p-6"><LoginForm /></div>
      <p className="mt-4 text-sm text-muted">
        Noch kein Account? <Link href="/registrieren" className="font-semibold text-brand-600">Jetzt registrieren</Link>
      </p>
    </div>
  );
}
