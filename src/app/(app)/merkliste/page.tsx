import { requireAccess } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ListingCard } from "@/components/ListingCard";
import type { ListingCard as Card } from "@/lib/types";

export const metadata = { title: "Merkliste" };

export default async function Merkliste() {
  const s = await requireAccess();
  const supabase = await createClient();
  const { data } = await supabase.from("favorites")
    .select("created_at, listings(*, listing_images(path, position))").eq("dealer_id", s.userId).order("created_at", { ascending: false });
  type Row = Card & { listing_images: { path: string; position: number }[] };
  const rows = (data ?? []).map((f) => f.listings as unknown as Row | null).filter((l): l is Row => !!l);

  return (
    <>
      <h1 className="h1 mb-5">Merkliste</h1>
      {rows.length === 0 && <p className="card p-8 text-center text-sm text-muted">Noch keine Fahrzeuge gemerkt. Tippen Sie in der Suche auf das Herz.</p>}
      <div className="space-y-3">
        {rows.map((l) => (
          <ListingCard key={l.id} isFavorite
            l={{ ...l, cover_path: [...(l.listing_images ?? [])].sort((a, b) => a.position - b.position)[0]?.path ?? null }} />
        ))}
      </div>
    </>
  );
}
