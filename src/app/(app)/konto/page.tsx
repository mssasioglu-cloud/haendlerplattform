import Link from "next/link";
import { requireAccess } from "@/lib/auth";
import { openPortal } from "@/app/actions/billing";
import { ProfileForm } from "./ProfileForm";
import { site, priceLabel } from "@/config/site";
import { dateDe } from "@/lib/format";

export const metadata = { title: "Konto" };

export default async function Konto() {
  const s = await requireAccess();
  const d = s.dealer;
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <section className="card p-5">
        <h1 className="h1 mb-4">Firmenprofil</h1>
        <ProfileForm dealer={d} />
      </section>
      <aside className="space-y-4">
        <div className="card p-5">
          <h2 className="font-semibold">Mitgliedschaft</h2>
          {d.is_founding ? (
            <p className="mt-2 text-sm">
              <span className="badge bg-urgent-bg text-urgent">Gründerplatz Nr. {d.founding_number}</span>
              <span className="mt-2 block text-muted">Sie nutzen {site.name} dauerhaft kostenlos.</span>
            </p>
          ) : d.is_admin && !s.priv?.subscription_status ? (
            <p className="mt-2 text-sm text-muted">Administrator-Zugang ohne Abo.</p>
          ) : (
            <>
              <p className="mt-2 text-sm text-muted">
                Händler-Flatrate, {priceLabel()} pro Monat zzgl. MwSt.
                {s.priv?.current_period_end && <> Nächste Abrechnung am {dateDe(s.priv.current_period_end)}.</>}
              </p>
              <form action={openPortal} className="mt-3">
                <button className="btn btn-secondary w-full">Zahlung, Rechnungen und Kündigung</button>
              </form>
            </>
          )}
        </div>
        <div className="card p-5 text-sm">
          <h2 className="font-semibold">Zugang</h2>
          <p className="mt-2 text-muted">Angemeldet als {s.email}</p>
          <p className="mt-1 text-muted">USt-IdNr.: {s.priv?.vat_id || "nicht angegeben"}</p>
          <Link href={`/haendler/${s.userId}`} className="btn btn-secondary mt-3 w-full">Öffentliches Profil ansehen</Link>
        </div>
      </aside>
    </div>
  );
}
