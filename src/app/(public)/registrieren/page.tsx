import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { site } from "@/config/site";
import { RegisterForm } from "./RegisterForm";

export const metadata = { title: "Registrieren" };

export default async function Registrieren() {
  if (await getSession()) redirect("/onboarding");
  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="h1">Händler-Account anlegen</h1>
      <p className="mt-2 text-sm text-muted">
        Schritt 1 von 2: Zugangsdaten. Danach tragen Sie Ihre Firmendaten ein und laden den Gewerbenachweis hoch.
        Die ersten {site.foundingSlots} Händler sind dauerhaft kostenlos dabei.
      </p>
      <div className="card mt-6 p-6"><RegisterForm /></div>
      <p className="mt-4 text-sm text-muted">
        Schon registriert? <Link href="/login" className="link">Anmelden</Link>
      </p>
    </div>
  );
}
