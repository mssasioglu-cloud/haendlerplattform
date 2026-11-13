import Link from "next/link";
import { requireAccess } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { offerAction } from "@/app/actions/contact";
import { eur, dateTimeDe } from "@/lib/format";

export const metadata = { title: "Gebote" };

const STATUS: Record<string, [string, string]> = {
  offen: ["Offen", "bg-amber-100 text-amber-900"],
  gegenangebot: ["Gegenangebot", "bg-brand-100 text-brand-900"],
  angenommen: ["Angenommen", "bg-emerald-100 text-emerald-800"],
  abgelehnt: ["Abgelehnt", "bg-red-100 text-red-800"],
  zurueckgezogen: ["Zurückgezogen", "bg-line text-ink"],
};

type Row = {
  id: string; listing_id: string; buyer_id: string; seller_id: string; amount: number; counter_amount: number | null;
  note: string; status: string; created_at: string;
  listings: { make: string; model: string; price_gross: number } | null;
};

function Act({ id, action, label, cls = "btn-secondary" }: { id: string; action: string; label: string; cls?: string }) {
  return (
    <form action={offerAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="action" value={action} />
      <button className={`btn btn-sm ${cls}`}>{label}</button>
    </form>
  );
}

export default async function Gebote() {
  const s = await requireAccess();
  const supabase = await createClient();
  const { data } = await supabase.from("offers")
    .select("*, listings(make, model, price_gross)").order("created_at", { ascending: false }).limit(200);
  const rows = (data ?? []) as unknown as Row[];
  const ids = Array.from(new Set(rows.flatMap((r) => [r.buyer_id, r.seller_id])));
  const { data: dealers } = ids.length
    ? await supabase.from("dealers").select("id, company_name, phone").in("id", ids)
    : { data: [] as { id: string; company_name: string; phone: string }[] };
  const dealer = new Map((dealers ?? []).map((d) => [d.id, d]));
  const received = rows.filter((r) => r.seller_id === s.userId);
  const sent = rows.filter((r) => r.buyer_id === s.userId);

  const list = (items: Row[], incoming: boolean) => (
    <div className="space-y-3">
      {items.length === 0 && <p className="card p-5 text-sm text-muted">{incoming ? "Noch keine Gebote auf Ihre Fahrzeuge." : "Sie haben noch keine Gebote abgegeben."}</p>}
      {items.map((o) => {
        const other = dealer.get(incoming ? o.buyer_id : o.seller_id);
        const [label, cls] = STATUS[o.status] ?? [o.status, "bg-line"];
        return (
          <div key={o.id} className="card p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <Link href={`/inserat/${o.listing_id}`} className="font-semibold hover:underline">
                  {o.listings ? `${o.listings.make} ${o.listings.model}` : "Inserat"}
                </Link>
                <p className="text-sm text-muted">
                  {incoming ? "von" : "an"}{" "}
                  <Link href={`/haendler/${incoming ? o.buyer_id : o.seller_id}`} className="link">{other?.company_name ?? "Händler"}</Link>
                  {" · "}{dateTimeDe(o.created_at)}
                  {o.listings && ` · Inseratspreis ${eur(o.listings.price_gross)}`}
                </p>
              </div>
              <span className={`badge ${cls}`}>{label}</span>
            </div>
            <p className="price mt-2 text-3xl">
              {eur(o.amount)}
              {o.counter_amount != null && <span className="ml-2 text-base font-semibold text-brand-700">→ Gegenangebot {eur(o.counter_amount)}</span>}
            </p>
            {o.note && <p className="mt-1 text-sm text-muted">„{o.note}“</p>}
            {o.status === "angenommen" && (
              <p className="notice notice-ok mt-3">
                Preiseinigung erzielt. Bitte stimmen Sie Übergabe und Kaufvertrag direkt miteinander ab
                {other?.phone ? ` (Tel. ${other.phone})` : ""}.
              </p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {incoming && o.status === "offen" && (
                <>
                  <Act id={o.id} action="annehmen" label="Annehmen" cls="btn-primary" />
                  <Act id={o.id} action="ablehnen" label="Ablehnen" cls="btn-danger" />
                  <form action={offerAction} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={o.id} />
                    <input type="hidden" name="action" value="gegenangebot" />
                    <label htmlFor={`c-${o.id}`} className="sr-only">Gegenangebot in Euro</label>
                    <input id={`c-${o.id}`} name="amount" inputMode="numeric" required placeholder="Gegenangebot €" className="input w-36 py-1.5" />
                    <button className="btn btn-secondary btn-sm">Kontern</button>
                  </form>
                </>
              )}
              {!incoming && o.status === "gegenangebot" && (
                <>
                  <Act id={o.id} action="annehmen" label={`Gegenangebot ${eur(o.counter_amount)} annehmen`} cls="btn-primary" />
                  <Act id={o.id} action="ablehnen" label="Ablehnen" cls="btn-danger" />
                </>
              )}
              {!incoming && ["offen", "gegenangebot"].includes(o.status) && <Act id={o.id} action="zurueckziehen" label="Zurückziehen" />}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <>
      <h1 className="h1 mb-5">Gebote</h1>
      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="h2 mb-3">Erhalten ({received.length})</h2>
          {list(received, true)}
        </section>
        <section>
          <h2 className="h2 mb-3">Abgegeben ({sent.length})</h2>
          {list(sent, false)}
        </section>
      </div>
    </>
  );
}
