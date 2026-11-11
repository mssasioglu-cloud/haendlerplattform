import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { stripeConfigured } from "@/lib/stripe";
import { startCheckout } from "@/app/actions/billing";
import { SubmitButton } from "@/components/SubmitButton";
import { site, priceLabel } from "@/config/site";

export const metadata = { title: "Abo" };

export default async function Abo({ searchParams }: { searchParams: Promise<{ erfolg?: string; fehler?: string }> }) {
  const s = await getSession();
  if (!s) redirect("/login");
  if (!s.dealer) redirect("/onboarding");
  if (s.dealer.status !== "freigegeben") redirect("/status");
  if (s.hasAccess) redirect("/suche");
  const { erfolg, fehler } = await searchParams;

  return (
    <div className="card p-6">
      <h1 className="h1">Ihr Account ist freigeschaltet</h1>
      {erfolg ? (
        <>
          <p className="notice notice-ok mt-4">
            Zahlung erhalten. Die Bestätigung von Stripe ist unterwegs und Ihr Zugang wird in wenigen Sekunden aktiv.
          </p>
          <Link href="/suche" className="btn btn-primary mt-5">Weiter zur Plattform</Link>
        </>
      ) : (
        <>
          <p className="mt-3 text-sm text-muted">
            Die {site.foundingSlots} Gründerplätze sind bereits vergeben. Mit der Händler-Flatrate inserieren Sie
            unbegrenzt viele Fahrzeuge für {priceLabel()} pro Monat zzgl. MwSt., monatlich kündbar.
          </p>
          {(fehler === "stripe" || !stripeConfigured()) && (
            <p className="notice notice-error mt-4">
              Die Zahlungsabwicklung ist noch nicht eingerichtet. Bitte wenden Sie sich an {site.supportEmail}.
            </p>
          )}
          <form action={startCheckout} className="mt-5">
            <SubmitButton disabled={!stripeConfigured()}>Flatrate für {priceLabel()} / Monat buchen</SubmitButton>
          </form>
          <p className="mt-3 text-xs text-muted">Zahlung per Karte oder SEPA-Lastschrift über Stripe.</p>
        </>
      )}
    </div>
  );
}
