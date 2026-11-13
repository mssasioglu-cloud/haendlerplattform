import { notFound } from "next/navigation";
import { requireAccess } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ListingCard } from "@/components/ListingCard";
import { Stars } from "@/components/Stars";
import { ReviewForm } from "./ReviewForm";
import { dateDe, whatsappLink } from "@/lib/format";
import type { Dealer, ListingCard as Card } from "@/lib/types";

export const metadata = { title: "Händlerprofil" };

export default async function Haendler({ params }: { params: Promise<{ id: string }> }) {
  const s = await requireAccess();
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("dealers").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const d = data as Dealer;
  const mine = id === s.userId;

  const [{ data: listings }, { data: reviews }, { data: contact }] = await Promise.all([
    supabase.from("listings").select("*, listing_images(path, position)").eq("dealer_id", id)
      .in("status", ["aktiv", "reserviert"]).order("created_at", { ascending: false }).limit(60),
    supabase.from("reviews").select("*").eq("dealer_id", id).order("created_at", { ascending: false }),
    supabase.from("conversations").select("id")
      .or(`and(initiator_id.eq.${s.userId},recipient_id.eq.${id}),and(initiator_id.eq.${id},recipient_id.eq.${s.userId})`).limit(1),
  ]);
  const rev = reviews ?? [];
  const rating = rev.length ? rev.reduce((a, r) => a + r.rating, 0) / rev.length : null;
  const reviewerIds = Array.from(new Set(rev.map((r) => r.reviewer_id)));
  const { data: reviewers } = reviewerIds.length
    ? await supabase.from("dealers").select("id, company_name").in("id", reviewerIds)
    : { data: [] as { id: string; company_name: string }[] };
  const rname = new Map((reviewers ?? []).map((x) => [x.id, x.company_name]));
  const myReview = rev.find((r) => r.reviewer_id === s.userId);
  type Row = Card & { listing_images: { path: string; position: number }[] };

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <aside className="space-y-4">
        <div className="card p-5">
          <h1 className="text-xl font-bold">{d.company_name}</h1>
          <p className="text-sm text-muted">{d.contact_name}</p>
          <div className="mt-2"><Stars value={rating} count={rev.length} /></div>
          <p className="mt-3 text-sm">{d.street && <>{d.street}<br /></>}{d.zip} {d.city}</p>
          <p className="mt-2 flex flex-wrap gap-1.5">
            <span className="badge bg-emerald-100 text-emerald-800">Geprüfter Händler</span>
            {d.is_founding && <span className="badge bg-urgent-bg text-urgent">Gründungsmitglied</span>}
          </p>
          <p className="mt-2 text-xs text-muted">Dabei seit {dateDe(d.approved_at ?? d.created_at)}</p>
          {!mine && (
            <div className="mt-4 grid grid-cols-2 gap-2">
              {d.phone && <a href={`tel:${d.phone.replace(/[^\d+]/g, "")}`} className="btn btn-secondary">Anrufen</a>}
              {d.whatsapp && <a href={whatsappLink(d.whatsapp, "Hallo, ich melde mich über die Händlerplattform.")} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">WhatsApp</a>}
            </div>
          )}
          {d.phone && <p className="mt-2 text-sm text-muted">Tel. {d.phone}</p>}
          {d.about && <p className="mt-3 whitespace-pre-line border-t border-line pt-3 text-sm">{d.about}</p>}
        </div>

        <div className="card p-5">
          <h2 className="h2 mb-3">Bewertungen</h2>
          {rev.length === 0 && <p className="text-sm text-muted">Noch keine Bewertungen.</p>}
          <ul className="space-y-3">
            {rev.map((r) => (
              <li key={r.id} className="border-b border-line pb-3 last:border-0 last:pb-0">
                <Stars value={r.rating} />
                {r.comment && <p className="mt-1 text-sm">{r.comment}</p>}
                <p className="mt-1 text-xs text-muted">{rname.get(r.reviewer_id) ?? "Händler"} · {dateDe(r.created_at)}</p>
              </li>
            ))}
          </ul>
          {!mine && (contact?.length ? (
            <div className="mt-4 border-t border-line pt-4">
              <ReviewForm dealerId={id} rating={myReview?.rating} comment={myReview?.comment} />
            </div>
          ) : (
            <p className="mt-4 border-t border-line pt-3 text-xs text-muted">
              Bewerten können Sie, sobald Sie mit diesem Händler über die Plattform in Kontakt standen.
            </p>
          ))}
        </div>
      </aside>
      <section>
        <h2 className="h1 mb-4">Bestand ({listings?.length ?? 0})</h2>
        {!listings?.length && <p className="card p-8 text-center text-sm text-muted">Aktuell keine Fahrzeuge im Bestand.</p>}
        <div className="space-y-3">
          {((listings ?? []) as unknown as Row[]).map((l) => (
            <ListingCard key={l.id} showFavorite={false}
              l={{ ...l, cover_path: [...(l.listing_images ?? [])].sort((a, b) => a.position - b.position)[0]?.path ?? null }} />
          ))}
        </div>
      </section>
    </div>
  );
}
