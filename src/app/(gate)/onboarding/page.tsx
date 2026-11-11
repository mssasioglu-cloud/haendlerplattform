import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { OnboardingForm } from "./OnboardingForm";

export const metadata = { title: "Firmendaten" };

export default async function Onboarding() {
  const s = await getSession();
  if (!s) redirect("/login");
  if (s.dealer) redirect("/status");
  return (
    <>
      <h1 className="h1">Firmendaten und Gewerbenachweis</h1>
      <p className="mt-2 text-sm text-muted">
        Schritt 2 von 2. Nach dem Absenden prüfen wir Ihre Angaben und schalten Ihren Account frei.
      </p>
      <div className="card mt-6 p-6"><OnboardingForm userId={s.userId} /></div>
    </>
  );
}
